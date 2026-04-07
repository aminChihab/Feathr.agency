// src/components/dashboard/media-picker.tsx
'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type MediaItem = Database['public']['Tables']['content_library']['Row']

interface MediaPickerProps {
  supabase: SupabaseClient<Database>
  userId: string
  selected: string[]
  onSelectionChange: (ids: string[]) => void
}

export function MediaPicker({ supabase, userId, selected, onSelectionChange }: MediaPickerProps) {
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
    return <p className="text-sm text-text-muted py-4 text-center">Loading media...</p>
  }

  if (items.length === 0) {
    return <p className="text-sm text-text-muted py-4 text-center">No media uploaded yet. Upload media in the Library tab.</p>
  }

  return (
    <div className="grid grid-cols-4 gap-2 max-h-60 overflow-y-auto">
      {items.map((item) => {
        const isSelected = selected.includes(item.id)
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => toggle(item.id)}
            className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-colors ${
              isSelected ? 'border-accent' : 'border-transparent'
            }`}
          >
            {item.signedUrl ? (
              <img src={item.signedUrl} alt={item.file_name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-bg-elevated text-lg">
                {item.file_type === 'video' ? '🎬' : '📷'}
              </div>
            )}
            {isSelected && (
              <div className="absolute inset-0 bg-accent/20 flex items-center justify-center">
                <span className="text-white text-lg">✓</span>
              </div>
            )}
          </button>
        )
      })}
    </div>
  )
}
