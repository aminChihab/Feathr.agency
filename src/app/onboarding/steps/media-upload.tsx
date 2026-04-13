'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { FileDropzone } from '@/components/ui/file-dropzone'

interface MediaUploadProps {
  userId: string
  supabase: SupabaseClient<Database>
  onNext: () => void
  onBack: () => void
}

interface UploadedMedia {
  id: string
  name: string
  thumbnailUrl: string | null
  type: 'photo' | 'video'
}

function getFileType(mime: string): 'photo' | 'video' | 'audio' {
  if (mime.startsWith('video/')) return 'video'
  return 'photo'
}

export function MediaUpload({ userId, supabase, onNext, onBack }: MediaUploadProps) {
  const [files, setFiles] = useState<UploadedMedia[]>([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFilesAdded(newFiles: File[]) {
    setUploading(true)
    setError(null)

    for (const file of newFiles) {
      const uuid = crypto.randomUUID()
      const ext = file.name.split('.').pop()?.toLowerCase() ?? 'bin'
      const storagePath = `${userId}/${uuid}.${ext}`
      const fileType = getFileType(file.type)

      // Upload file
      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(storagePath, file)

      if (uploadError) {
        setError(`Failed to upload ${file.name}: ${uploadError.message}`)
        continue
      }

      // Generate and upload thumbnail for images
      let thumbnailPath: string | null = null
      if (fileType === 'photo') {
        const thumbBlob = await generateThumbnailBlob(file)
        if (thumbBlob) {
          thumbnailPath = `${userId}/thumbs/${uuid}.jpg`
          await supabase.storage.from('media').upload(thumbnailPath, thumbBlob)
        }
      }

      // Create content_library row
      const { data: row } = await supabase
        .from('content_library')
        .insert({
          profile_id: userId,
          storage_path: storagePath,
          file_name: file.name,
          file_type: fileType,
          mime_type: file.type,
          file_size: file.size,
          thumbnail_path: thumbnailPath,
        })
        .select('id')
        .single()

      // Get signed preview URL (bucket is private)
      const previewPath = thumbnailPath ?? storagePath
      const { data: signedData } = await supabase.storage
        .from('media')
        .createSignedUrl(previewPath, 3600) // 1 hour

      setFiles((prev) => [
        ...prev,
        {
          id: row?.id ?? uuid,
          name: file.name,
          thumbnailUrl: signedData?.signedUrl ?? null,
          type: fileType as 'photo' | 'video',
        },
      ])
    }

    setUploading(false)
  }

  async function removeFile(id: string) {
    // Remove from content_library (cascade will handle storage cleanup is not automatic, but UI removes it)
    await supabase.from('content_library').delete().eq('id', id)
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-4xl text-on-surface">Curate Your Portfolio</h1>
        <p className="mt-2 text-on-surface-variant">
          Add photos and videos that Feathr can use for your posts, stories, and promotions.
        </p>
      </div>

      {error && (
        <div className="rounded-lg bg-status-failed/10 px-4 py-3 text-sm text-status-failed">
          {error}
        </div>
      )}

      <FileDropzone
        accept=".jpg,.jpeg,.png,.webp,.mp4,.mov"
        maxSizeMB={50}
        onFilesAdded={handleFilesAdded}
      >
        <div className="space-y-2">
          <p className="text-on-surface-variant">
            {uploading ? 'Uploading...' : 'Drag & drop photos or videos here, or click to browse'}
          </p>
          <p className="text-sm text-on-surface-variant/60">JPG, PNG, WEBP, MP4, MOV — max 50MB each</p>
        </div>
      </FileDropzone>

      {files.length > 0 && (
        <div>
          <p className="mb-3 text-sm text-on-surface-variant">{files.length} file(s) uploaded</p>
          <div className="grid grid-cols-3 gap-3">
            {files.map((file) => (
              <div key={file.id} className="group relative bg-surface-container-high rounded-xl overflow-hidden">
                {file.type === 'photo' && file.thumbnailUrl ? (
                  <img
                    src={file.thumbnailUrl}
                    alt={file.name}
                    className="aspect-square w-full object-cover"
                  />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-surface-container-high rounded-xl">
                    <span className="text-2xl">&#127916;</span>
                  </div>
                )}
                {uploading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <span className="text-xs uppercase tracking-wider text-white">Processing</span>
                  </div>
                )}
                <button
                  onClick={() => removeFile(file.id)}
                  className="absolute right-1 top-1 rounded-full bg-black/60 px-2 py-0.5 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                >
                  &#10005;
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {files.length === 0 && (
        <p className="text-center text-sm text-on-surface-variant/60">
          We recommend uploading at least 3 photos to get started.
        </p>
      )}

      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack}>Back</Button>
        <Button
          onClick={onNext}
          disabled={uploading}
          className="gradient-cta text-white disabled:opacity-50"
        >
          Continue
        </Button>
      </div>
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
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}
