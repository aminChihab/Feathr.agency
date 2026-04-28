import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { MediaLibrary } from '@/components/studio/media-library'
import { createClient } from '@/lib/supabase/server'
import { signThumbnailUrls } from '@/lib/storage'
import { applyCursorPagination, PAGE_SIZES } from '@/lib/pagination'

async function fetchMedia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  source: 'upload' | 'ai_generated',
) {
  const pageSize = PAGE_SIZES.media

  let query = supabase
    .from('content_library')
    .select('id, file_name, file_type, storage_path, thumbnail_path, tags, metadata, source, created_at')
    .eq('profile_id', userId)
    .order('created_at', { ascending: false })
    .limit(pageSize + 1)

  if (source === 'upload') {
    query = query.or('source.eq.upload,source.is.null')
  } else {
    query = query.eq('source', 'ai_generated')
  }

  const { data: rows } = await query
  const { items: rawItems, nextCursor } = applyCursorPagination(rows ?? [], pageSize)
  const items = await signThumbnailUrls(supabase, rawItems)
  return { items, nextCursor }
}

async function fetchCount(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  source: 'upload' | 'ai_generated',
) {
  let query = supabase
    .from('content_library')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', userId)

  if (source === 'upload') {
    query = query.or('source.eq.upload,source.is.null')
  } else {
    query = query.eq('source', 'ai_generated')
  }

  const { count } = await query
  return count ?? 0
}

export default async function GalleryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [uploads, aiCreations, uploadCount, aiCount] = await Promise.all([
    fetchMedia(supabase, user.id, 'upload'),
    fetchMedia(supabase, user.id, 'ai_generated'),
    fetchCount(supabase, user.id, 'upload'),
    fetchCount(supabase, user.id, 'ai_generated'),
  ])

  return (
    <div>
      <PageHeader title="Gallery" subtitle="Your media collection" />
      <div className="px-4 md:px-6">
        <MediaLibrary
          userId={user.id}
          initialUploads={uploads.items}
          initialUploadsCursor={uploads.nextCursor}
          uploadsCount={uploadCount}
          initialAiCreations={aiCreations.items}
          initialAiCreationsCursor={aiCreations.nextCursor}
          aiCreationsCount={aiCount}
        />
      </div>
    </div>
  )
}
