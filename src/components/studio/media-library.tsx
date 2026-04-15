'use client'

import { useEffect, useState, useCallback } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { FileDropzone } from '@/components/ui/file-dropzone'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Sparkles, ImagePlus, Camera } from 'lucide-react'

type MediaRow = Database['public']['Tables']['content_library']['Row']

type MediaItem = MediaRow & {
  signedUrl: string | null
}

interface MediaLibraryProps {
  supabase: SupabaseClient<Database>
  userId: string
  creditBalance: number | null
  onCreditsChanged?: () => void
}

type InnerTab = 'my-media' | 'ai-generated'

function getFileType(mime: string): 'photo' | 'video' | 'audio' {
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('audio/')) return 'audio'
  return 'photo'
}

export function MediaLibrary({ supabase, userId, creditBalance, onCreditsChanged }: MediaLibraryProps) {
  const [innerTab, setInnerTab] = useState<InnerTab>('my-media')
  const [items, setItems] = useState<MediaItem[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [generateOpen, setGenerateOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [hasReferencePhotos, setHasReferencePhotos] = useState<boolean | null>(null)

  const sourceFilter = innerTab === 'my-media' ? 'upload' : 'ai_generated'

  // Check if user has reference photos
  const checkReferencePhotos = useCallback(async () => {
    const { data } = await supabase
      .from('profiles')
      .select('reference_photo_ids')
      .eq('id', userId)
      .single()

    const ids = (data?.reference_photo_ids as string[] | null) ?? []
    setHasReferencePhotos(ids.length > 0)
  }, [supabase, userId])

  // Load media items filtered by source
  const loadItems = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('content_library')
      .select('*')
      .eq('profile_id', userId)
      .eq('source', sourceFilter)
      .order('created_at', { ascending: false })

    if (data) {
      const withUrls = await Promise.all(
        data.map(async (item) => {
          const thumbPath = item.thumbnail_path ?? item.storage_path
          const { data: signed } = await supabase.storage
            .from('media')
            .createSignedUrl(thumbPath, 3600)

          return {
            ...item,
            signedUrl: signed?.signedUrl ?? null,
          }
        })
      )
      setItems(withUrls)
    } else {
      setItems([])
    }
    setLoading(false)
  }, [supabase, userId, sourceFilter])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  useEffect(() => {
    checkReferencePhotos()
  }, [checkReferencePhotos])

  // Upload handler (same pattern as media-grid)
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

    if (fileType === 'photo') {
      const thumbBlob = await generateImageThumbnail(file)
      if (thumbBlob) {
        thumbnailPath = `${userId}/thumbs/${uuid}.jpg`
        await supabase.storage.from('media').upload(thumbnailPath, thumbBlob)
      }
    }

    const { data: inserted } = await supabase.from('content_library').insert({
      profile_id: userId,
      storage_path: storagePath,
      file_name: file.name,
      file_type: fileType,
      mime_type: file.type,
      file_size: file.size,
      thumbnail_path: thumbnailPath,
      source: 'upload',
      metadata: {},
    }).select('id').single()

    setUploadProgress((prev) => ({ ...prev, current: prev.current + 1 }))
    return inserted?.id ?? null
  }

  async function handleFilesSelected(files: File[]) {
    if (files.length === 0) return
    setUploading(true)
    setUploadProgress({ current: 0, total: files.length })

    const concurrency = 5
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency)
      await Promise.all(batch.map((f) => uploadSingleFile(f)))
    }

    setUploading(false)
    setUploadProgress({ current: 0, total: 0 })
    loadItems()
  }

  function handleGenerate() {
    alert(`[Placeholder] Would generate images with prompt:\n\n"${prompt}"\n\nCost: 5 credits`)
  }

  const progressPct = uploadProgress.total > 0
    ? (uploadProgress.current / uploadProgress.total) * 100
    : 0

  return (
    <div className="space-y-6">
      {/* Inner tab bar */}
      <div className="flex items-center gap-1 border-b border-outline-variant/15 pb-0">
        {([
          { key: 'my-media' as InnerTab, label: 'My Media' },
          { key: 'ai-generated' as InnerTab, label: 'AI Generated' },
        ]).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setInnerTab(key)}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              innerTab === key
                ? 'text-primary'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {label}
            {innerTab === key && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
            )}
          </button>
        ))}

        {/* Generate Images button (My Media tab only) */}
        {innerTab === 'my-media' && (
          <button
            onClick={() => setGenerateOpen(true)}
            className="ml-auto flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
          >
            <Sparkles className="h-4 w-4" />
            Generate Images
          </button>
        )}
      </div>

      {/* My Media tab */}
      {innerTab === 'my-media' && (
        <div className="space-y-6">
          {/* Upload dropzone */}
          <FileDropzone
            accept=".jpg,.jpeg,.png,.webp,.mp4,.mov,.tiff,.cr2,.raw"
            maxFiles={50}
            maxSizeMB={500}
            onFilesAdded={handleFilesSelected}
            className="group relative h-40 rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-lowest flex flex-col items-center justify-center transition-all hover:bg-surface-container-low hover:border-primary/40 cursor-pointer"
          >
            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <ImagePlus className="h-8 w-8 text-primary/40 animate-bounce" />
                <p className="text-sm text-on-surface-variant">
                  Uploading {uploadProgress.current} of {uploadProgress.total} files...
                </p>
                <div className="w-64 h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-300 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                <ImagePlus className="h-8 w-8 text-primary/40 mb-2 group-hover:scale-110 transition-transform" />
                <p className="text-sm text-on-surface-variant font-medium">Drop files or click to upload</p>
                <p className="text-xs text-on-surface-variant/40 mt-1">Photos & videos up to 500MB</p>
              </>
            )}
          </FileDropzone>

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="rounded-full bg-surface-container-high p-4">
                <ImagePlus className="h-6 w-6 text-on-surface-variant" />
              </div>
              <p className="text-sm font-medium text-on-surface-variant">No media yet</p>
              <p className="text-xs text-on-surface-variant/60">Upload some files to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item) => {
                const tags = item.tags ?? []
                return (
                  <div
                    key={item.id}
                    className="group bg-surface-container-low rounded-xl overflow-hidden hover:translate-y-[-2px] transition-all duration-300"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      {item.signedUrl ? (
                        <img
                          alt={item.file_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          src={item.signedUrl}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-surface-container-high">
                          <ImagePlus className="h-8 w-8 text-on-surface-variant/30" />
                        </div>
                      )}
                    </div>
                    <div className="p-3 space-y-1.5">
                      <p className="text-xs font-medium truncate text-on-surface">{item.file_name}</p>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] px-1.5 py-0.5 bg-surface-container-highest text-on-surface-variant/80 rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* AI Generated tab */}
      {innerTab === 'ai-generated' && (
        <div className="space-y-6">
          {/* Setup prompt if no reference photos */}
          {hasReferencePhotos === false && (
            <a
              href="/settings"
              className="flex items-center gap-4 p-6 rounded-xl border border-dashed border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors"
            >
              <div className="rounded-full bg-primary/15 p-3">
                <Camera className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-on-surface">Set up reference photos</p>
                <p className="text-xs text-on-surface-variant mt-0.5">
                  Upload reference photos in Settings so the AI can match your brand style.
                </p>
              </div>
            </a>
          )}

          {/* Grid */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
              <div className="rounded-full bg-surface-container-high p-4">
                <Sparkles className="h-6 w-6 text-on-surface-variant" />
              </div>
              <p className="text-sm font-medium text-on-surface-variant">No AI-generated images yet</p>
              <p className="text-xs text-on-surface-variant/60">
                {hasReferencePhotos
                  ? 'Use the Generate Images button to create new content'
                  : 'Add reference photos in Settings first'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {items.map((item) => {
                const tags = item.tags ?? []
                return (
                  <div
                    key={item.id}
                    className="group bg-surface-container-low rounded-xl overflow-hidden hover:translate-y-[-2px] transition-all duration-300"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      {item.signedUrl ? (
                        <img
                          alt={item.file_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          src={item.signedUrl}
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-surface-container-high">
                          <Sparkles className="h-8 w-8 text-on-surface-variant/30" />
                        </div>
                      )}
                      {/* AI badge */}
                      <span className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/80 text-[10px] font-semibold text-white backdrop-blur-sm">
                        <Sparkles className="h-3 w-3" />
                        AI
                      </span>
                    </div>
                    <div className="p-3 space-y-1.5">
                      <p className="text-xs font-medium truncate text-on-surface">{item.file_name}</p>
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-[9px] px-1.5 py-0.5 bg-surface-container-highest text-on-surface-variant/80 rounded-full"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* Generate Images Modal */}
      <Dialog open={generateOpen} onOpenChange={setGenerateOpen}>
        <DialogContent className="bg-surface-container-low border-outline-variant/15 max-w-lg">
          <div className="space-y-5">
            <div>
              <h3 className="font-display text-xl text-on-surface">Generate Images</h3>
              <p className="text-sm text-on-surface-variant mt-1">
                Describe the images you want to create. The AI will use your brand style and reference photos.
              </p>
            </div>

            {/* Prompt */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-on-surface-variant uppercase tracking-wider">
                Prompt
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the image you want to generate..."
                rows={4}
                className="w-full rounded-lg bg-surface-container-high border-none px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 focus:ring-1 focus:ring-primary resize-none"
              />
            </div>

            {/* Reference photos info */}
            <div className="flex items-center gap-3 p-3 rounded-lg bg-surface-container-high">
              <Camera className="h-4 w-4 text-on-surface-variant shrink-0" />
              <p className="text-xs text-on-surface-variant">
                {hasReferencePhotos
                  ? 'Reference photos will be used to match your brand style.'
                  : 'No reference photos set. Add them in Settings for better results.'}
              </p>
            </div>

            {/* Credit cost */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface-container-high">
              <span className="text-xs text-on-surface-variant">Cost</span>
              <span className="text-sm font-medium text-on-surface">5 credits</span>
            </div>

            {creditBalance !== null && creditBalance < 5 && (
              <p className="text-xs text-error">
                Insufficient credits. You have {creditBalance} credits but need 5.
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setGenerateOpen(false)}
                className="px-4 py-2 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGenerate}
                disabled={!prompt.trim() || !hasReferencePhotos || (creditBalance !== null && creditBalance < 5)}
                className="flex items-center gap-2 px-5 py-2 rounded-full bg-primary text-on-primary text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                <Sparkles className="h-4 w-4" />
                Generate
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Generate image thumbnail (same as media-grid)
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
