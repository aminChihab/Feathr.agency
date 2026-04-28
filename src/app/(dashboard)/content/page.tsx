// src/app/(dashboard)/content/page.tsx
import { createClient } from '@/lib/supabase/server'
import { signThumbnailUrls } from '@/lib/storage'
import { applyCursorPagination, PAGE_SIZES } from '@/lib/pagination'
import { ContentClient } from './content-client'
import type { PostWithPlatform } from '@/lib/calendar'

export default async function ContentPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const initialPosts = await fetchInitialPosts(supabase, user.id)
  const { items, nextCursor } = applyCursorPagination(initialPosts, PAGE_SIZES.posts)

  const { count: totalPostCount } = await supabase
    .from('content_calendar')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)

  const initialMediaThumbs = await fetchMediaThumbs(supabase, items)

  const { data: profile } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', user.id)
    .single()

  return (
    <ContentClient
      userId={user.id}
      initialPosts={items}
      initialCursor={nextCursor}
      totalPostCount={totalPostCount ?? 0}
      creditBalance={(profile as any)?.credit_balance ?? null}
      initialMediaThumbs={initialMediaThumbs}
    />
  )
}

async function fetchInitialPosts(supabase: Awaited<ReturnType<typeof createClient>>, profileId: string): Promise<PostWithPlatform[]> {
  const { data: rows } = await supabase
    .from('content_calendar')
    .select('*, platform_accounts(platforms(name, color))')
    .eq('profile_id', profileId)
    .order('scheduled_at', { ascending: false })
    .limit(PAGE_SIZES.posts + 1)

  return (rows ?? []).map((item: any) => ({
    ...item,
    platform_name: item.platform_accounts?.platforms?.name ?? 'Unknown',
    platform_color: item.platform_accounts?.platforms?.color ?? '#666',
  }))
}

async function fetchMediaThumbs(
  supabase: Awaited<ReturnType<typeof createClient>>,
  posts: PostWithPlatform[],
): Promise<Record<string, { id: string; url: string; fileType: string }>> {
  const allMediaIds = collectMediaIds(posts)
  if (allMediaIds.length === 0) return {}

  const { data: mediaItems } = await supabase
    .from('content_library')
    .select('id, file_type, storage_path, thumbnail_path')
    .in('id', allMediaIds)

  if (!mediaItems) return {}

  const signed = await signThumbnailUrls(
    supabase,
    mediaItems.map((m) => ({ ...m, file_name: '', tags: null, metadata: null, source: null, created_at: '' })),
  )

  const result: Record<string, { id: string; url: string; fileType: string }> = {}
  for (const item of signed) {
    if (item.thumbnailUrl) {
      result[item.id] = { id: item.id, url: item.thumbnailUrl, fileType: item.fileType }
    }
  }
  return result
}

function collectMediaIds(posts: PostWithPlatform[]): string[] {
  const ids = new Set<string>()
  for (const post of posts) {
    const mediaIds = post.media_ids as string[] | null
    if (mediaIds) mediaIds.forEach((id) => ids.add(id))
  }
  return Array.from(ids)
}
