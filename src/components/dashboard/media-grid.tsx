'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { FileDropzone } from '@/components/ui/file-dropzone'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Play, X } from 'lucide-react'

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

export function MediaGrid({ supabase, userId }: MediaGridProps) {
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all')
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null)

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
          // For grid: use thumbnail if available, otherwise full file
          const thumbPath = item.thumbnail_path ?? item.storage_path
          const { data: thumbSigned } = await supabase.storage
            .from('media')
            .createSignedUrl(thumbPath, 3600)

          // For preview: always use full file
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
  }, [filter])

  async function handleUpload(files: File[]) {
    setUploading(true)

    for (const file of files) {
      const uuid = crypto.randomUUID()
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
      const storagePath = `${userId}/${uuid}.${ext}`
      const fileType = getFileType(file.type)

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(storagePath, file)

      if (uploadError) continue

      let thumbnailPath: string | null = null

      if (fileType === 'photo') {
        const thumbBlob = await generateImageThumbnail(file)
        if (thumbBlob) {
          thumbnailPath = `${userId}/thumbs/${uuid}.jpg`
          await supabase.storage.from('media').upload(thumbnailPath, thumbBlob)
        }
      } else if (fileType === 'video') {
        const thumbBlob = await generateVideoThumbnail(file)
        if (thumbBlob) {
          thumbnailPath = `${userId}/thumbs/${uuid}.jpg`
          await supabase.storage.from('media').upload(thumbnailPath, thumbBlob)
        }
      }

      await supabase.from('content_library').insert({
        profile_id: userId,
        storage_path: storagePath,
        file_name: file.name,
        file_type: fileType,
        mime_type: file.type,
        file_size: file.size,
        thumbnail_path: thumbnailPath,
      })
    }

    setUploading(false)
    loadItems()
  }

  async function handleDelete(id: string, storagePath: string, thumbnailPath: string | null) {
    await supabase.from('content_library').delete().eq('id', id)
    await supabase.storage.from('media').remove([storagePath])
    if (thumbnailPath) {
      await supabase.storage.from('media').remove([thumbnailPath])
    }
    setItems((prev) => prev.filter((i) => i.id !== id))
    if (previewItem?.id === id) setPreviewItem(null)
  }

  return (
    <div className="space-y-6">
      <FileDropzone
        accept=".jpg,.jpeg,.png,.webp,.mp4,.mov"
        maxSizeMB={50}
        onFilesAdded={handleUpload}
      >
        <p className="text-text-secondary">
          {uploading ? 'Uploading...' : 'Drag & drop files here, or click to browse'}
        </p>
        <p className="text-sm text-text-muted">JPG, PNG, WEBP, MP4, MOV — max 50MB each</p>
      </FileDropzone>

      <div className="flex gap-2">
        {(['all', 'photo', 'video'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              filter === f
                ? 'bg-accent text-white'
                : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
            }`}
          >
            {f === 'all' ? 'All' : f === 'photo' ? 'Photos' : 'Videos'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-center text-text-muted py-12">No media yet. Upload some files to get started.</p>
      ) : (
        <div className="grid grid-cols-4 gap-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="group relative aspect-square rounded-lg border border-border overflow-hidden cursor-pointer"
              onClick={() => setPreviewItem(item)}
            >
              {item.signedUrl ? (
                <img src={item.signedUrl} alt={item.file_name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-bg-elevated">
                  <Play className="h-8 w-8 text-text-muted" />
                </div>
              )}

              {/* Video play icon overlay */}
              {item.file_type === 'video' && item.signedUrl && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="rounded-full bg-black/50 p-2">
                    <Play className="h-5 w-5 text-white" fill="white" />
                  </div>
                </div>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="truncate text-xs text-white">{item.file_name}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete(item.id, item.storage_path, item.thumbnail_path)
                }}
                className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white uppercase">
                {item.file_type}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Preview lightbox */}
      <Dialog open={!!previewItem} onOpenChange={(open) => !open && setPreviewItem(null)}>
        <DialogContent className="bg-bg-surface border-border max-w-4xl p-0 overflow-hidden">
          {previewItem && (
            <div className="relative">
              {previewItem.file_type === 'photo' ? (
                <img
                  src={previewItem.fullUrl ?? previewItem.signedUrl ?? ''}
                  alt={previewItem.file_name}
                  className="w-full max-h-[80vh] object-contain bg-black"
                />
              ) : previewItem.file_type === 'video' ? (
                <video
                  src={previewItem.fullUrl ?? ''}
                  controls
                  autoPlay
                  className="w-full max-h-[80vh] bg-black"
                />
              ) : null}
              <div className="p-4">
                <p className="text-sm text-text-primary">{previewItem.file_name}</p>
                <p className="text-xs text-text-muted">
                  {previewItem.file_type} · {(previewItem.file_size / 1024 / 1024).toFixed(1)} MB
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Generate high-quality image thumbnail (600px instead of 200px)
async function generateImageThumbnail(file: File): Promise<Blob | null> {
  if (!file.type.startsWith('image/')) return null
  return new Promise((resolve) => {
    const img = new Image()
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

// Generate video thumbnail from first frame
async function generateVideoThumbnail(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    const url = URL.createObjectURL(file)
    video.preload = 'auto'
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'

    video.onloadedmetadata = () => {
      // Seek to 1 second or 10% of duration (whichever is less)
      video.currentTime = Math.min(1, video.duration * 0.1)
    }

    video.onseeked = () => {
      // Wait a frame for the video to actually render
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
            URL.revokeObjectURL(url)
            canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.85)
          } catch {
            URL.revokeObjectURL(url)
            resolve(null)
          }
        })
      })
    }

    video.onerror = () => { URL.revokeObjectURL(url); resolve(null) }

    // Timeout fallback — if nothing happens in 10 seconds, give up
    setTimeout(() => { URL.revokeObjectURL(url); resolve(null) }, 10000)

    video.src = url
    video.load()
  })
}
