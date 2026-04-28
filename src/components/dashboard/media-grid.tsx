'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import NextImage from 'next/image'
import { createClient } from '@/lib/supabase/client'
import type { SignedMediaItem } from '@/lib/storage'
import { FileDropzone } from '@/components/ui/file-dropzone'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Play, X, ChevronLeft, ChevronRight, Image, Video, Trash2, Upload, Tag, Download } from 'lucide-react'
import { generateImageThumbnail, generateVideoFrames } from '@/lib/media'

interface MediaGridProps {
  userId: string
  sourceFilter?: 'upload' | 'ai_generated' | 'all'
  initialItems: SignedMediaItem[]
  initialCursor: string | null
  totalCount: number
  externalFiles?: File[]
  onExternalFilesConsumed?: () => void
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

function getExtBadge(item: SignedMediaItem): string {
  const ext = item.fileName.split('.').pop()?.toUpperCase() ?? ''
  if (['JPG', 'JPEG', 'PNG', 'WEBP', 'GIF', 'TIFF', 'RAW', 'CR2'].includes(ext)) return ext
  if (['MP4', 'MOV', 'AVI', 'WEBM'].includes(ext)) return ext
  if (item.fileType === 'video') return 'MP4'
  return ext || 'FILE'
}

function buildMediaApiUrl(params: {
  cursor: string | null
  filter: string
  source: string
}): string {
  const url = new URL('/api/media', window.location.origin)
  if (params.cursor) url.searchParams.set('cursor', params.cursor)
  if (params.filter !== 'all') url.searchParams.set('filter', params.filter)
  if (params.source !== 'all') url.searchParams.set('source', params.source)
  return url.toString()
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MediaThumbnail({
  item,
  onClick,
  onDelete,
}: {
  item: SignedMediaItem
  onClick: () => void
  onDelete: () => void
}) {
  const isVideo = item.fileType === 'video'
  const extBadge = getExtBadge(item)

  return (
    <div
      className="group bg-surface-container-low rounded-xl overflow-hidden hover:translate-y-[-4px] transition-all duration-300"
    >
      <div
        className="relative aspect-[4/5] overflow-hidden cursor-pointer"
        onClick={onClick}
      >
        {item.thumbnailUrl ? (
          <NextImage
            alt={item.fileName}
            src={item.thumbnailUrl}
            fill
            sizes="(max-width: 768px) 50vw, 25vw"
            className="object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-surface-container-high">
            {isVideo ? (
              <Video className="h-10 w-10 text-on-surface-variant" />
            ) : (
              <Image className="h-10 w-10 text-on-surface-variant" />
            )}
          </div>
        )}

        <div className={`absolute top-3 left-3 px-2 py-1 rounded text-[10px] font-bold tracking-tighter uppercase ${
          isVideo
            ? 'bg-primary text-on-primary-container'
            : 'bg-black/40 backdrop-blur-md text-white'
        }`}>
          {extBadge}
        </div>

        {isVideo && item.thumbnailUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Play className="h-14 w-14 text-white/40 group-hover:text-primary transition-colors" fill="currentColor" />
          </div>
        )}

        {!isVideo && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
            <div className="flex gap-2">
              <button
                onClick={(e) => { e.stopPropagation(); onClick() }}
                className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-primary transition-colors"
              >
                <Download className="h-3.5 w-3.5 text-white" />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete() }}
                className="p-2 bg-white/20 backdrop-blur-md rounded-full hover:bg-primary transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5 text-white" />
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3">
        <h4 className="text-sm font-medium truncate">{item.fileName}</h4>
        <MediaTagList tags={item.tags ?? []} />
      </div>
    </div>
  )
}

