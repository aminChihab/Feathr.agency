'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import {
  ChevronDown,
  TrendingUp,
  Lightbulb,
  Target,
  Clock,
  Hash,
  Sparkles,
  Eye,
  MessageCircle,
  Video,
  Camera,
  FileText,
  BarChart3,
} from 'lucide-react'

interface ReportSection {
  id?: string
  section_type: string
  title: string
  content: string
  sort_order: number
}

interface ResearchReportCardProps {
  reportType: string
  title: string
  summary: string | null
  createdAt: string
  sections: ReportSection[]
  defaultOpen?: boolean
}

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const SECTION_ICONS: Record<string, { icon: typeof TrendingUp; color: string }> = {
  trending_hashtags: { icon: TrendingUp, color: 'bg-emerald-500/10 text-emerald-400' },
  reply_opportunities: { icon: MessageCircle, color: 'bg-sky-500/10 text-sky-400' },
  content_ideas: { icon: Lightbulb, color: 'bg-amber-500/10 text-amber-400' },
  competitor_insights: { icon: Eye, color: 'bg-accent/10 text-accent' },
  media_style_tips: { icon: Camera, color: 'bg-purple-500/10 text-purple-400' },
  trending_formats: { icon: Video, color: 'bg-purple-500/10 text-purple-400' },
  content_gaps: { icon: Target, color: 'bg-sky-500/10 text-sky-400' },
  timing: { icon: Clock, color: 'bg-text-muted/10 text-text-muted' },
  hashtags: { icon: Hash, color: 'bg-text-muted/10 text-text-muted' },
  top_posts: { icon: TrendingUp, color: 'bg-emerald-500/10 text-emerald-400' },
  worst_posts: { icon: BarChart3, color: 'bg-status-failed/10 text-status-failed' },
  media_insights: { icon: Camera, color: 'bg-amber-500/10 text-amber-400' },
  recommendations: { icon: Lightbulb, color: 'bg-accent/10 text-accent' },
  general: { icon: FileText, color: 'bg-text-muted/10 text-text-muted' },
}

const REPORT_TYPE_CONFIG: Record<string, { icon: typeof Sparkles; label: string; color: string }> = {
  x_strategy: { icon: MessageCircle, label: 'X/Twitter', color: 'bg-sky-500/10' },
  ig_strategy: { icon: Camera, label: 'Instagram', color: 'bg-purple-500/10' },
  performance: { icon: BarChart3, label: 'Performance', color: 'bg-emerald-500/10' },
}

export function ResearchReportCard({ reportType, title, summary, createdAt, sections, defaultOpen = false }: ResearchReportCardProps) {
  const [expanded, setExpanded] = useState(defaultOpen)

  const config = REPORT_TYPE_CONFIG[reportType] ?? { icon: Sparkles, label: reportType, color: 'bg-accent/10' }
  const sortedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order)

  return (
    <div className="rounded-xl border border-border bg-bg-surface overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-6 py-5 text-left group"
      >
        <div className="flex items-center gap-4">
          <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', config.color)}>
            <config.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-base font-medium text-text-primary">{title}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-text-muted">{relativeDate(createdAt)}</span>
              <span className="text-xs text-text-muted">&middot;</span>
              <span className="text-xs text-text-muted">{sortedSections.length} section{sortedSections.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 text-text-muted transition-transform duration-200',
          expanded && 'rotate-180'
        )} />
      </button>

      {/* Collapsed — section type pills */}
      {!expanded && sortedSections.length > 0 && (
        <div className="flex gap-2 px-6 pb-4 -mt-1 flex-wrap">
          {sortedSections.map((section) => {
            const sConfig = SECTION_ICONS[section.section_type] ?? SECTION_ICONS.general
            return (
              <span key={section.id ?? section.sort_order} className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px]', sConfig.color)}>
                <sConfig.icon className="h-3 w-3" />
                {section.title}
              </span>
            )
          })}
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-6 py-5 space-y-5">
          {/* Summary */}
          {summary && (
            <div className="rounded-lg bg-accent/5 border border-accent/10 p-4">
              <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{summary}</p>
            </div>
          )}

          {/* Sections */}
          {sortedSections.map((section) => {
            const sConfig = SECTION_ICONS[section.section_type] ?? SECTION_ICONS.general
            return (
              <section key={section.id ?? section.sort_order} className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className={cn('flex h-6 w-6 items-center justify-center rounded-md', sConfig.color.split(' ')[0])}>
                    <sConfig.icon className={cn('h-3.5 w-3.5', sConfig.color.split(' ')[1])} />
                  </div>
                  <h4 className="text-sm font-medium text-text-primary">{section.title}</h4>
                </div>
                <div className="rounded-lg bg-bg-base border border-border/50 px-4 py-3">
                  <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">{section.content}</p>
                </div>
              </section>
            )
          })}

          {/* Empty state */}
          {!summary && sortedSections.length === 0 && (
            <p className="text-sm text-text-muted text-center py-4">No content in this report yet.</p>
          )}
        </div>
      )}
    </div>
  )
}
