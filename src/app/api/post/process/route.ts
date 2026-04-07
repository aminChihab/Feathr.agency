// src/app/api/post/process/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('[post-process] Starting for user:', user.id)

  // Get all approved posts that are due
  const now = new Date().toISOString()
  const { data: duePosts } = await supabase
    .from('content_calendar')
    .select('id, caption, scheduled_at, platform_account_id, platform_accounts(credentials_encrypted, status, platforms(slug))')
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

    if (platformSlug !== 'twitter') {
      console.log('[post-process] Skipping non-Twitter platform:', platformSlug)
      continue
    }

    const creds = JSON.parse(account?.credentials_encrypted ?? '{}')
    const accessToken = creds.access_token

    if (!accessToken) {
      console.log('[post-process] No access token for post:', post.id)
      errors.push(`Post ${post.id}: no access token`)
      continue
    }

    if (!post.caption) {
      console.log('[post-process] No caption for post:', post.id)
      await supabase.from('content_calendar').update({ status: 'failed' }).eq('id', post.id)
      errors.push(`Post ${post.id}: no caption`)
      failed++
      continue
    }

    console.log('[post-process] Posting tweet for post:', post.id)

    try {
      const response = await fetch('https://api.x.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text: post.caption }),
      })

      console.log('[post-process] Twitter API response:', response.status)

      if (response.status === 201) {
        const data = await response.json()
        const tweetId = data.data?.id
        const postUrl = tweetId ? `https://x.com/i/status/${tweetId}` : null

        console.log('[post-process] Tweet posted:', tweetId)

        await supabase.from('content_calendar').update({
          status: 'posted',
          post_url: postUrl,
          posted_at: new Date().toISOString(),
        }).eq('id', post.id)

        await supabase.from('posts').insert({
          profile_id: user.id,
          calendar_item_id: post.id,
          platform_account_id: post.platform_account_id,
          post_url: postUrl,
        })

        posted++
      } else {
        const errorBody = await response.text()
        console.error('[post-process] Tweet failed:', errorBody)

        if (response.status === 401) {
          await supabase.from('platform_accounts').update({ status: 'expired' }).eq('id', post.platform_account_id)
          errors.push(`Post ${post.id}: token expired`)
        } else {
          errors.push(`Post ${post.id}: Twitter API ${response.status} — ${errorBody.slice(0, 200)}`)
        }

        await supabase.from('content_calendar').update({ status: 'failed' }).eq('id', post.id)
        failed++
      }
    } catch (error) {
      console.error('[post-process] Error:', error)
      await supabase.from('content_calendar').update({ status: 'failed' }).eq('id', post.id)
      errors.push(`Post ${post.id}: ${error instanceof Error ? error.message : 'Unknown error'}`)
      failed++
    }
  }

  const result = { posted, failed, errors: errors.length > 0 ? errors : undefined }
  console.log('[post-process] Done:', JSON.stringify(result))
  return NextResponse.json(result)
}
