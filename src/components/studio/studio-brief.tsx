'use client'

import { useState } from 'react'
import { ArrowLeft, Camera, Mic, Film, Clock, ChevronDown, ChevronUp } from 'lucide-react'
import type { VideoTemplate } from './studio-templates'

interface BriefShot {
  number: number
  description: string
  duration: string
  camera: string
  notes?: string
}

interface StudioBriefProps {
  template: VideoTemplate
  onBack: () => void
  onStartEditing: () => void
}

// Generate a placeholder brief based on template
function generateBrief(template: VideoTemplate): { shots: BriefShot[]; script: string; brollNotes: string[] } {
  const briefs: Record<string, { shots: BriefShot[]; script: string; brollNotes: string[] }> = {
    '1': {
      shots: [
        { number: 1, description: 'Close-up of hands picking up phone from nightstand', duration: '2s', camera: 'Close-up, top-down' },
        { number: 2, description: 'Mirror shot — walk towards mirror in robe/towel', duration: '3s', camera: 'Front-facing, mirror' },
        { number: 3, description: 'Quick cuts of getting ready — hair, makeup products', duration: '4s', camera: 'Close-ups, various angles' },
        { number: 4, description: 'Final look reveal — full outfit in mirror', duration: '3s', camera: 'Mirror, full body' },
        { number: 5, description: 'Walking out the door / leaving shot', duration: '2s', camera: 'Back to camera, walking away' },
      ],
      script: 'No voiceover needed. Use trending audio. Text overlay on shot 1: "POV: getting ready for..."',
      brollNotes: ['Insert trending transition meme between shots 3 and 4', 'Optional: sparkle/glitter overlay on final reveal'],
    },
    default: {
      shots: [
        { number: 1, description: 'Opening hook shot — attention-grabbing first frame', duration: '2s', camera: 'Front-facing or dramatic angle' },
        { number: 2, description: 'Context/setup — show the environment or situation', duration: '3s', camera: 'Wide or medium shot' },
        { number: 3, description: 'Main content — the core of what you\'re showing', duration: '5s', camera: 'Varies per content' },
        { number: 4, description: 'Closing shot — call to action or satisfying ending', duration: '2s', camera: 'Front-facing or product shot' },
      ],
      script: 'Add your own voiceover or use trending audio. Consider text overlays for key moments.',
      brollNotes: ['Add B-roll between main shots if needed', 'Consider trending transition effects'],
    },
  }
  return briefs[template.id] ?? briefs.default
}

export function StudioBrief({ template, onBack, onStartEditing }: StudioBriefProps) {
  const brief = generateBrief(template)
  const [expandedShot, setExpandedShot] = useState<number | null>(null)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-4">
        <button onClick={onBack} className="p-2 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors mt-1">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h3 className="font-display text-2xl text-on-surface">{template.title}</h3>
          <p className="text-sm text-on-surface-variant mt-1">{template.description}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Shot List */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center gap-2">
            <Camera className="h-4 w-4 text-primary" />
            <h4 className="text-sm font-semibold text-on-surface uppercase tracking-wider">Shot List</h4>
          </div>

          <div className="space-y-3">
            {brief.shots.map((shot) => (
              <div key={shot.number} className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/5">
                <button
                  onClick={() => setExpandedShot(expandedShot === shot.number ? null : shot.number)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-surface-container-high flex items-center justify-center font-display text-primary text-sm">
                      {shot.number}
                    </span>
                    <span className="text-sm text-on-surface">{shot.description}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 text-xs text-on-surface-variant">
                      <Clock className="h-3 w-3" /> {shot.duration}
                    </span>
                    {expandedShot === shot.number ? <ChevronUp className="h-4 w-4 text-on-surface-variant" /> : <ChevronDown className="h-4 w-4 text-on-surface-variant" />}
                  </div>
                </button>
                {expandedShot === shot.number && (
                  <div className="mt-3 pt-3 border-t border-outline-variant/10 text-xs text-on-surface-variant space-y-1">
                    <p><span className="text-on-surface-variant/60">Camera:</span> {shot.camera}</p>
                    {shot.notes && <p><span className="text-on-surface-variant/60">Notes:</span> {shot.notes}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Script + B-roll */}
        <div className="space-y-6">
          {/* Script */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Mic className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-on-surface uppercase tracking-wider">Script / Voiceover</h4>
            </div>
            <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/5">
              <p className="text-sm text-on-surface-variant leading-relaxed">{brief.script}</p>
            </div>
          </div>

          {/* B-roll */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold text-on-surface uppercase tracking-wider">B-Roll Notes</h4>
            </div>
            <div className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/5 space-y-2">
              {brief.brollNotes.map((note, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                  <p className="text-sm text-on-surface-variant">{note}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Action */}
      <div className="flex justify-end">
        <button onClick={onStartEditing} className="gradient-cta text-on-primary font-semibold px-8 py-3 rounded-full text-sm">
          Start Editing
        </button>
      </div>
    </div>
  )
}
