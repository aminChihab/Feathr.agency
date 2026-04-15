'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { FileDropzone } from '@/components/ui/file-dropzone'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Play, X, ChevronLeft, ChevronRight, Search, Image, Video, Eye, Trash2, Upload, Tag, Download, Share2, Zap } from 'lucide-react'

type MediaItem = Database['public']['Tables']['content_library']['Row'] & {
  signedUrl: string | null
  fullUrl: string | null
}

interface MediaGridProps {
  supabase: SupabaseClient<Database>
  userId: string
  sourceFilter?: 'upload' | 'ai_generated' | 'all'
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

/** Return a file extension badge label from mime or filename. */
function getExtBadge(item: MediaItem): string {
  const ext = item.file_name.split('.').pop()?.toUpperCase() ?? ''
  if (['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'TIFF', 'RAW', 'CR2'].includes(ext)) return ext
  if (['MP4', 'MOV', 'AVI', 'WEBM'].includes(ext)) return ext
  if (item.file_type === 'video') return 'MP4'
  return ext || 'FILE'
}

export function MediaGrid({ supabase, userId, sourceFilter = 'all' }: MediaGridProps) {
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

    if (sourceFilter === 'ai_generated') {
      query = query.eq('source', 'ai_generated')
    } else if (sourceFilter === 'upload') {
      query = query.or('source.eq.upload,source.is.null')
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

    if (activeTag) {
      result = result.filter((item) => (item.tags ?? []).includes(activeTag))
    }

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

    result = [...result].sort((a, b) => {
      if (sortBy === 'name') {
        return a.file_name.localeCompare(b.file_name, undefined, { numeric: true, sensitivity: 'base' })
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    })

    return result
  }, [items, search, sortBy, activeTag])

  const counts = useMemo(() => {
    const photos = items.filter((i) => i.file_type === 'photo').length
    const videos = items.filter((i) => i.file_type === 'video').length
    return { total: items.length, photos, videos }
  }, [items])

  // Rough storage estimate
  const totalSizeGB = useMemo(() => {
    const bytes = items.reduce((sum, i) => sum + (i.file_size ?? 0), 0)
    return (bytes / 1024 / 1024 / 1024).toFixed(1)
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

      if (framePaths.length > 0) {
        thumbnailPath = framePaths[0]
      }
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
    const item = items.find((i) => i.id === id)
    const framePaths: string[] = (item?.metadata as any)?.frame_paths ?? []

    await supabase.from('content_library').delete().eq('id', id)
    await supabase.storage.from('media').remove([storagePath])
    if (thumbnailPath) {
      await supabase.storage.from('media').remove([thumbnailPath])
    }
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
    <div className="space-y-10">
      {/* ── Upload Section (grid 8/4 from mockup) ─────────────────────── */}
      <section className="grid grid-cols-12 gap-8">
        {/* Dropzone */}
        <div className="col-span-8">
          <FileDropzone
            accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.tiff,.cr2,.raw"
            maxFiles={50}
            maxSizeMB={500}
            onFilesAdded={handleFilesSelected}
            className="group relative h-48 rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-lowest flex flex-col items-center justify-center transition-all hover:bg-surface-container-low hover:border-primary/40 cursor-pointer"
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <Upload className="h-8 w-8 text-primary/40 animate-bounce" />
                <p className="text-sm text-on-surface-variant">
                  Uploading {uploadProgress.current} of {uploadProgress.total} files...
                </p>
                <div className="w-64 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <span className="text-xs text-on-surface-variant">{Math.round(progressPct)}% complete</span>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-primary/40 mb-3 group-hover:scale-110 transition-transform" />
                <p className="font-display text-xl text-on-surface-variant italic">Drop your vision here</p>
                <p className="text-xs text-on-surface-variant/40 mt-1">RAW, TIFF, or MP4 up to 500MB</p>
              </>
            )}
          </FileDropzone>
        </div>

        {/* Storage Insight card */}
        <div className="col-span-4 flex flex-col justify-between p-6 bg-surface-container-high rounded-xl">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-widest text-primary mb-4">Storage Insight</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <span className="text-2xl font-display italic">{totalSizeGB} GB</span>
                <span className="text-xs opacity-40">of 50 GB used</span>
              </div>
              <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
                <div className="bg-primary h-full transition-all" style={{ width: `${Math.min(parseFloat(totalSizeGB) / 50 * 100, 100)}%` }} />
              </div>
            </div>
          </div>
          <button className="flex items-center justify-center gap-2 text-xs py-2 border border-outline-variant/20 rounded-lg hover:bg-surface-bright transition-colors mt-4">
            <Zap className="h-3.5 w-3.5" />
            Upgrade Atelier Space
          </button>
        </div>
      </section>

      {/* Duplicate warning */}
      {duplicates.length > 0 && (
        <div className="rounded-lg border border-status-draft/50 bg-status-draft/5 p-4 space-y-3">
          <p className="text-sm font-medium text-status-draft">
            {duplicates.length} possible duplicate{duplicates.length > 1 ? 's' : ''} found
          </p>
          <div className="space-y-2">
            {duplicates.map((d, i) => (
              <div key={i} className="flex items-center gap-3 text-xs">
                <span className="text-on-surface">{d.file.name}</span>
                <span className="text-on-surface-variant">({formatFileSize(d.file.size)})</span>
                <span className="text-on-surface-variant">-- matches existing file</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => handleDuplicateDecision(true)}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs text-white hover:bg-primary-hover"
            >
              Upload anyway ({duplicates.length + pendingFiles.length} files)
            </button>
            <button
              onClick={() => handleDuplicateDecision(false)}
              className="rounded-lg bg-surface-container-high px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface"
            >
              Skip duplicates ({pendingFiles.length} files)
            </button>
            <button
              onClick={() => { setDuplicates([]); setPendingFiles([]) }}
              className="rounded-lg px-3 py-1.5 text-xs text-on-surface-variant hover:text-on-surface"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Filter Bar (from mockup) ──────────────────────────────────── */}
      <section className="flex justify-between items-center pb-2">
        <div className="flex gap-8">
          <button
            onClick={() => setFilter('all')}
            className={`text-sm font-medium pb-2 transition-all ${
              filter === 'all'
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface/40 hover:text-on-surface/80'
            }`}
          >
            All Assets
          </button>
          <button
            onClick={() => setFilter('photo')}
            className={`text-sm font-medium pb-2 transition-all ${
              filter === 'photo'
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface/40 hover:text-on-surface/80'
            }`}
          >
            Photos
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`text-sm font-medium pb-2 transition-all ${
              filter === 'video'
                ? 'text-primary border-b-2 border-primary'
                : 'text-on-surface/40 hover:text-on-surface/80'
            }`}
          >
            Videos
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-on-surface-variant/60">Sort by</span>
          <button
            onClick={() => setSortBy(sortBy === 'updated' ? 'name' : 'updated')}
            className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors"
          >
            {sortBy === 'updated' ? 'Recently Added' : 'Name'}
            <ChevronLeft className="h-3.5 w-3.5 rotate-[-90deg]" />
          </button>
        </div>
      </section>

      {/* Active tag filter */}
      {activeTag && (
        <div className="flex items-center gap-2 -mt-6">
          <Tag className="h-3 w-3 text-on-surface-variant" />
          <span className="text-xs text-on-surface-variant">Filtered by:</span>
          <button
            onClick={() => setActiveTag(null)}
            className="flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-surface-container-highest text-on-surface-variant"
          >
            {activeTag}
            <X className="h-3 w-3 ml-0.5" />
          </button>
        </div>
      )}

      {/* ── Media Grid (4-col from mockup) ────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
          <div className="rounded-full bg-surface-container-high p-4">
            <Image className="h-6 w-6 text-on-surface-variant" />
          </div>
          <div>
            <p className="text-sm font-medium text-on-surface-variant">
              {search ? 'No results found' : 'No media yet'}
            </p>
            <p className="text-xs text-on-surface-variant mt-1">
              {search ? 'Try a different search term' : 'Upload some files to get started'}
            </p>
          </div>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => {
            const tags = item.tags ?? []
            const isVideo = item.file_type === 'video'
            const extBadge = getExtBadge(item)
            const hasAiTag = tags.length > 0

            return (
              <div
                key={item.id}
                className="group bg-surface-container-low rounded-xl overflow-hidden hover:translate-y-[-4px] transition-all duration-300"
              >
                {/* Thumbnail */}
                <div
                  className="relative aspect-[4/5] overflow-hidden cursor-pointer"
                  onClick={() => setPreviewItem(item)}
                >
                  {item.signedUrl ? (
                    <img
                      alt={item.file_name}
                      className="w-full h-full object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
                      src={item.signedUrl}
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-surface-container-high">
                      {isVideo ? (
                        <Play className="h-10 w-10 text-on-surface-variant" />
                      ) : (
                        <Image className="h-10 w-10 text-on-surface-variant" />
                      )}
                    </div>
                  )}

                  {/* File type badge */}
                  <div className={`absolute top-3 left-3 px-2 py-1 rounded text-[10px] font-bold tracking-tighter uppercase ${
                    isVideo
                      ? 'bg-primary text-on-primary-container'
                      : 'bg-black/40 backdrop-blur-md text-white'
                  }`}>
                    {extBadge}
                  </div>

                  {/* Video play icon */}
                  {isVideo && item.signedUrl && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="h-14 w-14 text-white/40 group-hover:text-primary transition-colors" fill="currentColor" />
                    </div>
                  )}

                  {/* Hover overlay with download/share buttons */}
                  {!isVideo && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setPreviewItem(item) }}
                          className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-primary transition-colors"
                        >
                          <Download className="h-3.5 w-3.5 text-white" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDelete(item.id, item.storage_path, item.thumbnail_path)
                          }}
                          className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-primary transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-white" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card body */}
                <div className="p-4 space-y-3">
                  <h4 className="text-sm font-medium truncate">{item.file_name}</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.slice(0, 3).map((tag) => (
                      <button
                        key={tag}
                        onClick={() => setActiveTag(activeTag === tag ? null : tag)}
                        className="text-[9px] px-2 py-0.5 bg-surface-container-highest text-on-surface-variant/80 rounded-full hover:opacity-80 transition-opacity"
                      >
                        #{tag}
                      </button>
                    ))}
                    {hasAiTag && (
                      <span className="text-[9px] px-2 py-0.5 bg-surface-container-highest text-on-surface-variant/80 rounded-full italic font-display">
                        AI Tagged
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </section>
      )}

