import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@supabase/supabase-js'

function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

// GET /api/agent/media?profile_id=xxx — Get unanalyzed media with signed URLs
// Returns media items that don't have a description yet
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.AGENT_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const profileId = request.nextUrl.searchParams.get('profile_id')
  if (!profileId) {
    return NextResponse.json({ error: 'profile_id required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Get media items without descriptions
  const { data: items } = await supabase
    .from('content_library')
    .select('id, file_name, file_type, mime_type, storage_path, thumbnail_path, tags, metadata')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(100)

  // Filter to items without a description
  const unanalyzed = (items ?? []).filter((item) => {
    const meta = item.metadata as any
    return !meta?.description
  })

  // Also return all items with descriptions for content matching context
  const analyzed = (items ?? []).filter((item) => {
    const meta = item.metadata as any
    return !!meta?.description
  }).map((item) => ({
    id: item.id,
    file_name: item.file_name,
    file_type: item.file_type,
    description: (item.metadata as any)?.description,
    tags: item.tags,
  }))

  // Generate signed URLs for unanalyzed items
  const media = await Promise.all(
    unanalyzed.map(async (item) => {
      const urls: { id: string; file_name: string; file_type: string; image_urls: string[] } = {
        id: item.id,
        file_name: item.file_name,
        file_type: item.file_type,
        image_urls: [],
      }

      if (item.file_type === 'photo') {
        // Full resolution signed URL for photos
        const { data: signed } = await supabase.storage
          .from('media')
          .createSignedUrl(item.storage_path, 3600)
        if (signed?.signedUrl) urls.image_urls.push(signed.signedUrl)
      } else if (item.file_type === 'video') {
        // For videos: provide 5 frame thumbnails stored at upload time
        const meta = item.metadata as any
        const framePaths: string[] = meta?.frame_paths ?? []

        if (framePaths.length > 0) {
          // Use pre-generated frames
          for (const framePath of framePaths) {
            const { data: signed } = await supabase.storage
              .from('media')
              .createSignedUrl(framePath, 3600)
            if (signed?.signedUrl) urls.image_urls.push(signed.signedUrl)
          }
        } else if (item.thumbnail_path) {
          // Fallback to single thumbnail
          const { data: signed } = await supabase.storage
            .from('media')
            .createSignedUrl(item.thumbnail_path, 3600)
          if (signed?.signedUrl) urls.image_urls.push(signed.signedUrl)
        }
      }

      return urls
    })
  )

  return NextResponse.json({ media, already_analyzed: analyzed })
}

// POST /api/agent/media — Save media descriptions
// Body: { items: [{ id: "media_id", description: "...", tags: ["tag1", "tag2"] }] }
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.AGENT_SECRET

  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { items } = body

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Missing items array' }, { status: 400 })
  }

  const supabase = createServiceClient()
  let updated = 0
  const errors: string[] = []

  for (const item of items) {
    const { id, description, tags } = item

    if (!id || !description) {
      errors.push(`Missing id or description`)
      continue
    }

    // Get current metadata
    const { data: current } = await supabase
      .from('content_library')
      .select('metadata, tags')
      .eq('id', id)
      .single()

    const existingMeta = (current?.metadata as any) ?? {}
    const existingTags = current?.tags ?? []

    // Merge description into metadata, merge tags
    const newMeta = { ...existingMeta, description }
    const newTags = [...new Set([...existingTags, ...(tags ?? [])])]

    const { error: updateError } = await supabase
      .from('content_library')
      .update({
        metadata: newMeta,
        tags: newTags,
      })
      .eq('id', id)

    if (updateError) {
      errors.push(`${id}: ${updateError.message}`)
    } else {
      updated++
    }
  }

  return NextResponse.json({
    updated,
    errors: errors.length > 0 ? errors : undefined,
  })
}
