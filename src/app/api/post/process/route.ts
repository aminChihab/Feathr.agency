import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/crypto'
import { postTweet } from '@/lib/twitter'
import { postToInstagram } from '@/lib/instagram'

// ─── Main handler ───────────────────────────────────────────────────────────

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[post-process] Starting for user:', user.id)

  const now = new Date().toISOString()
  const { data: duePosts } = await supabase
    .from('content_calendar')
    .select('id, caption, media_ids, scheduled_at, platform_account_id, platform_accounts(credentials_encrypted, status, metadata, platforms(slug))')
    .eq('profile_id', user.id)
    .eq('status', 'approved')
    .lte('scheduled_at', now)

  console.log('[post-process] Found', (duePosts ?? []).length, 'due post(s)')

  if (!duePosts || duePosts.length === 0) {
    return NextResponse.json({ posted: 0, failed: 0, message: 'No posts due' })
  }

  let posted = 0
  let failed = 0
  const errors: string[] = []

  for (const post of duePosts) {
    const account = (post as any).platform_accounts
    const platformSlug = account?.platforms?.slug

    if (!post.caption && (!post.media_ids || (post.media_ids as string[]).length === 0)) {
      await supabase.from('content_calendar').update({ status: 'failed' }).eq('id', post.id)
      errors.push(`Post ${post.id}: no caption or media`)
      failed++
      continue
    }

    const creds = decryptCredentials(account?.credentials_encrypted ?? '{}')
    const accessToken = creds.access_token
    const mediaIds = (post.media_ids as string[]) ?? []

    if (!accessToken) {
      errors.push(`Post ${post.id}: no access token`)
      continue
    }

    let result: { success: boolean; postUrl?: string; error?: string; expired?: boolean }

    try {
      if (platformSlug === 'twitter' || platformSlug === 'x') {
        console.log('[post-process] Posting to Twitter:', post.id)
        result = await postTweet(accessToken, post.caption, mediaIds, supabase)
      } else if (platformSlug === 'instagram') {
        console.log('[post-process] Posting to Instagram:', post.id)
        const igUserId = (account?.metadata as any)?.instagram_user_id ?? creds.instagram_user_id
        if (!igUserId) {
          result = { success: false, error: 'No Instagram user ID found' }
        } else {
          result = await postToInstagram(accessToken, igUserId, post.caption, mediaIds, supabase)
        }
      } else {
        console.log('[post-process] Skipping unsupported platform:', platformSlug)
        continue
      }
    } catch (error) {
      result = { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }

    if (result.success) {
      console.log('[post-process] Posted:', platformSlug, result.postUrl)
      await supabase.from('content_calendar').update({
        status: 'posted',
        post_url: result.postUrl ?? null,
        posted_at: new Date().toISOString(),
      }).eq('id', post.id)

      await supabase.from('posts').insert({
        profile_id: user.id,
        calendar_item_id: post.id,
        platform_account_id: post.platform_account_id,
        post_url: result.postUrl ?? null,
      })

      posted++
    } else {
      console.error('[post-process] Failed:', platformSlug, result.error)

      if (result.expired) {
        await supabase.from('platform_accounts').update({ status: 'expired' }).eq('id', post.platform_account_id)
      }

      await supabase.from('content_calendar').update({ status: 'failed' }).eq('id', post.id)
      errors.push(`Post ${post.id}: ${result.error}`)
      failed++
    }
  }

  const resultSummary = { posted, failed, errors: errors.length > 0 ? errors : undefined }
  console.log('[post-process] Done:', JSON.stringify(resultSummary))
  return NextResponse.json(resultSummary)
}
