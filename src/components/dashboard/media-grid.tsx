'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { FileDropzone } from '@/components/ui/file-dropzone'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Play, X, ChevronLeft, ChevronRight, Search, Image, Video, LayoutGrid, Eye, Trash2, Upload, ArrowUpDown, Tag } from 'lucide-react'

type MediaItem = Database['public']['Tables']['content_library']['Row'] & {
  signedUrl: string | null
  fullUrl: string | null
}

interface MediaGridProps {
  supabase: SupabaseClient<Database>
  userId: string
}

function getFileType(mime: string): 'photo' | 'video' | 'audio' {
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'photo'
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const TAG_COLORS = [
  'bg-accent/15 text-accent border border-accent/30',
  'bg-blue-500/15 text-blue-400 border border-blue-500/30',
  'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30',
  'bg-purple-500/15 text-purple-400 border border-purple-500/30',
  'bg-amber-500/15 text-amber-400 border border-amber-500/30',
]

function tagColor(tag: string): string {
  let hash = 0
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) | 0
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length]
}

export function MediaGrid({ supabase, userId }: MediaGridProps) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'updated' | 'name'>('updated')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)
  const [duplicates, setDuplicates] = useState<{ file: File; existing: MediaItem }[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const navigatePreview = useCallback((direction: 'prev' | 'next') => {
    if (!previewItem) return
    const currentIndex = items.findIndex((i) => i.id === previewItem.id)
    if (currentIndex === -1) return
    const newIndex = direction === 'next'
      ? (currentIndex + 1) % items.length
      : (currentIndex - 1 + items.length) % items.length
    setPreviewItem(items[newIndex])
  }, [previewItem, items])

  // Keyboard navigation
  useEffect(() => {
    if (!previewItem) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') navigatePreview('next')
      else if (e.key === 'ArrowLeft') navigatePreview('prev')
      else if (e.key === 'Escape') setPreviewItem(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [previewItem, navigatePreview])

  async function loadItems() {
    let query = supabase
      .from('content_library')
      .select('*')
      .eq('profile_id', userId)
      .order('created_at', { ascending: false })

    if (filter !== 'all') {
      query = query.eq('file_type', filter)
    }

    const { data } = await query

    if (data) {
      const withUrls = await Promise.all(
        data.map(async (item) => {
          const thumbPath = item.thumbnail_path ?? item.storage_path
          const { data: thumbSigned } = await supabase.storage
            .from('media')
            .createSignedUrl(thumbPath, 3600)

          const { data: fullSigned } = await supabase.storage
            .from('media')
            .createSignedUrl(item.storage_path, 3600)

          return {
            ...item,
            signedUrl: thumbSigned?.signedUrl ?? null,
            fullUrl: fullSigned?.signedUrl ?? null,
          }
        })
      )
      setItems(withUrls)
    }
    setLoading(false)
  }

  useEffect(() => {
    loadItems()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  const filteredItems = useMemo(() => {
    let result = items

    // Tag filter
    if (activeTag) {
      result = result.filter((item) => (item.tags ?? []).includes(activeTag))
    }

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter((item) => {
        const desc = (item.metadata as { description?: string } | null)?.description ?? ''
        const tags = (item.tags ?? []).join(' ')
        return (
          item.file_name.toLowerCase().includes(q) ||
          desc.toLowerCase().includes(q) ||
          tags.toLowerCase().includes(q)
        )
      })
    }

    // Sort
    result = [...result].sort((a, b) => {
      if (sortBy === 'name') {
        return a.file_name.localeCompare(b.file_name)
      }
      // 'updated' — newest first
      return new Date(b.updated_at ?? b.created_at).getTime() - new Date(a.updated_at ?? a.created_at).getTime()
    })

    return result
  }, [items, search, sortBy, activeTag])

  const counts = useMemo(() => {
    const photos = items.filter((i) => i.file_type === 'photo').length
    const videos = items.filter((i) => i.file_type === 'video').length
    return { total: items.length, photos, videos }
  }, [items])

  async function uploadSingleFile(file: File): Promise<string | null> {
    const uuid = crypto.randomUUID()
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const storagePath = `${userId}/${uuid}.${ext}`
    const fileType = getFileType(file.type)

    const { error: uploadError } = await supabase.storage
      .from('media')
      .upload(storagePath, file)

    if (uploadError) return null

    let thumbnailPath: string | null = null
    let videoFramePaths: string[] = []

    if (fileType === 'photo') {
      const thumbBlob = await generateImageThumbnail(file)
      if (thumbBlob) {
        thumbnailPath = `${userId}/thumbs/${uuid}.jpg`
        await supabase.storage.from('media').upload(thumbnailPath, thumbBlob)
      }
    } else if (fileType === 'video') {
      // Generate 5 frames at 1/6, 2/6, 3/6, 4/6, 5/6 of video duration
      const frameBlobs = await generateVideoFrames(file, 5)
      const framePaths: string[] = []

      for (let f = 0; f < frameBlobs.length; f++) {
        const blob = frameBlobs[f]
        if (!blob) { console.warn(`[upload] Frame ${f} blob is null`); continue }
        const framePath = `${userId}/thumbs/${uuid}_frame${f}.jpg`
        const { error: frameErr } = await supabase.storage.from('media').upload(framePath, blob)
        if (frameErr) { console.error(`[upload] Frame ${f} upload failed:`, frameErr.message); continue }
        framePaths.push(framePath)
      }

      // First frame as main thumbnail
      if (framePaths.length > 0) {
        thumbnailPath = framePaths[0]
      }

      // Store all frame paths in metadata
      videoFramePaths = framePaths
    }

    const { data: inserted } = await supabase.from('content_library').insert({
      profile_id: userId,
      storage_path: storagePath,
      file_name: file.name,
      file_type: fileType,
      mime_type: file.type,
      file_size: file.size,
      thumbnail_path: thumbnailPath,
      metadata: videoFramePaths.length > 0 ? { frame_paths: videoFramePaths } : {},
    }).select('id').single()

    setUploadProgress((prev) => ({ ...prev, current: prev.current + 1 }))

    return inserted?.id ?? null
  }

  async function handleFilesSelected(files: File[]) {
    // Check for duplicates by file name and size
    const found: { file: File; existing: MediaItem }[] = []
    const clean: File[] = []

    for (const file of files) {
      const match = items.find(
        (item) => item.file_name === file.name && item.file_size === file.size
      )
      if (match) {
        found.push({ file, existing: match })
      } else {
        clean.push(file)
      }
    }

    if (found.length > 0) {
      setDuplicates(found)
      setPendingFiles(clean)
    } else {
      await doUpload(files)
    }
  }

  async function doUpload(files: File[]) {
    if (files.length === 0) return
    setDuplicates([])
    setPendingFiles([])
    setUploading(true)
    setUploadProgress({ current: 0, total: files.length })

    const uploadedIds: string[] = []

    const concurrency = 5
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency)
      const results = await Promise.all(batch.map((f) => uploadSingleFile(f)))
      results.forEach((id) => { if (id) uploadedIds.push(id) })
    }

    setUploading(false)
    setUploadProgress({ current: 0, total: 0 })
    loadItems()

    // Trigger Media Analyst agent with the specific media IDs
    if (uploadedIds.length > 0) {
      try {
        await fetch('/api/agent/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent: 'media-analyst',
            profile_id: userId,
            title: `Analyze ${uploadedIds.length} newly uploaded media`,
            media_ids: uploadedIds,
          }),
        })
      } catch {
        // Non-blocking
      }
    }
  }

  function handleDuplicateDecision(uploadAll: boolean) {
    if (uploadAll) {
      const allFiles = [...pendingFiles, ...duplicates.map((d) => d.file)]
      doUpload(allFiles)
    } else {
      doUpload(pendingFiles)
    }
  }

  async function handleDelete(id: string, storagePath: string, thumbnailPath: string | null) {
    // Get metadata for video frame paths before deleting
    const item = items.find((i) => i.id === id)
    const framePaths: string[] = (item?.metadata as any)?.frame_paths ?? []

    await supabase.from('content_library').delete().eq('id', id)
    await supabase.storage.from('media').remove([storagePath])
    if (thumbnailPath) {
      await supabase.storage.from('media').remove([thumbnailPath])
    }
    // Clean up video frames
    if (framePaths.length > 0) {
      await supabase.storage.from('media').remove(framePaths)
    }
    setItems((prev) => prev.filter((i) => i.id !== id))
    if (previewItem?.id === id) setPreviewItem(null)
  }

  const progressPct = uploadProgress.total > 0
    ? (uploadProgress.current / uploadProgress.total) * 100
    : 0

  return (
    <div className="space-y-5">

      {/* Upload zone */}
      <FileDropzone
        accept=".jpg,.jpeg,.png,.webp,.mp4,.mov"
        maxFiles={50}
        maxSizeMB={50}
        onFilesAdded={handleFilesSelected}
        className="group relative overflow-hidden rounded-xl border-2 border-dashed border-border bg-bg-surface transition-all duration-200 hover:border-accent/60 hover:bg-accent/5"
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-3 py-2">
            <div className="flex items-center gap-2 text-sm text-text-secondary">
              <Upload className="h-4 w-4 animate-bounce text-accent" />
              Uploading {uploadProgress.current} of {uploadProgress.total} files...
            </div>
            <div className="w-64 h-1.5 rounded-full bg-bg-elevated overflow-hidden">
              <div
                className="h-full rounded-full bg-accent transition-all duration-300 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-xs text-text-muted">{Math.round(progressPct)}% complete</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2">
            <div className="rounded-full bg-bg-elevated p-3 transition-transform duration-200 group-hover:scale-110">
              <Upload className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm font-medium text-text-primary">Drop files here or click to browse</p>
              <p className="text-xs text-text-muted mt-0.5">JPG, PNG, WEBP, MP4, MOV — max 50MB each, up to 50 files</p>
            </div>
          </div>
        )}
      </FileDropzone>

      {/* Duplicate warning */}
      {duplicates.length > 0 && (
        <div className="rounded-lg border border-status-draft/50 bg-status-draft/5 p-4 space-y-3">
          <p className="text-sm font-medium text-status-draft">
            {duplicates.length} possible duplicate{duplicates.length > 1 ? 's' : ''} found
          </p>
          <div className="space-y-2">
            {duplicates.map((d, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-text-primary">{d.file.name}</span>
                <span className="text-text-muted">({formatFileSize(d.file.size)})</span>
                <span className="text-text-muted">— matches existing file</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleDuplicateDecision(true)}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-hover"
            >
              Upload anyway ({duplicates.length + pendingFiles.length} files)
            </button>
            <button
              onClick={() => handleDuplicateDecision(false)}
              className="rounded-lg bg-bg-elevated px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary"
            >
              Skip duplicates ({pendingFiles.length} files)
            </button>
            <button
              onClick={() => { setDuplicates([]); setPendingFiles([]) }}
              className="rounded-lg px-3 py-1.5 text-xs text-text-muted hover:text-text-primary"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Toolbar: filters + search + count */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Type filters */}
        <div className="flex items-center gap-1.5 rounded-lg bg-bg-elevated p-1">
          <button
            onClick={() => setFilter('all')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              filter === 'all'
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <LayoutGrid className="h-3 w-3" />
            All
          </button>
          <button
            onClick={() => setFilter('photo')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              filter === 'photo'
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Image className="h-3 w-3" />
            Photos
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-all ${
              filter === 'video'
                ? 'bg-accent text-white shadow-sm'
                : 'text-text-secondary hover:text-text-primary'
            }`}
          >
            <Video className="h-3 w-3" />
            Videos
          </button>
        </div>

        {/* Search */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
          <input
            type="text"
            placeholder="Search by name, description, tags..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg bg-bg-elevated border border-border pl-9 pr-3 py-2 text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/60 transition-colors"
          />
        </div>

        {/* Sort */}
        <button
          onClick={() => setSortBy(sortBy === 'updated' ? 'name' : 'updated')}
          className="flex items-center gap-1.5 rounded-lg border border-border bg-bg-elevated px-3 py-2 text-xs text-text-secondary hover:text-text-primary transition-colors shrink-0"
          title={`Sort by ${sortBy === 'updated' ? 'name' : 'last updated'}`}
        >
          <ArrowUpDown className="h-3 w-3" />
          {sortBy === 'updated' ? 'Updated' : 'Name'}
        </button>

        {/* Count */}
        {!loading && (
          <p className="text-xs text-text-muted shrink-0">
            {search || activeTag ? (
              <>{filteredItems.length} of {counts.total} items</>
            ) : (
              <>{counts.total} items{counts.photos > 0 && ` · ${counts.photos} photo${counts.photos !== 1 ? 's' : ''}`}{counts.videos > 0 && ` · ${counts.videos} video${counts.videos !== 1 ? 's' : ''}`}</>
            )}
          </p>
        )}
      </div>

      {/* Active tag filter */}
      {activeTag && (
        <div className="flex items-center gap-2 -mt-2">
          <Tag className="h-3 w-3 text-text-muted" />
          <span className="text-xs text-text-muted">Filtered by:</span>
          <button
            onClick={() => setActiveTag(null)}
            className={`flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tagColor(activeTag)}`}
          >
            {activeTag}
            <X className="h-3 w-3 ml-0.5" />
          </button>
        </div>
      )}

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="rounded-full bg-bg-elevated p-4">
            <Image className="h-6 w-6 text-text-muted" />
          </div>
          <div>
            <p className="text-sm font-medium text-text-secondary">
              {search ? 'No results found' : 'No media yet'}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {search ? 'Try a different search term' : 'Upload some files to get started'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const description = (item.metadata as { description?: string } | null)?.description
            const tags = item.tags ?? []
            const hasDescription = !!description

            return (
              <div
                key={item.id}
                className="group relative flex flex-col rounded-xl border border-border bg-bg-surface overflow-hidden transition-all duration-200 hover:border-border-hover hover:shadow-lg hover:shadow-black/20"
              >
                {/* Thumbnail */}
                <div
                  className="relative aspect-video cursor-pointer overflow-hidden bg-bg-elevated"
                  onClick={() => setPreviewItem(item)}
                >
                  {item.signedUrl ? (
                    <img
                      src={item.signedUrl}
                      alt={item.file_name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      {item.file_type === 'video' ? (
                        <Play className="h-10 w-10 text-text-muted" />
                      ) : (
                        <Image className="h-10 w-10 text-text-muted" />
                      )}
                    </div>
                  )}

                  {/* Video play overlay */}
                  {item.file_type === 'video' && item.signedUrl && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="rounded-full bg-black/50 p-2.5 backdrop-blur-sm transition-transform duration-200 group-hover:scale-110">
                        <Play className="h-5 w-5 text-white" fill="white" />
                      </div>
                    </div>
                  )}

                  {/* Hover actions overlay */}
                  <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <button
                      onClick={(e) => { e.stopPropagation(); setPreviewItem(item) }}
                      className="flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-2 text-xs font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/25"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(item.id, item.storage_path, item.thumbnail_path)
                      }}
                      className="flex items-center gap-1.5 rounded-lg bg-red-500/20 px-3 py-2 text-xs font-medium text-red-400 backdrop-blur-sm transition-colors hover:bg-red-500/30"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </button>
                  </div>

                  {/* Badges: top-left file type, top-right analysis status */}
                  <div className="absolute left-2 top-2 flex items-center gap-1.5">
                    <span className="rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white backdrop-blur-sm">
                      {item.file_type}
                    </span>
                  </div>
                  <div className="absolute right-2 top-2">
                    <span
                      title={hasDescription ? 'AI analysis complete' : 'Pending analysis'}
                      className={`block h-2.5 w-2.5 rounded-full border-2 border-bg-surface ${
                        hasDescription ? 'bg-emerald-400' : 'bg-amber-400'
                      }`}
                    />
                  </div>
                </div>

                {/* Card body */}
                <div className="flex flex-col gap-2 p-3">
                  {/* File name */}
                  <p className="truncate text-sm font-medium text-text-primary" title={item.file_name}>
                    {item.file_name}
                  </p>

                  {/* AI description */}
                  <p className={`text-xs leading-relaxed ${
                    hasDescription
                      ? 'text-text-secondary line-clamp-2'
                      : 'italic text-text-muted'
                  }`}>
                    {description ?? 'Pending analysis...'}
                  </p>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 5).map((tag) => (
                        <button
                          key={tag}
                          onClick={(e) => { e.stopPropagation(); setActiveTag(activeTag === tag ? null : tag) }}
                          className={`rounded-full px-2 py-0.5 text-[10px] font-medium transition-opacity hover:opacity-80 ${tagColor(tag)} ${activeTag === tag ? 'ring-1 ring-white/30' : ''}`}
                        >
                          {tag}
                        </button>
                      ))}
                      {tags.length > 5 && (
                        <span className="rounded-full border border-border px-2 py-0.5 text-[10px] text-text-muted">
                          +{tags.length - 5}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Preview lightbox */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="bg-bg-surface border-border max-w-4xl p-0 overflow-hidden">
          {previewItem && (() => {
            const description = (previewItem.metadata as { description?: string } | null)?.description
            const tags = previewItem.tags ?? []
            const hasDescription = !!description

            return (
              <div className="flex flex-col">
                {/* Media */}
                <div className="relative bg-black min-h-[280px] flex items-center justify-center">
                  {previewItem.file_type === 'photo' ? (
                    <img
                      src={previewItem.fullUrl ?? previewItem.signedUrl ?? ''}
                      alt={previewItem.file_name}
                      className="w-full max-h-[70vh] object-contain"
                    />
                  ) : previewItem.file_type === 'video' ? (
                    <video
                      key={previewItem.id}
                      src={previewItem.fullUrl ?? ''}
                      controls
                      autoPlay
                      className="w-full max-h-[70vh]"
                    />
                  ) : null}

                  {/* Nav arrows */}
                  {items.length > 1 && (
                    <>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigatePreview('prev') }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigatePreview('next') }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}

                  {/* Counter badge */}
                  <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
                    {items.findIndex((i) => i.id === previewItem.id) + 1} / {items.length}
                  </div>
                </div>

                {/* Info bar */}
                <div className="flex flex-col gap-3 p-4">
                  {/* Row 1: name + type badge + size + date */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-text-primary">{previewItem.file_name}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                        <span className="uppercase font-medium text-text-secondary">{previewItem.file_type}</span>
                        <span>{formatFileSize(previewItem.file_size)}</span>
                        <span>{formatDate(previewItem.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`h-2 w-2 rounded-full ${hasDescription ? 'bg-emerald-400' : 'bg-amber-400'}`}
                      />
                      <span className="text-xs text-text-muted">
                        {hasDescription ? 'Analyzed' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  {/* Row 2: AI description */}
                  <div className="rounded-lg bg-bg-elevated px-3 py-2.5">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted">AI Description</p>
                    <p className={`text-sm leading-relaxed ${
                      hasDescription ? 'text-text-secondary' : 'italic text-text-muted'
                    }`}>
                      {description ?? 'Pending analysis...'}
                    </p>
                  </div>

                  {/* Row 3: tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <span
                          key={tag}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium ${tagColor(tag)}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Generate high-quality image thumbnail (600px)
async function generateImageThumbnail(file: File): Promise<Blob | null> {
  if (!file.type.startsWith('image/')) return null
  return new Promise((resolve) => {
    const img = new globalThis.Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxSize = 600
      const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}

// Generate multiple video frames at evenly spaced intervals
async function generateVideoFrames(file: File, count: number): Promise<(Blob | null)[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true

    const frames: (Blob | null)[] = []

    function captureCurrentFrame(): Promise<Blob | null> {
      return new Promise((res) => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            try {
              const canvas = document.createElement('canvas')
              const maxSize = 600
              const vw = video.videoWidth || 640
              const vh = video.videoHeight || 360
              const ratio = Math.min(maxSize / vw, maxSize / vh, 1)
              canvas.width = vw * ratio
              canvas.height = vh * ratio
              const ctx = canvas.getContext('2d')!
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
              canvas.toBlob((blob) => res(blob), 'image/jpeg', 0.85)
            } catch {
              res(null)
            }
          })
        })
      })
    }

    video.onloadedmetadata = async () => {
      const duration = video.duration
      for (let i = 0; i < count; i++) {
        const time = (duration * (i + 1)) / (count + 1)
        video.currentTime = time

        await new Promise<void>((seekDone) => {
          video.onseeked = () => seekDone()
        })

        const blob = await captureCurrentFrame()
        frames.push(blob)
      }

      URL.revokeObjectURL(url)
      resolve(frames)
    }

    video.onerror = () => { URL.revokeObjectURL(url); resolve([]) }
    setTimeout(() => { URL.revokeObjectURL(url); resolve(frames) }, 30000)

    video.src = url
    video.load()
  })
}
