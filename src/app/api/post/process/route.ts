import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptCredentials } from '@/lib/crypto'

// ─── Twitter ────────────────────────────────────────────────────────────────

async function uploadMediaToTwitter(
  accessToken: string,
  supabase: any,
  storagePath: string,
): Promise<string | null> {
  const { data: fileData, error: downloadError } = await supabase.storage
    .from('media')
    .download(storagePath)

  if (downloadError || !fileData) {
    console.error('[post-process] Failed to download media:', storagePath, downloadError?.message)
    return null
  }

  const formData = new FormData()
  formData.append('media', fileData, storagePath.split('/').pop() ?? 'file')
  formData.append('media_category', 'tweet_image')

  const response = await fetch('https://api.x.com/2/media/upload', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${accessToken}` },
    body: formData,
  })

  if (!response.ok) {
    const errorBody = await response.text()
    console.error('[post-process] Twitter media upload failed:', response.status, errorBody)
    return null
  }

  const data = await response.json()
  const mediaId = data.data?.id ?? data.media_id_string
  console.log('[post-process] Twitter media uploaded:', mediaId)
  return mediaId
}

async function postToTwitter(
  accessToken: string,
  caption: string | null,
  mediaIds: string[],
  supabase: any,
): Promise<{ success: boolean; postUrl?: string; error?: string; expired?: boolean }> {
  // Upload media
  const twitterMediaIds: string[] = []
  if (mediaIds.length > 0) {
    const { data: mediaItems } = await supabase
      .from('content_library')
      .select('id, storage_path, mime_type')
      .in('id', mediaIds)

    for (const item of mediaItems ?? []) {
      const id = await uploadMediaToTwitter(accessToken, supabase, item.storage_path)
      if (id) twitterMediaIds.push(id)
    }
  }

  // Build tweet
  const payload: any = {}
  if (caption) payload.text = caption
  if (twitterMediaIds.length > 0) payload.media = { media_ids: twitterMediaIds }

  const response = await fetch('https://api.x.com/2/tweets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (response.status === 201) {
    const data = await response.json()
    const tweetId = data.data?.id
    return { success: true, postUrl: tweetId ? `https://x.com/i/status/${tweetId}` : undefined }
  }

  const errorBody = await response.text()
  return {
    success: false,
    error: `Twitter API ${response.status} — ${errorBody.slice(0, 200)}`,
    expired: response.status === 401,
  }
}

// ─── Instagram ──────────────────────────────────────────────────────────────

async function getPublicMediaUrl(supabase: any, storagePath: string): Promise<string | null> {
  const { data: signed } = await supabase.storage
    .from('media')
    .createSignedUrl(storagePath, 3600) // 1 hour
  return signed?.signedUrl ?? null
}

async function createInstagramMediaContainer(
  igUserId: string,
  accessToken: string,
  imageUrl: string,
  caption?: string,
  isCarouselItem?: boolean,
): Promise<string | null> {
  const params = new URLSearchParams({
    image_url: imageUrl,
    access_token: accessToken,
  })
  if (caption && !isCarouselItem) params.set('caption', caption)
  if (isCarouselItem) params.set('is_carousel_item', 'true')

  const res = await fetch(`https://graph.instagram.com/v22.0/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[post-process] IG media container failed:', res.status, err)
    return null
  }

  const data = await res.json()
  return data.id ?? null
}

async function createInstagramVideoContainer(
  igUserId: string,
  accessToken: string,
  videoUrl: string,
  caption?: string,
  isCarouselItem?: boolean,
): Promise<string | null> {
  const params = new URLSearchParams({
    video_url: videoUrl,
    media_type: 'REELS',
    access_token: accessToken,
  })
  if (caption && !isCarouselItem) params.set('caption', caption)
  if (isCarouselItem) params.set('is_carousel_item', 'true')

  const res = await fetch(`https://graph.instagram.com/v22.0/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[post-process] IG video container failed:', res.status, err)
    return null
  }

  const data = await res.json()
  return data.id ?? null
}