function MediaTagList({
  tags,
  activeTag,
  onTagClick,
}: {
  tags: string[]
  activeTag?: string | null
  onTagClick?: (tag: string) => void
}) {
  const hasAiTag = tags.length > 0
  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.slice(0, 3).map((tag) => (
        <button
          key={tag}
          onClick={() => onTagClick?.(tag)}
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
  )
}

function LightboxPreview({
  item,
  total,
  index,
  onClose,
  onPrev,
  onNext,
  activeTag,
  onTagClick,
}: {
  item: SignedMediaItem & { previewUrl?: string | null; fileSize?: number }
  total: number
  index: number
  onClose: () => void
  onPrev: () => void
  onNext: () => void
  activeTag: string | null
  onTagClick: (tag: string) => void
}) {
  const description = (item.metadata as { description?: string } | null)?.description
  const tags = item.tags ?? []
  const hasDescription = !!description
  const displayUrl = item.previewUrl ?? item.thumbnailUrl ?? ''

  return (
    <div className="flex flex-col">
      <div className="relative bg-black min-h-[280px] flex items-center justify-center">
        {item.fileType === 'photo' ? (
          <img
            src={displayUrl}
            alt={item.fileName}
            className="w-full max-h-[70vh] object-contain"
          />
        ) : item.fileType === 'video' ? (
          <video
            key={item.id}
            src={displayUrl}
            controls
            autoPlay
            className="w-full max-h-[70vh]"
          />
        ) : null}

        {index > 0 && (
          <button
            onClick={(e) => { e.stopPropagation(); onPrev() }}
            className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {index < total - 1 && (
          <button
            onClick={(e) => { e.stopPropagation(); onNext() }}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-2.5 text-white backdrop-blur-sm transition-colors hover:bg-black/80"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        )}

        <div className="absolute bottom-3 right-3 rounded-full bg-black/60 px-2.5 py-1 text-xs text-white backdrop-blur-sm">
          {index + 1} / {total}
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4 overflow-y-auto max-h-[40vh] md:max-h-none">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-on-surface">{item.fileName}</p>
            <div className="mt-1 flex items-center gap-3 text-xs text-on-surface-variant">
              <span className="uppercase font-medium">{item.fileType}</span>
              {item.fileSize != null && <span>{formatFileSize(item.fileSize)}</span>}
              <span>{formatDate(item.createdAt)}</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <span className={`h-2 w-2 rounded-full ${hasDescription ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            <span className="text-xs text-on-surface-variant">{hasDescription ? 'Analyzed' : 'Pending'}</span>
          </div>
        </div>

        <div className="rounded-lg bg-surface-container-high px-3 py-2.5">
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">AI Description</p>
          <p className={`text-sm leading-relaxed ${hasDescription ? 'text-on-surface-variant' : 'italic text-on-surface-variant'}`}>
            {description ?? 'Pending analysis...'}
          </p>
        </div>

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {tags.map((tag) => (
              <button
                key={tag}
                onClick={() => { onTagClick(tag); onClose() }}
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
}

// ── PreviewItem type ──────────────────────────────────────────────────────────

interface PreviewState {
  item: SignedMediaItem
  previewUrl: string | null
  fileSize?: number
}

// ── Main component ────────────────────────────────────────────────────────────

export function MediaGrid({
  userId,
  sourceFilter = 'all',
  initialItems,
  initialCursor,
  totalCount: initialTotalCount,
  externalFiles,
  onExternalFilesConsumed,
}: MediaGridProps) {
  const supabase = createClient()

  const [items, setItems] = useState<SignedMediaItem[]>(initialItems)
  const [cursor, setCursor] = useState<string | null>(initialCursor)
  const [totalCount, setTotalCount] = useState(initialTotalCount)
  const [loadingMore, setLoadingMore] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all')
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState<'updated' | 'name'>('updated')
  const [activeTag, setActiveTag] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewState | null>(null)
  const [duplicates, setDuplicates] = useState<{ file: File; existing: SignedMediaItem }[]>([])
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  // Handle files passed from parent (upload modal)
  useEffect(() => {
    if (externalFiles && externalFiles.length > 0) {
      handleFilesSelected(externalFiles)
      onExternalFilesConsumed?.()
    }
  }, [externalFiles])

  // Fetch on mount when no initial data (e.g. AI generated tab)
  useEffect(() => {
    if (initialItems.length === 0 && sourceFilter !== 'all') {
      resetAndFetch()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When filter changes, reset and fetch from API
  useEffect(() => {
    if (filter === 'all' && cursor === initialCursor) return
    resetAndFetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function resetAndFetch() {
    setLoadingMore(true)
    const url = buildMediaApiUrl({ cursor: null, filter, source: sourceFilter })
    const res = await fetch(url)
    if (!res.ok) { setLoadingMore(false); return }
    const json = await res.json() as { items: SignedMediaItem[]; nextCursor: string | null; totalCount: number }
    setItems(json.items)
    setCursor(json.nextCursor)
    setTotalCount(json.totalCount)
    setLoadingMore(false)
  }

  async function loadMoreItems() {
    if (!cursor || loadingMore) return
    setLoadingMore(true)
    const url = buildMediaApiUrl({ cursor, filter, source: sourceFilter })
    const res = await fetch(url)
    if (!res.ok) { setLoadingMore(false); return }
    const json = await res.json() as { items: SignedMediaItem[]; nextCursor: string | null; totalCount: number }
    setItems((prev) => [...prev, ...json.items])
    setCursor(json.nextCursor)
    setLoadingMore(false)
  }

  // Keyboard navigation for lightbox
  const navigatePreview = useCallback((direction: 'prev' | 'next') => {
    if (!preview) return
    const currentIndex = filteredItems.findIndex((i) => i.id === preview.item.id)
    if (currentIndex === -1) return
    const newIndex = direction === 'next'
      ? (currentIndex + 1) % filteredItems.length
      : (currentIndex - 1 + filteredItems.length) % filteredItems.length
    openPreview(filteredItems[newIndex])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preview, items])

  useEffect(() => {
    if (!preview) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowRight') navigatePreview('next')
      else if (e.key === 'ArrowLeft') navigatePreview('prev')
      else if (e.key === 'Escape') setPreview(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [preview, navigatePreview])

  async function openPreview(item: SignedMediaItem) {
    // Set immediately with thumbnail so UI is responsive
    setPreview({ item, previewUrl: item.thumbnailUrl })
    // Then fetch full-res on demand
    const res = await fetch(`/api/media/sign?path=${encodeURIComponent(item.storagePath)}`)
    if (res.ok) {
      const { url } = await res.json() as { url: string }
      setPreview((prev) => prev?.item.id === item.id ? { ...prev, previewUrl: url } : prev)
    }
  }

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
          item.fileName.toLowerCase().includes(q) ||
          desc.toLowerCase().includes(q) ||
          tags.toLowerCase().includes(q)
        )
      })
    }

    result = [...result].sort((a, b) => {
      if (sortBy === 'name') {
        return a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' })
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    return result
  }, [items, search, sortBy, activeTag])

  const progressPct = uploadProgress.total > 0
    ? (uploadProgress.current / uploadProgress.total) * 100
    : 0

  // ── Upload helpers ─────────────────────────────────────────────────────────

  async function uploadSingleFile(file: File): Promise<{ item: SignedMediaItem | null; id: string | null }> {
    const uuid = crypto.randomUUID()
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
    const storagePath = `${userId}/${uuid}.${ext}`
    const fileType = getFileType(file.type)

    const { error: uploadError } = await supabase.storage.from('media').upload(storagePath, file)
    if (uploadError) return { item: null, id: null }

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
        if (!blob) continue
        const framePath = `${userId}/thumbs/${uuid}_frame${f}.jpg`
        const { error: frameErr } = await supabase.storage.from('media').upload(framePath, blob)
        if (frameErr) continue
        framePaths.push(framePath)
      }
      if (framePaths.length > 0) thumbnailPath = framePaths[0]
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
    }).select('id, file_name, file_type, storage_path, thumbnail_path, tags, metadata, source, created_at').single()

    setUploadProgress((prev) => ({ ...prev, current: prev.current + 1 }))

    if (!inserted) return { item: null, id: null }

    // Sign the thumbnail immediately so it shows up without a reload
    const thumbPath = inserted.thumbnail_path ?? inserted.storage_path
    const { data: signedData } = await supabase.storage.from('media').createSignedUrl(thumbPath, 86400)

    const newItem: SignedMediaItem = {
      id: inserted.id,
      fileName: inserted.file_name,
      fileType: inserted.file_type,
      storagePath: inserted.storage_path,
      thumbnailPath: inserted.thumbnail_path,
      thumbnailUrl: signedData?.signedUrl ?? null,
      tags: inserted.tags,
      metadata: inserted.metadata as Record<string, unknown> | null,
      source: inserted.source,
      createdAt: inserted.created_at,
    }

    return { item: newItem, id: inserted.id }
  }

  function handleFilesSelected(files: File[]) {
    const found: { file: File; existing: SignedMediaItem }[] = []
    const clean: File[] = []

    for (const file of files) {
      const match = items.find((item) => item.fileName === file.name)
      if (match) found.push({ file, existing: match })
      else clean.push(file)
    }

    if (found.length > 0) {
      setDuplicates(found)
      setPendingFiles(clean)
    } else {
      doUpload(files)
    }
  }

  async function doUpload(files: File[]) {
    if (files.length === 0) return
    setDuplicates([])
    setPendingFiles([])
    setUploading(true)
    setUploadProgress({ current: 0, total: files.length })

    const uploadedIds: string[] = []
    const uploadedItems: SignedMediaItem[] = []

    const concurrency = 5
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency)
      const results = await Promise.all(batch.map((f) => uploadSingleFile(f)))
      results.forEach(({ item, id }) => {
        if (item) uploadedItems.push(item)
        if (id) uploadedIds.push(id)
      })
    }

    setUploading(false)
    setUploadProgress({ current: 0, total: 0 })
    // Prepend new items
    setItems((prev) => [...uploadedItems, ...prev])
    setTotalCount((prev) => prev + uploadedItems.length)

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
    const allFiles = uploadAll
      ? [...pendingFiles, ...duplicates.map((d) => d.file)]
      : pendingFiles
    doUpload(allFiles)
  }

  async function handleDelete(id: string, storagePath: string, thumbnailPath: string | null, metadata: Record<string, unknown> | null) {
    const framePaths: string[] = (metadata?.frame_paths as string[] | undefined) ?? []

    await supabase.from('content_library').delete().eq('id', id)
    await supabase.storage.from('media').remove([storagePath])
    if (thumbnailPath) await supabase.storage.from('media').remove([thumbnailPath])
    if (framePaths.length > 0) await supabase.storage.from('media').remove(framePaths)

    setItems((prev) => prev.filter((i) => i.id !== id))
    setTotalCount((prev) => prev - 1)
    if (preview?.item.id === id) setPreview(null)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-10">
      {/* Upload progress (only shown while uploading) */}
      {uploading && (
        <section className="flex flex-col items-center gap-3 py-6">
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
        </section>
      )}

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

      {/* Filter Bar */}
      <section className="flex flex-wrap justify-between items-center gap-2 pb-2">
        <div className="flex flex-wrap gap-2">
          {(['all', 'photo', 'video'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-surface-container-high text-on-surface'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {f === 'all' ? 'All Assets' : f === 'photo' ? 'Photos' : 'Videos'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
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

      {/* Media Grid */}
      {filteredItems.length === 0 ? (
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
        <section className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {filteredItems.map((item) => (
            <MediaThumbnail
              key={item.id}
              item={item}
              onClick={() => openPreview(item)}
              onDelete={() => handleDelete(item.id, item.storagePath, item.thumbnailPath, item.metadata)}
            />
          ))}
        </section>
      )}

      {/* Load more footer */}
      {filteredItems.length > 0 && (
        <footer className="flex justify-between items-center pt-8 border-t border-outline-variant/10">
          <div className="text-xs text-on-surface-variant/40">
            Showing {filteredItems.length} of {totalCount} files
          </div>
          {cursor && (
            <button
              onClick={loadMoreItems}
              disabled={loadingMore}
              className="px-4 py-2 bg-primary text-on-primary-container text-xs font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loadingMore ? 'Loading…' : `Showing ${filteredItems.length} of ${totalCount} — Load more`}
            </button>
          )}
        </footer>
      )}

      {/* Preview lightbox */}
      <Dialog open={!!preview} onOpenChange={(open) => !open && setPreview(null)}>
        <DialogContent className="bg-surface-container-low border-outline-variant/15 md:max-w-4xl p-0 overflow-hidden">
          {preview && (
            <LightboxPreview
              item={preview.item}
              total={filteredItems.length}
              index={filteredItems.findIndex((i) => i.id === preview.item.id)}
              onClose={() => setPreview(null)}
              onPrev={() => navigatePreview('prev')}
              onNext={() => navigatePreview('next')}
              activeTag={activeTag}
              onTagClick={(tag) => setActiveTag(activeTag === tag ? null : tag)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
