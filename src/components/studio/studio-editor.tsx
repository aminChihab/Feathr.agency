'use client'

import { useState } from 'react'
import { ArrowLeft, Upload, Type, Play, Save, X, Plus } from 'lucide-react'
import type { VideoTemplate } from './studio-templates'

interface ClipSlot {
  index: number
  description: string
  duration: string
  file: File | null
  previewUrl: string | null
  textOverlay: string
  textPosition: 'top' | 'center' | 'bottom'
}

interface StudioEditorProps {
  template: VideoTemplate
  onBack: () => void
  onSave: () => void
}

export function StudioEditor({ template, onBack, onSave }: StudioEditorProps) {
  const [slots, setSlots] = useState<ClipSlot[]>([
    { index: 0, description: 'Opening hook shot', duration: '2s', file: null, previewUrl: null, textOverlay: '', textPosition: 'center' },
    { index: 1, description: 'Setup / context shot', duration: '3s', file: null, previewUrl: null, textOverlay: '', textPosition: 'top' },
    { index: 2, description: 'Main content', duration: '5s', file: null, previewUrl: null, textOverlay: '', textPosition: 'center' },
    { index: 3, description: 'Closing / reveal', duration: '2s', file: null, previewUrl: null, textOverlay: '', textPosition: 'bottom' },
  ])
  const [editingText, setEditingText] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  function handleFileUpload(index: number, file: File) {
    const url = URL.createObjectURL(file)
    setSlots(prev => prev.map(s => s.index === index ? { ...s, file, previewUrl: url } : s))
  }

  function handleTextChange(index: number, text: string) {
    setSlots(prev => prev.map(s => s.index === index ? { ...s, textOverlay: text } : s))
  }

  function handlePositionChange(index: number, pos: 'top' | 'center' | 'bottom') {
    setSlots(prev => prev.map(s => s.index === index ? { ...s, textPosition: pos } : s))
  }

  function removeClip(index: number) {
    setSlots(prev => prev.map(s => {
      if (s.index === index) {
        if (s.previewUrl) URL.revokeObjectURL(s.previewUrl)
        return { ...s, file: null, previewUrl: null }
      }
      return s
    }))
  }

  async function handleSave() {
    setSaving(true)
    // Placeholder — actual FFmpeg assembly comes in B3
    await new Promise(r => setTimeout(r, 1500))
    setSaving(false)
    onSave()
  }

  const filledSlots = slots.filter(s => s.file !== null).length

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h3 className="font-display text-2xl text-on-surface">Edit: {template.title}</h3>
            <p className="text-sm text-on-surface-variant">{filledSlots}/{slots.length} clips uploaded</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={filledSlots === 0 || saving}
          className="gradient-cta text-on-primary font-semibold px-6 py-2.5 rounded-full text-sm flex items-center gap-2 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save & Create Draft'}
        </button>
      </div>

      {/* Slot timeline */}
      <div className="space-y-4">
        {slots.map((slot) => (
          <div key={slot.index} className="bg-surface-container-low rounded-2xl p-5 border border-outline-variant/5">
            <div className="flex items-start gap-5">
              {/* Slot number */}
              <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center font-display text-primary text-lg shrink-0">
                {slot.index + 1}
              </div>

              {/* Upload area / preview */}
              <div className="w-32 h-20 rounded-lg overflow-hidden bg-surface-container shrink-0 relative group">
                {slot.previewUrl ? (
                  <>
                    {slot.file?.type.startsWith('video/') ? (
                      <video src={slot.previewUrl} className="w-full h-full object-cover" muted />
                    ) : (
                      <img src={slot.previewUrl} alt="" className="w-full h-full object-cover" />
                    )}
                    <button
                      onClick={() => removeClip(slot.index)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="h-3 w-3 text-white" />
                    </button>
                  </>
                ) : (
                  <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer hover:bg-surface-container-high transition-colors">
                    <Upload className="h-5 w-5 text-on-surface-variant/30" />
                    <span className="text-[9px] text-on-surface-variant/30 mt-1">Upload</span>
                    <input
                      type="file"
                      accept="video/*,image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleFileUpload(slot.index, f)
                      }}
                    />
                  </label>
                )}
              </div>

              {/* Description + controls */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-on-surface">{slot.description}</p>
                  <span className="text-xs text-on-surface-variant/60">{slot.duration}</span>
                </div>

                {/* Text overlay */}
                {editingText === slot.index ? (
                  <div className="mt-3 space-y-2">
                    <input
                      value={slot.textOverlay}
                      onChange={(e) => handleTextChange(slot.index, e.target.value)}
                      placeholder="Text overlay..."
                      className="w-full border-b-2 border-surface-variant bg-transparent px-0 py-1 text-sm text-on-surface font-body placeholder:text-on-surface-variant/40 focus:border-primary focus:outline-none"
                    />
                    <div className="flex items-center gap-2">
                      {(['top', 'center', 'bottom'] as const).map(pos => (
                        <button
                          key={pos}
                          onClick={() => handlePositionChange(slot.index, pos)}
                          className={`text-[10px] px-2 py-1 rounded-full transition-colors ${
                            slot.textPosition === pos ? 'bg-primary/15 text-primary' : 'text-on-surface-variant/50 hover:text-on-surface-variant'
                          }`}
                        >
                          {pos}
                        </button>
                      ))}
                      <button onClick={() => setEditingText(null)} className="ml-auto text-xs text-primary">Done</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setEditingText(slot.index)}
                    className="mt-2 flex items-center gap-1.5 text-xs text-on-surface-variant/50 hover:text-on-surface-variant transition-colors"
                  >
                    <Type className="h-3 w-3" />
                    {slot.textOverlay || 'Add text overlay'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Preview hint */}
      {filledSlots > 0 && (
        <div className="text-center py-4">
          <p className="text-xs text-on-surface-variant/40">Preview will be available after saving. The AI will assemble your clips with transitions and B-roll.</p>
        </div>
      )}
    </div>
  )
}