async function createInstagramCarouselContainer(
  igUserId: string,
  accessToken: string,
  childrenIds: string[],
  caption: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    media_type: 'CAROUSEL',
    caption: caption,
    access_token: accessToken,
  })
  // children must be comma-separated
  params.set('children', childrenIds.join(','))

  const res = await fetch(`https://graph.instagram.com/v22.0/${igUserId}/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[post-process] IG carousel container failed:', res.status, err)
    return null
  }

  const data = await res.json()
  return data.id ?? null
}

async function publishInstagramMedia(
  igUserId: string,
  accessToken: string,
  creationId: string,
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  const params = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  })

  const res = await fetch(`https://graph.instagram.com/v22.0/${igUserId}/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  })

  if (!res.ok) {
    const err = await res.text()
    console.error('[post-process] IG publish failed:', res.status, err)
    return { success: false, error: `IG publish ${res.status} — ${err.slice(0, 200)}` }
  }

  const data = await res.json()
  return { success: true, mediaId: data.id }
}

async function waitForInstagramContainer(
  containerId: string,
  accessToken: string,
  maxWait: number = 30000,
): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < maxWait) {
    const res = await fetch(
      `https://graph.instagram.com/v22.0/${containerId}?fields=status_code&access_token=${accessToken}`
    )
    if (res.ok) {
      const data = await res.json()
      if (data.status_code === 'FINISHED') return true
      if (data.status_code === 'ERROR') return false
    }
    await new Promise((r) => setTimeout(r, 2000))
  }
  return false
}

async function postToInstagram(
  accessToken: string,
  igUserId: string,
  caption: string | null,
  mediaIds: string[],
  supabase: any,
): Promise<{ success: boolean; postUrl?: string; error?: string; expired?: boolean }> {
  // Get media items from content_library
  const { data: mediaItems } = mediaIds.length > 0
    ? await supabase
        .from('content_library')
        .select('id, storage_path, file_type, mime_type')
        .in('id', mediaIds)
    : { data: [] }

  const items = mediaItems ?? []

  // No media — Instagram requires media for posts
  if (items.length === 0) {
    return { success: false, error: 'Instagram posts require at least one image or video' }
  }

  // Single image
  if (items.length === 1 && items[0].file_type === 'photo') {
    const url = await getPublicMediaUrl(supabase, items[0].storage_path)
    if (!url) return { success: false, error: 'Failed to get signed URL for media' }

    const containerId = await createInstagramMediaContainer(igUserId, accessToken, url, caption ?? '')
    if (!containerId) return { success: false, error: 'Failed to create IG media container' }

    const result = await publishInstagramMedia(igUserId, accessToken, containerId)
    if (result.success) {
      return { success: true, postUrl: `https://www.instagram.com/p/${result.mediaId}/` }
    }
    return { success: false, error: result.error }
  }

  // Single video
  if (items.length === 1 && items[0].file_type === 'video') {
    const url = await getPublicMediaUrl(supabase, items[0].storage_path)
    if (!url) return { success: false, error: 'Failed to get signed URL for video' }

    const containerId = await createInstagramVideoContainer(igUserId, accessToken, url, caption ?? '')
    if (!containerId) return { success: false, error: 'Failed to create IG video container' }

    // Wait for video processing
    const ready = await waitForInstagramContainer(containerId, accessToken)
    if (!ready) return { success: false, error: 'IG video processing timed out or failed' }

    const result = await publishInstagramMedia(igUserId, accessToken, containerId)
    if (result.success) {
      return { success: true, postUrl: `https://www.instagram.com/p/${result.mediaId}/` }
    }
    return { success: false, error: result.error }
  }

  // Carousel (2+ items)
  const childrenIds: string[] = []
  for (const item of items) {
    const url = await getPublicMediaUrl(supabase, item.storage_path)
    if (!url) continue

    let containerId: string | null = null
    if (item.file_type === 'video') {
      containerId = await createInstagramVideoContainer(igUserId, accessToken, url, undefined, true)
      if (containerId) {
        const ready = await waitForInstagramContainer(containerId, accessToken)
        if (!ready) { console.error('[post-process] IG carousel video processing failed'); continue }
      }
    } else {
      containerId = await createInstagramMediaContainer(igUserId, accessToken, url, undefined, true)
    }

    if (containerId) childrenIds.push(containerId)
  }

  if (childrenIds.length < 2) {
    return { success: false, error: `Only ${childrenIds.length} carousel items created, need at least 2` }
  }

  const carouselId = await createInstagramCarouselContainer(igUserId, accessToken, childrenIds, caption ?? '')
  if (!carouselId) return { success: false, error: 'Failed to create IG carousel container' }

  const result = await publishInstagramMedia(igUserId, accessToken, carouselId)
  if (result.success) {
    return { success: true, postUrl: `https://www.instagram.com/p/${result.mediaId}/` }
  }
  return { success: false, error: result.error }
}

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
        result = await postToTwitter(accessToken, post.caption, mediaIds, supabase)
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
