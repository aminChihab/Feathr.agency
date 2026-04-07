import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function uploadMediaToTwitter(
  accessToken: string,
  supabase: any,
  storagePath: string,
  mimeType: string
): Promise<string | null> {
  // Download file from Supabase Storage
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('media')
    .download(storagePath)

  if (downloadError || !fileData) {
    console.error('[post-process] Failed to download media:', storagePath, downloadError?.message)
    return null
  }

  // Upload to Twitter
  const formData = new FormData()
  formData.append('media', fileData, storagePath.split('/').pop() ?? 'file')
  formData.append('media_category', 'tweet_image')

  const response = await fetch('https://api.x.com/2/media/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('[post-process] Twitter media upload failed:', response.status, errorBody)
    return null
  }

  const data = await response.json()
  const mediaId = data.data?.id ?? data.media_id_string
  console.log('[post-process] Media uploaded:', mediaId)
  return mediaId
}

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
    .select('id, caption, media_ids, scheduled_at, platform_account_id, platform_accounts(credentials_encrypted, status, platforms(slug))')
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

    if (!post.caption && (!post.media_ids || (post.media_ids as string[]).length === 0)) {
      console.log('[post-process] No caption or media for post:', post.id)
      await supabase.from('content_calendar').update({ status: 'failed' }).eq('id', post.id)
      errors.push(`Post ${post.id}: no caption or media`)
      failed++
      continue
    }

    console.log('[post-process] Posting tweet for post:', post.id)

    try {
      // Upload media if present
      const mediaIds = (post.media_ids as string[]) ?? []
      const twitterMediaIds: string[] = []

      if (mediaIds.length > 0) {
        console.log('[post-process] Uploading', mediaIds.length, 'media file(s)')

        // Get media info from content_library
        const { data: mediaItems } = await supabase
          .from('content_library')
          .select('id, storage_path, mime_type')
          .in('id', mediaIds)

        for (const item of mediaItems ?? []) {
          const twitterMediaId = await uploadMediaToTwitter(
            accessToken,
            supabase,
            item.storage_path,
            item.mime_type
          )
          if (twitterMediaId) {
            twitterMediaIds.push(twitterMediaId)
          }
        }

        console.log('[post-process] Uploaded', twitterMediaIds.length, 'of', mediaIds.length, 'media')
      }

      // Build tweet payload
      const tweetPayload: any = {}
      if (post.caption) tweetPayload.text = post.caption
      if (twitterMediaIds.length > 0) {
        tweetPayload.media = { media_ids: twitterMediaIds }
      }

      const response = await fetch('https://api.x.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tweetPayload),
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
