import type { SupabaseClient } from '@supabase/supabase-js'

export const INSTAGRAM_API_VERSION = 'v25.0'

export async function getSignedMediaUrl(
  supabase: SupabaseClient,
  storagePath: string,
  expiresIn = 3600,
): Promise<string | null> {
  const { data } = await supabase.storage
    .from('media')
    .createSignedUrl(storagePath, expiresIn)
  return data?.signedUrl ?? null
}

export async function createImageContainer(
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

  const res = await fetch(
    `https://graph.instagram.com/${INSTAGRAM_API_VERSION}/${igUserId}/media`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() },
  )

  if (!res.ok) {
    console.error('[instagram] Image container failed:', res.status, await res.text())
    return null
  }
  return (await res.json()).id ?? null
}

export async function createVideoContainer(
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

  const res = await fetch(
    `https://graph.instagram.com/${INSTAGRAM_API_VERSION}/${igUserId}/media`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() },
  )

  if (!res.ok) {
    console.error('[instagram] Video container failed:', res.status, await res.text())
    return null
  }
  return (await res.json()).id ?? null
}

export async function createCarouselContainer(
  igUserId: string,
  accessToken: string,
  childrenIds: string[],
  caption: string,
): Promise<string | null> {
  const params = new URLSearchParams({
    media_type: 'CAROUSEL',
    caption,
    access_token: accessToken,
    children: childrenIds.join(','),
  })

  const res = await fetch(
    `https://graph.instagram.com/${INSTAGRAM_API_VERSION}/${igUserId}/media`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() },
  )

  if (!res.ok) {
    console.error('[instagram] Carousel container failed:', res.status, await res.text())
    return null
  }
  return (await res.json()).id ?? null
}

export async function publishMedia(
  igUserId: string,
  accessToken: string,
  creationId: string,
): Promise<{ success: boolean; mediaId?: string; error?: string }> {
  const params = new URLSearchParams({
    creation_id: creationId,
    access_token: accessToken,
  })

  const res = await fetch(
    `https://graph.instagram.com/${INSTAGRAM_API_VERSION}/${igUserId}/media_publish`,
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: params.toString() },
  )

  if (!res.ok) {
    const err = await res.text()
    console.error('[instagram] Publish failed:', res.status, err)
    return { success: false, error: `Publish ${res.status} — ${err.slice(0, 200)}` }
  }
  return { success: true, mediaId: (await res.json()).id }
}

const CONTAINER_POLL_INTERVAL_MS = 2000
const DEFAULT_MAX_WAIT_MS = 30000

export async function waitForContainer(
  containerId: string,
  accessToken: string,
  maxWaitMs = DEFAULT_MAX_WAIT_MS,
): Promise<boolean> {
  const start = Date.now()
  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(
      `https://graph.instagram.com/${INSTAGRAM_API_VERSION}/${containerId}?fields=status_code&access_token=${accessToken}`,
    )
    if (res.ok) {
      const data = await res.json()
      if (data.status_code === 'FINISHED') return true
      if (data.status_code === 'ERROR') return false
    }
    await new Promise((r) => setTimeout(r, CONTAINER_POLL_INTERVAL_MS))
  }
  return false
}

export type PostResult = { success: boolean; postUrl?: string; error?: string; expired?: boolean }

export async function postToInstagram(
  accessToken: string,
  igUserId: string,
  caption: string | null,
  mediaIds: string[],
  supabase: SupabaseClient,
): Promise<PostResult> {
  const { data: mediaItems } = mediaIds.length > 0
    ? await supabase.from('content_library').select('id, storage_path, file_type, mime_type').in('id', mediaIds)
    : { data: [] }

  const items = mediaItems ?? []
  if (items.length === 0) {
    return { success: false, error: 'Instagram posts require at least one image or video' }
  }

  // Single image
  if (items.length === 1 && items[0].file_type === 'photo') {
    return publishSingleImage(igUserId, accessToken, caption, items[0].storage_path, supabase)
  }

  // Single video
  if (items.length === 1 && items[0].file_type === 'video') {
    return publishSingleVideo(igUserId, accessToken, caption, items[0].storage_path, supabase)
  }

  // Carousel (2+ items)
  return publishCarousel(igUserId, accessToken, caption, items, supabase)
}

async function publishSingleImage(
  igUserId: string, accessToken: string, caption: string | null,
  storagePath: string, supabase: SupabaseClient,
): Promise<PostResult> {
  const url = await getSignedMediaUrl(supabase, storagePath)
  if (!url) return { success: false, error: 'Failed to get signed URL for media' }

  const containerId = await createImageContainer(igUserId, accessToken, url, caption ?? '')
  if (!containerId) return { success: false, error: 'Failed to create media container' }

  if (!await waitForContainer(containerId, accessToken)) {
    return { success: false, error: 'Image processing timed out or failed' }
  }

  const result = await publishMedia(igUserId, accessToken, containerId)
  return result.success
    ? { success: true, postUrl: `https://www.instagram.com/p/${result.mediaId}/` }
    : { success: false, error: result.error }
}

async function publishSingleVideo(
  igUserId: string, accessToken: string, caption: string | null,
  storagePath: string, supabase: SupabaseClient,
): Promise<PostResult> {
  const url = await getSignedMediaUrl(supabase, storagePath)
  if (!url) return { success: false, error: 'Failed to get signed URL for video' }

  const containerId = await createVideoContainer(igUserId, accessToken, url, caption ?? '')
  if (!containerId) return { success: false, error: 'Failed to create video container' }

  if (!await waitForContainer(containerId, accessToken)) {
    return { success: false, error: 'Video processing timed out or failed' }
  }

  const result = await publishMedia(igUserId, accessToken, containerId)
  return result.success
    ? { success: true, postUrl: `https://www.instagram.com/p/${result.mediaId}/` }
    : { success: false, error: result.error }
}

async function publishCarousel(
  igUserId: string, accessToken: string, caption: string | null,
  items: { id: string; storage_path: string; file_type: string }[], supabase: SupabaseClient,
): Promise<PostResult> {
  const childrenIds: string[] = []

  for (const item of items) {
    const url = await getSignedMediaUrl(supabase, item.storage_path)
    if (!url) continue

    const createContainer = item.file_type === 'video' ? createVideoContainer : createImageContainer
    const containerId = await createContainer(igUserId, accessToken, url, undefined, true)

    if (containerId && await waitForContainer(containerId, accessToken)) {
      childrenIds.push(containerId)
    }
  }

  if (childrenIds.length < 2) {
    return { success: false, error: `Only ${childrenIds.length} carousel items created, need at least 2` }
  }

  const carouselId = await createCarouselContainer(igUserId, accessToken, childrenIds, caption ?? '')
  if (!carouselId) return { success: false, error: 'Failed to create carousel container' }

  const result = await publishMedia(igUserId, accessToken, carouselId)
  return result.success
    ? { success: true, postUrl: `https://www.instagram.com/p/${result.mediaId}/` }
    : { success: false, error: result.error }
}
