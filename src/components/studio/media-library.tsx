'use client'

import { useState } from 'react'
import type { SignedMediaItem } from '@/lib/storage'
import { MediaGrid } from '@/components/dashboard/media-grid'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Upload } from 'lucide-react'

interface MediaLibraryProps {
  userId: string
  initialItems: SignedMediaItem[]
  initialCursor: string | null
  totalCount: number
  creditBalance: number | null
}

export function MediaLibrary({
  userId,
  initialItems,
  initialCursor,
  totalCount,
}: MediaLibraryProps) {
  const [innerTab, setInnerTab] = useState<'uploads' | 'ai_creations'>('uploads')
  const [uploadOpen, setUploadOpen] = useState(false)

  return (
    <div className="space-y-6">
      {/* Tab bar + Upload button */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {(['uploads', 'ai_creations'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setInnerTab(tab)}
              className={`px-4 py-2 rounded-full text-sm font-body transition-colors ${
                innerTab === tab
                  ? 'bg-surface-container-high text-on-surface font-medium'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {tab === 'uploads' ? 'Uploads' : 'AI Creations'}
            </button>
          ))}
        </div>

        <button
          onClick={() => setUploadOpen(true)}
          className="flex items-center gap-2 gradient-cta text-on-primary font-semibold px-4 py-2 rounded-full text-sm"
        >
          <Upload className="h-4 w-4" />
          Upload Media
        </button>
      </div>

      {/* The actual media grid */}
      <MediaGrid
        key={innerTab}
        userId={userId}
        sourceFilter={innerTab === 'ai_creations' ? 'ai_generated' : 'upload'}
        initialItems={innerTab === 'uploads' ? initialItems : []}
        initialCursor={innerTab === 'uploads' ? initialCursor : null}
        totalCount={innerTab === 'uploads' ? totalCount : 0}
      />

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-lg">
          <h3 className="text-lg font-medium text-white mb-4">Upload Media</h3>
          <div className="h-48 rounded-xl border border-dashed border-outline-variant/30 bg-surface-container-lowest flex flex-col items-center justify-center hover:bg-surface-container-low hover:border-primary/40 cursor-pointer transition-all">
            <Upload className="h-10 w-10 text-primary/40 mb-3" />
            <p className="text-sm text-on-surface-variant">Drop files here or click to browse</p>
            <p className="text-xs text-on-surface-variant/40 mt-1">JPG, PNG, WebP, MP4, MOV up to 500MB</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
