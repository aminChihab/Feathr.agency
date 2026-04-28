'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Camera, X } from 'lucide-react'

interface ReferencePhotoUploadProps {
  userId: string
}

interface PhotoSlot {
  type: 'face' | 'body_front' | 'body_full'
  label: string
  hint: string
  path: string | null
  signedUrl: string | null
}

export function ReferencePhotoUpload({ userId }: ReferencePhotoUploadProps) {
  const supabase = createClient()
  const [slots, setSlots] = useState<PhotoSlot[]>([
    { type: 'face', label: 'Face (Front)', hint: 'Looking straight at camera', path: null, signedUrl: null },
    { type: 'body_front', label: 'Full Body (Front)', hint: 'Standing, front-facing', path: null, signedUrl: null },
    { type: 'body_full', label: 'Full Body', hint: 'Any angle, full body visible', path: null, signedUrl: null },
  ])
  const [uploading, setUploading] = useState<string | null>(null)
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  // Load existing reference photos on mount
  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('profiles')
        .select('reference_photo_ids')
        .eq('id', userId)
        .single()

      const refs = (data?.reference_photo_ids as any[]) ?? []
      if (refs.length === 0) return

      const updatedSlots: PhotoSlot[] = [
        { type: 'face', label: 'Face (Front)', hint: 'Looking straight at camera', path: null, signedUrl: null },
        { type: 'body_front', label: 'Full Body (Front)', hint: 'Standing, front-facing', path: null, signedUrl: null },
        { type: 'body_full', label: 'Full Body', hint: 'Any angle, full body visible', path: null, signedUrl: null },
      ]

      for (const ref of refs) {
        if (typeof ref === 'object' && ref.type && ref.path) {
          const idx = updatedSlots.findIndex((s) => s.type === ref.type)
          if (idx !== -1) {
            const { data: signed } = await supabase.storage.from('media').createSignedUrl(ref.path, 3600)
            updatedSlots[idx] = { ...updatedSlots[idx], path: ref.path, signedUrl: signed?.signedUrl ?? null }
          }
        }
      }
      setSlots(updatedSlots)
    }
    load()
  }, [userId])

  async function handleUpload(slotType: string, file: File) {
    setUploading(slotType)
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const storagePath = `${userId}/reference/${slotType}.${ext}`

    // Upload (upsert)
    await supabase.storage.from('media').upload(storagePath, file, { upsert: true })

    // Get signed URL
    const { data: signed } = await supabase.storage.from('media').createSignedUrl(storagePath, 3600)

    // Update slot state immediately
    setSlots((prev) =>
      prev.map((s) => (s.type === slotType ? { ...s, path: storagePath, signedUrl: signed?.signedUrl ?? null } : s))
    )

    // Persist to profiles (use functional updater to get latest slots)
    await persistPathsWithChange(slotType, storagePath)

    // If face photo, store path in settings.avatar_path (no avatar_url column in DB)
    if (slotType === 'face') {
      const { data: profileData } = await supabase.from('profiles').select('settings').eq('id', userId).single()
      const currentSettings = (profileData?.settings as any) ?? {}
      await supabase.from('profiles').update({
        settings: { ...currentSettings, avatar_path: storagePath },
      }).eq('id', userId)
    }

    setUploading(null)
  }

  async function handleRemove(slotType: string) {
    const slot = slots.find((s) => s.type === slotType)
    if (slot?.path) {
      await supabase.storage.from('media').remove([slot.path])
    }
    setSlots((prev) => prev.map((s) => (s.type === slotType ? { ...s, path: null, signedUrl: null } : s)))
    await persistPathsWithChange(slotType, null)
  }

  async function persistPathsWithChange(changedType: string, newPath: string | null) {
    // Read current slots from state (note: this is called just after setSlots so we use the pre-update values + the new change)
    setSlots((prev) => {
      const toSave = prev
        .map((s) => (s.type === changedType ? { type: s.type, path: newPath } : { type: s.type, path: s.path }))
        .filter((s) => s.path !== null)

      // Fire-and-forget persist
      supabase.from('profiles').update({
        reference_photo_ids: toSave as any,
      }).eq('id', userId).then(() => {})

      return prev.map((s) => (s.type === changedType ? { ...s, path: newPath } : s))
    })
  }

  return (
    <div className="space-y-6">
      {/* Photo slots */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {slots.map((slot) => (
          <div key={slot.type} className="relative">
            <input
              ref={(el) => { fileInputRefs.current[slot.type] = el }}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleUpload(slot.type, file)
                e.target.value = ''
              }}
            />

            {slot.signedUrl ? (
              /* Filled state */
              <div
                className="relative aspect-[3/4] rounded-xl overflow-hidden cursor-pointer group"
                onClick={() => fileInputRefs.current[slot.type]?.click()}
              >
                <img src={slot.signedUrl} alt={slot.label} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <p className="text-sm text-white font-medium">Replace</p>
                </div>
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                  <p className="text-xs text-white font-medium">{slot.label}</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleRemove(slot.type) }}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-red-500 transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
              /* Empty state */
              <button
                onClick={() => fileInputRefs.current[slot.type]?.click()}
                disabled={uploading === slot.type}
                className="w-full aspect-[3/4] rounded-xl border-2 border-dashed border-outline-variant/30 hover:border-primary/40 flex flex-col items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {uploading === slot.type ? (
                  <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : (
                  <>
                    <Camera className="h-8 w-8 text-on-surface-variant/30" />
                    <p className="text-sm font-medium text-on-surface-variant">{slot.label}</p>
                    <p className="text-xs text-on-surface-variant/40">{slot.hint}</p>
                  </>
                )}
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Tips */}
      <div className="bg-surface-container-low rounded-xl p-4">
        <p className="text-xs font-medium text-on-surface-variant mb-2">For best results:</p>
        <ul className="space-y-1 text-xs text-on-surface-variant/60">
          <li>• Real, high quality, high resolution photos</li>
          <li>• Face and open eyes clearly visible</li>
          <li>• Tattoos clearly shown in every photo</li>
          <li>• Tattoos or beauty spots on the same side in every photo</li>
          <li>• Clearly show body shape in body images</li>
        </ul>
      </div>
    </div>
  )
}
