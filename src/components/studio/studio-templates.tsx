'use client'

import { Play, TrendingUp } from 'lucide-react'

interface VideoTemplate {
  id: string
  title: string
  description: string
  platform: string
  format_type: string
  engagement_score: number
}

// Placeholder templates until real data flows from research
const PLACEHOLDER_TEMPLATES: VideoTemplate[] = [
  { id: '1', title: 'POV: Getting Ready', description: 'Show your getting ready routine with trending transitions. Jump cuts between outfit changes.', platform: 'instagram', format_type: 'transition', engagement_score: 92 },
  { id: '2', title: 'Day in My Life', description: 'Aesthetic vlog-style content showing your daily routine. Morning to evening flow.', platform: 'tiktok', format_type: 'vlog', engagement_score: 87 },
  { id: '3', title: 'Hotel Room Tour', description: 'Cinematic walkthrough of your hotel room or apartment. Slow panning shots with ambient music.', platform: 'instagram', format_type: 'cinematic', engagement_score: 85 },
  { id: '4', title: 'Outfit of the Day', description: 'Quick outfit showcase with mirror shots and styled poses. Multiple outfit changes.', platform: 'tiktok', format_type: 'fashion', engagement_score: 90 },
  { id: '5', title: 'Travel Montage', description: 'City shots, landmarks, food, and lifestyle clips edited to trending audio.', platform: 'instagram', format_type: 'montage', engagement_score: 88 },
  { id: '6', title: 'Behind the Scenes', description: 'Show your photoshoot process. Setup, styling, final result reveal.', platform: 'tiktok', format_type: 'bts', engagement_score: 83 },
]

interface StudioTemplatesProps {
  onSelectTemplate: (template: VideoTemplate) => void
}

export function StudioTemplates({ onSelectTemplate }: StudioTemplatesProps) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-display text-2xl text-on-surface">Trending Templates</h3>
        <p className="text-sm text-on-surface-variant mt-1">Pick a format and we'll create a custom filming brief for you.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {PLACEHOLDER_TEMPLATES.map((template) => (
          <button
            key={template.id}
            onClick={() => onSelectTemplate(template)}
            className="text-left bg-surface-container-low rounded-2xl overflow-hidden hover:bg-surface-container transition-all group border border-outline-variant/5"
          >
            {/* Preview area */}
            <div className="aspect-video bg-surface-container-highest relative flex items-center justify-center">
              <Play className="h-8 w-8 text-on-surface-variant/20 group-hover:text-primary/60 transition-colors" />
              <div className="absolute top-3 left-3 flex items-center gap-1.5">
                {template.platform === 'instagram' ? (
                  <span className="bg-gradient-to-tr from-[#f09433] via-[#e6683c] to-[#bc1888] text-white text-[9px] font-bold px-2 py-0.5 rounded-full">Reels</span>
                ) : (
                  <span className="bg-black text-white text-[9px] font-bold px-2 py-0.5 rounded-full">TikTok</span>
                )}
              </div>
              <div className="absolute top-3 right-3 flex items-center gap-1 bg-black/50 rounded-full px-2 py-0.5">
                <TrendingUp className="h-3 w-3 text-tertiary" />
                <span className="text-[10px] text-white font-medium">{template.engagement_score}%</span>
              </div>
            </div>

            {/* Info */}
            <div className="p-4 space-y-2">
              <h4 className="font-display text-lg text-on-surface group-hover:text-primary transition-colors">{template.title}</h4>
              <p className="text-xs text-on-surface-variant line-clamp-2">{template.description}</p>
              <span className="inline-block text-[10px] uppercase tracking-wider text-on-surface-variant/60 bg-surface-container-highest rounded-full px-2 py-0.5">
                {template.format_type}
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export type { VideoTemplate }
