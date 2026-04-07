// src/components/dashboard/media-grid.tsx
'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { FileDropzone } from '@/components/ui/file-dropzone'

type MediaItem = Database['public']['Tables']['content_library']['Row'] & {
  signedUrl: string | null
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
          const path = item.thumbnail_path ?? item.storage_path
          const { data: signed } = await supabase.storage
            .from('media')
            .createSignedUrl(path, 3600)
          return { ...item, signedUrl: signed?.signedUrl ?? null }
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
        const thumbBlob = await generateThumbnailBlob(file)
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
            <div key={item.id} className="group relative aspect-square rounded-lg border border-border overflow-hidden">
              {item.signedUrl ? (
                <img src={item.signedUrl} alt={item.file_name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-bg-elevated text-2xl">
                  {item.file_type === 'video' ? '🎬' : '📷'}
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100">
                <p className="truncate text-xs text-white">{item.file_name}</p>
              </div>
              <button
                onClick={() => handleDelete(item.id, item.storage_path, item.thumbnail_path)}
                className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                ✕
              </button>
              <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white uppercase">
                {item.file_type}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

async function generateThumbnailBlob(file: File): Promise<Blob | null> {
  if (!file.type.startsWith('image/')) return null
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const size = 200
      const ratio = Math.min(size / img.width, size / img.height)
      canvas.width = img.width * ratio
      canvas.height = img.height * ratio
      const ctx = canvas.getContext('2d')!
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.7)
    }
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null) }
    img.src = url
  })
}
