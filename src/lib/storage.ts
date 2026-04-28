import type { SupabaseClient } from '@supabase/supabase-js'

const THUMBNAIL_EXPIRY_SECONDS = 86400 // 24 hours
const FULL_RES_EXPIRY_SECONDS = 3600   // 1 hour

export interface SignedMediaItem {
  id: string
  fileName: string
  fileType: string
  storagePath: string
  thumbnailPath: string | null
  thumbnailUrl: string | null
  tags: string[] | null
  metadata: Record<string, unknown> | null
  source: string | null
  createdAt: string
}

/**
 * Signs thumbnail URLs for a batch of media items in a single API call.
 * Only signs the thumbnail (or storage_path as fallback) — not full resolution.
 */
export async function signThumbnailUrls(
  supabase: SupabaseClient,
  items: Array<{
    id: string
    file_name: string
    file_type: string
    storage_path: string
    thumbnail_path: string | null
    tags: string[] | null
    metadata: unknown
    source: string | null
    created_at: string
  }>,
): Promise<SignedMediaItem[]> {
  if (items.length === 0) return []

  const paths = items.map((item) => item.thumbnail_path ?? item.storage_path)

  const { data: signedUrls } = await supabase.storage
    .from('media')
    .createSignedUrls(paths, THUMBNAIL_EXPIRY_SECONDS)

  return items.map((item, i) => ({
    id: item.id,
    fileName: item.file_name,
    fileType: item.file_type,
    storagePath: item.storage_path,
    thumbnailPath: item.thumbnail_path,
    thumbnailUrl: signedUrls?.[i]?.signedUrl ?? null,
    tags: item.tags,
    metadata: item.metadata as Record<string, unknown> | null,
    source: item.source,
    createdAt: item.created_at,
  }))
}

/**
 * Signs a single full-resolution URL for on-demand preview.
 */
export async function signFullResUrl(
  supabase: SupabaseClient,
  storagePath: string,
): Promise<string | null> {
  const { data } = await supabase.storage
    .from('media')
    .createSignedUrl(storagePath, FULL_RES_EXPIRY_SECONDS)
  return data?.signedUrl ?? null
}
