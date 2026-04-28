// src/components/dashboard/media-picker.tsx
'use client'

import { useEffect, useState } from 'react'
import type { Database } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { Check, Image, Play } from 'lucide-react'

type MediaItem = Database['public']['Tables']['content_library']['Row']

interface MediaPickerProps {
  userId: string
  selected: string[]
  onSelectionChange: (ids: string[]) => void
}

export function MediaPicker({ userId, selected, onSelectionChange }: MediaPickerProps) {
  const supabase = createClient()
  const [items, setItems] = useState<(MediaItem & { signedUrl: string | null })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('content_library')
        .select('*')
        .eq('profile_id', userId)
        .order('created_at', { ascending: false })

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
    load()
  }, [])

  function toggle(id: string) {
    onSelectionChange(
      selected.includes(id)
        ? selected.filter((s) => s !== id)
        : [...selected, id]
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
        <div className="rounded-full bg-surface-container-high p-3">
          <Image className="h-5 w-5 text-on-surface-variant" />
        </div>
        <p className="text-xs text-on-surface-variant">No media uploaded yet. Upload media in the Library tab.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto rounded-xl">
      {items.map((item) => {
        const isSelected = selected.includes(item.id)
        const isVideo = item.file_type === 'video'
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            className={`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all duration-200 ${
              isSelected ? 'border-primary ring-2 ring-primary/20' : 'border-transparent hover:border-outline-variant/30'
            }`}
          >
            {item.signedUrl ? (
              <img
                src={item.signedUrl}
                alt={item.file_name}
                className="h-full w-full object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-300"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-surface-container-high">
                {isVideo ? (
                  <Play className="h-6 w-6 text-on-surface-variant" />
                ) : (
                  <Image className="h-6 w-6 text-on-surface-variant" />
                )}
              </div>
            )}
            {isSelected && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center backdrop-blur-[1px]">
                <div className="rounded-full bg-primary p-1.5">
                  <Check className="h-3.5 w-3.5 text-on-primary" />
                </div>
              </div>
            )}
            {/* File type badge */}
            <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 bg-black/40 backdrop-blur-md rounded text-[8px] font-bold tracking-tighter uppercase text-white">
              {item.file_type === 'video' ? 'MP4' : 'IMG'}
            </div>
          </button>
        )
      })}
    </div>
  )
}
