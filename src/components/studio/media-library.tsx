'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { SignedMediaItem } from '@/lib/storage'
import { MediaGrid } from '@/components/dashboard/media-grid'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Sparkles, Camera } from 'lucide-react'

interface MediaLibraryProps {
  userId: string
  initialItems: SignedMediaItem[]
  initialCursor: string | null
  totalCount: number
  creditBalance: number | null
}

function useReferencePhotoStatus(userId: string) {
  const [hasReferencePhotos, setHasReferencePhotos] = useState(false)
  const [refCount, setRefCount] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    async function checkRefs() {
      const { data } = await supabase
        .from('profiles')
        .select('reference_photo_ids')
        .eq('id', userId)
        .single()
      const ids = data?.reference_photo_ids ?? []
      setRefCount(ids.length)
      setHasReferencePhotos(ids.length > 0)
    }

    checkRefs()
  }, [userId])

  return { hasReferencePhotos, refCount }
}

function GenerateModal({
  open,
  onOpenChange,
  hasReferencePhotos,
  refCount,
  creditBalance,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  hasReferencePhotos: boolean
  refCount: number
  creditBalance: number | null
}) {
  const [generatePrompt, setGeneratePrompt] = useState('')

  async function handleGenerate() {
    if (!generatePrompt.trim()) return
    // Placeholder — actual fal.ai call comes in B2
    alert('Image generation will be available soon! Your prompt: ' + generatePrompt)
    onOpenChange(false)
    setGeneratePrompt('')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <h3 className="font-display text-xl text-on-surface mb-4">Generate Image</h3>

        <div className="space-y-4">
          <div>
            <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-body block mb-2">
              Describe what you want
            </label>
            <textarea
              value={generatePrompt}
              onChange={(e) => setGeneratePrompt(e.target.value)}
              placeholder="Mirror selfie in hotel bathroom, white lingerie, morning light..."
              className="w-full border-b-2 border-surface-variant bg-transparent px-0 py-2 text-sm text-on-surface font-body placeholder:text-on-surface-variant/50 focus:border-primary focus:outline-none transition-colors resize-none min-h-[80px]"
            />
          </div>

          {hasReferencePhotos ? (
            <div>
              <label className="text-[10px] uppercase tracking-widest text-on-surface-variant font-body block mb-2">
                Reference photos ({refCount} selected)
              </label>
              <p className="text-xs text-on-surface-variant/60">Your reference photos from Settings will be used for body consistency.</p>
            </div>
          ) : (
            <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/10">
              <p className="text-xs text-on-surface-variant">
                <a href="/settings?tab=reference_photos" className="text-primary hover:underline">Set up reference photos</a> in Settings first to enable AI generation.
              </p>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-on-surface-variant">Cost: 1 credit ({creditBalance ?? 0} remaining)</span>
            <button
              onClick={handleGenerate}
              disabled={!generatePrompt.trim() || !hasReferencePhotos || (creditBalance ?? 0) < 1}
              className="gradient-cta text-on-primary font-semibold px-6 py-2 rounded-full text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Generate
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function MediaLibrary({
  userId,
  initialItems,
  initialCursor,
  totalCount,
  creditBalance,
}: MediaLibraryProps) {
  const [innerTab, setInnerTab] = useState<'my_media' | 'ai_generated'>('my_media')
  const [generateOpen, setGenerateOpen] = useState(false)
  const { hasReferencePhotos, refCount } = useReferencePhotoStatus(userId)

  return (
    <div className="space-y-6">
      {/* Tab bar + Generate button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['my_media', 'ai_generated'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setInnerTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-body transition-colors ${
                innerTab === tab
                  ? 'bg-surface-container-high text-on-surface font-medium'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab === 'my_media' ? 'My Media' : 'AI Generated'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setGenerateOpen(true)}
          className="flex items-center gap-2 gradient-cta text-on-primary font-semibold px-4 py-2 rounded-full text-sm"
        >
          <Sparkles className="h-4 w-4" />
          Generate Images
        </button>
      </div>

      {/* AI Generated — reference photo setup prompt if needed */}
      {innerTab === 'ai_generated' && !hasReferencePhotos && (
        <div className="bg-surface-container-low rounded-2xl p-8 text-center border border-outline-variant/10">
          <Camera className="h-10 w-10 text-primary/40 mx-auto mb-4" />
          <h3 className="font-display text-xl text-on-surface mb-2">Set up your reference photos</h3>
          <p className="text-sm text-on-surface-variant max-w-md mx-auto mb-4">
            Select 15-20 photos of yourself to help AI understand your look for generating new images.
          </p>
          <a
            href="/settings?tab=reference_photos"
            className="inline-block gradient-cta text-on-primary font-semibold px-6 py-2.5 rounded-full text-sm"
          >
            Set Up in Settings
          </a>
        </div>
      )}

      {/* The actual media grid */}
      <MediaGrid
        key={innerTab}
        userId={userId}
        sourceFilter={innerTab === 'ai_generated' ? 'ai_generated' : 'upload'}
        initialItems={innerTab === 'my_media' ? initialItems : []}
        initialCursor={innerTab === 'my_media' ? initialCursor : null}
        totalCount={innerTab === 'my_media' ? totalCount : 0}
      />

      <GenerateModal
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        hasReferencePhotos={hasReferencePhotos}
        refCount={refCount}
        creditBalance={creditBalance}
      />
    </div>
  )
}