      {/* ── Pagination Footer (from mockup) ───────────────────────────── */}
      {!loading && filteredItems.length > 0 && (
        <footer className="flex justify-between items-center pt-8 border-t border-outline-variant/10">
          <div className="text-xs text-on-surface-variant/40">
            Showing {filteredItems.length} of {counts.total} files
          </div>
          <div className="flex gap-2">
            <button className="px-4 py-2 bg-surface-container-low text-xs hover:bg-surface-bright rounded-lg transition-colors">
              Previous
            </button>
            <button className="px-4 py-2 bg-primary text-on-primary-container text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity">
              Load More Assets
            </button>
          </div>
        </footer>
      )}

      {/* ── Preview lightbox ──────────────────────────────────────────── */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="bg-surface-container-low border-outline-variant/15 max-w-4xl p-0 overflow-hidden">
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
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-on-surface">{previewItem.file_name}</p>
                      <div className="mt-1 flex items-center gap-3 text-xs text-on-surface-variant">
                        <span className="uppercase font-medium text-on-surface-variant">{previewItem.file_type}</span>
                        <span>{formatFileSize(previewItem.file_size)}</span>
                        <span>{formatDate(previewItem.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className={`h-2 w-2 rounded-full ${hasDescription ? 'bg-emerald-400' : 'bg-amber-400'}`}
                      />
                      <span className="text-xs text-on-surface-variant">
                        {hasDescription ? 'Analyzed' : 'Pending'}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-lg bg-surface-container-high px-3 py-2.5">
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">AI Description</p>
                    <p className={`text-sm leading-relaxed ${
                      hasDescription ? 'text-on-surface-variant' : 'italic text-on-surface-variant'
                    }`}>
                      {description ?? 'Pending analysis...'}
                    </p>
                  </div>

                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {tags.map((tag) => (
                        <button
                          key={tag}
                          onClick={() => { setActiveTag(activeTag === tag ? null : tag); setPreviewItem(null) }}
                          className="rounded-full px-2.5 py-1 text-xs font-medium bg-surface-container-highest text-on-surface-variant hover:bg-primary/15 hover:text-primary transition-colors cursor-pointer"
                        >
                          {tag}
                        </button>
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
