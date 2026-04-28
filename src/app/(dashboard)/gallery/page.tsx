import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/ui/page-header'
import { GalleryClient } from './gallery-client'
import { createClient } from '@/lib/supabase/server'
import { signThumbnailUrls } from '@/lib/storage'
import { applyCursorPagination, PAGE_SIZES } from '@/lib/pagination'

async function fetchInitialMedia(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const pageSize = PAGE_SIZES.media

  const { data: rows } = await supabase
    .from('content_library')
    .select('id, file_name, file_type, storage_path, thumbnail_path, tags, metadata, source, created_at')
    .eq('profile_id', userId)
    .or('source.eq.upload,source.is.null')
    .order('created_at', { ascending: false })
    .limit(pageSize + 1)

  const { items: rawItems, nextCursor } = applyCursorPagination(rows ?? [], pageSize)
  const items = await signThumbnailUrls(supabase, rawItems)
  return { items, nextCursor }
}

async function fetchTotalCount(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { count } = await supabase
    .from('content_library')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', userId)
    .or('source.eq.upload,source.is.null')
  return count ?? 0
}

async function fetchCreditBalance(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data } = await supabase
    .from('profiles')
    .select('credit_balance')
    .eq('id', userId)
    .single() as { data: { credit_balance: number | null } | null; error: unknown }
  return data?.credit_balance ?? null
}

export default async function GalleryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [{ items, nextCursor }, totalCount, creditBalance] = await Promise.all([
    fetchInitialMedia(supabase, user.id),
    fetchTotalCount(supabase, user.id),
    fetchCreditBalance(supabase, user.id),
  ])

  return (
    <div>
      <PageHeader title="Gallery" subtitle="Your media collection" />
      <div className="px-4 md:px-6">
        <GalleryClient
          userId={user.id}
          initialItems={items}
          initialCursor={nextCursor}
          totalCount={totalCount}
          creditBalance={creditBalance}
        />
      </div>
    </div>
  )
}
