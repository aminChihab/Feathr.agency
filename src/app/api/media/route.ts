import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { signThumbnailUrls } from '@/lib/storage'
import { applyCursorPagination, PAGE_SIZES } from '@/lib/pagination'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const params = request.nextUrl.searchParams
  const cursor = params.get('cursor')
  const filter = params.get('filter')
  const source = params.get('source')
  const pageSize = PAGE_SIZES.media

  let query = supabase
    .from('content_library')
    .select('id, file_name, file_type, storage_path, thumbnail_path, tags, metadata, source, created_at')
    .eq('profile_id', user.id)
    .order('created_at', { ascending: false })
    .limit(pageSize + 1)

  if (cursor) {
    query = query.lt('created_at', cursor)
  }

  if (filter === 'photo' || filter === 'video') {
    query = query.eq('file_type', filter)
  }

  if (source === 'ai_generated') {
    query = query.eq('source', 'ai_generated')
  } else if (source === 'upload') {
    query = query.or('source.eq.upload,source.is.null')
  }

  const { data: rows, error } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const { items: rawItems, nextCursor } = applyCursorPagination(rows ?? [], pageSize)
  const items = await signThumbnailUrls(supabase, rawItems)

  // Total count for "Showing X of Y"
  let countQuery = supabase
    .from('content_library')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)

  if (filter === 'photo' || filter === 'video') {
    countQuery = countQuery.eq('file_type', filter)
  }
  if (source === 'ai_generated') {
    countQuery = countQuery.eq('source', 'ai_generated')
  } else if (source === 'upload') {
    countQuery = countQuery.or('source.eq.upload,source.is.null')
  }

  const { count } = await countQuery

  return NextResponse.json({ items, nextCursor, totalCount: count ?? 0 })
}
