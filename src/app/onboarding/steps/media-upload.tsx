'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { FileDropzone } from '@/components/ui/file-dropzone'

interface MediaUploadProps {
  userId: string
  supabase: SupabaseClient<Database>
  onNext: () => void
  onBack: () => void
  currentStep: number
  totalSteps: number
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

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(storagePath, file)

      if (uploadError) {
        setError(`Failed to upload ${file.name}: ${uploadError.message}`)
        continue
      }

      let thumbnailPath: string | null = null
      if (fileType === 'photo') {
        const thumbBlob = await generateThumbnailBlob(file)
        if (thumbBlob) {
          thumbnailPath = `${userId}/thumbs/${uuid}.jpg`
          await supabase.storage.from('media').upload(thumbnailPath, thumbBlob)
        }
      }

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

      const previewPath = thumbnailPath ?? storagePath
      const { data: signedData } = await supabase.storage
        .from('media')
        .createSignedUrl(previewPath, 3600)

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
    await supabase.from('content_library').delete().eq('id', id)
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-12">
      {/* Progress Indicator */}
      <div className="w-full max-w-4xl mb-12 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs uppercase tracking-widest text-on-surface-variant font-semibold">Step 7 of 8</span>
          <div className="h-1 w-48 bg-surface-container-highest mt-2 rounded-full overflow-hidden">
            <div className="h-full bg-primary w-[87.5%]" />
          </div>
        </div>
        <div className="text-right">
          <span className="font-display italic text-2xl text-primary">Feathr</span>
        </div>
      </div>

      {/* Main Content Area */}
      <section className="w-full max-w-4xl">
        <header className="mb-12">
          <h1 className="font-display text-5xl md:text-7xl mb-4 tracking-tight">Curate Your Portfolio</h1>
          <p className="text-on-surface-variant text-lg max-w-xl leading-relaxed">
            Showcase your creative essence. Upload high-resolution media that defines your brand&apos;s visual narrative.
          </p>
        </header>

        {error && (
          <div className="mb-8 rounded-lg bg-error-container/10 px-4 py-3 text-sm text-error">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Upload Zone */}
          <div className="lg:col-span-5">
            <FileDropzone
              accept=".jpg,.jpeg,.png,.webp,.mp4,.mov"
              maxSizeMB={50}
              onFilesAdded={handleFilesAdded}
              className="group relative flex flex-col items-center justify-center p-12 rounded-xl bg-surface-container-lowest border border-outline-variant/15 hover:border-primary/50 transition-all duration-300 h-full min-h-[400px]"
            >
              <div className="w-20 h-20 rounded-full bg-surface-container-high flex items-center justify-center mb-6 transition-transform duration-300 group-hover:scale-110">
                <span className="material-symbols-outlined text-primary text-4xl">cloud_upload</span>
              </div>
              <div className="text-center">
                <h3 className="text-xl font-medium mb-2">
                  {uploading ? 'Uploading...' : 'Drag & Drop'}
                </h3>
                <p className="text-on-surface-variant text-sm">Or <span className="text-primary font-semibold">browse files</span> from your device</p>
                <p className="text-[10px] mt-6 text-on-surface-variant/60 uppercase tracking-widest">Supports JPG, PNG, MP4 up to 50MB</p>
              </div>
            </FileDropzone>
          </div>

          {/* Gallery Preview Area */}
          <div className="lg:col-span-7">
            <div className="bg-surface-container-low p-8 rounded-xl min-h-[400px]">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-sm font-semibold tracking-widest uppercase text-on-surface-variant">Live Preview</h2>
                {files.length > 0 && (
                  <span className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-full">{files.length} item{files.length !== 1 ? 's' : ''} uploaded</span>
                )}
              </div>

              {/* Bento Grid Gallery */}
              <div className="grid grid-cols-2 gap-4">
                {files.map((file) => (
                  <div key={file.id} className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer border border-outline-variant/10">
                    {file.type === 'photo' && file.thumbnailUrl ? (
                      <img
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        src={file.thumbnailUrl}
                        alt={file.name}
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-container-highest flex items-center justify-center">
                        <span className="material-symbols-outlined text-on-surface-variant text-4xl">movie</span>
                      </div>
                    )}
                    <div className="absolute top-2 right-2 flex gap-2">
                      <button
                        onClick={() => removeFile(file.id)}
                        className="w-8 h-8 rounded-full glass-panel flex items-center justify-center hover:bg-error/20 hover:text-error transition-colors"
                      >
                        <span className="material-symbols-outlined text-sm">delete</span>
                      </button>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                      <p className="text-[10px] truncate text-on-surface font-medium">{file.name}</p>
                    </div>
                  </div>
                ))}

                {/* Empty Slot */}
                {files.length < 4 && (
                  <div className="aspect-square rounded-lg border border-outline-variant/10 border-dashed flex items-center justify-center group hover:border-primary/30 transition-colors">
                    <span className="material-symbols-outlined text-outline-variant group-hover:text-primary transition-colors">add</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <footer className="mt-16 flex items-center justify-between pt-8 border-t border-outline-variant/10">
          <button onClick={onBack} className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined">arrow_back</span>
            <span className="font-semibold">Previous Step</span>
          </button>
          <div className="flex items-center gap-6">
            <button onClick={onNext} className="text-on-surface-variant hover:text-on-surface transition-colors font-medium">Skip for now</button>
            <button
              onClick={onNext}
              disabled={uploading}
              className="gradient-cta text-on-primary font-semibold py-4 px-10 rounded-md flex items-center gap-3 hover:opacity-90 transition-all active:scale-95 shadow-xl shadow-primary/10 disabled:opacity-50"
            >
              Continue to Finish
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </footer>
      </section>

      {/* Contextual Status Bar */}
      {uploading && (
        <div className="fixed bottom-0 left-0 w-full py-3 px-6 glass-panel border-t border-outline-variant/10 flex items-center justify-center gap-8 z-30">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">Uploading...</span>
          </div>
          <div className="hidden md:flex items-center gap-2">
            <span className="material-symbols-outlined text-xs text-tertiary">check_circle</span>
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant">Cloud Sync Active</span>
          </div>
        </div>
      )}
    </main>
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
