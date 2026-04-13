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
  Share2,
  Bookmark,
  ArrowRight,
  Zap,
  Activity,
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
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

const SECTION_ICONS: Record<string, { icon: typeof TrendingUp; color: string }> = {
  trending_hashtags: { icon: TrendingUp, color: 'bg-emerald-500/10 text-emerald-400' },
  reply_opportunities: { icon: MessageCircle, color: 'bg-sky-500/10 text-sky-400' },
  content_ideas: { icon: Lightbulb, color: 'bg-amber-500/10 text-amber-400' },
  competitor_insights: { icon: Eye, color: 'bg-primary/10 text-primary' },
  media_style_tips: { icon: Camera, color: 'bg-purple-500/10 text-purple-400' },
  trending_formats: { icon: Video, color: 'bg-purple-500/10 text-purple-400' },
  content_gaps: { icon: Target, color: 'bg-sky-500/10 text-sky-400' },
  timing: { icon: Clock, color: 'bg-on-surface-variant/10 text-on-surface-variant' },
  hashtags: { icon: Hash, color: 'bg-on-surface-variant/10 text-on-surface-variant' },
  top_posts: { icon: TrendingUp, color: 'bg-emerald-500/10 text-emerald-400' },
  worst_posts: { icon: BarChart3, color: 'bg-error/10 text-error' },
  media_insights: { icon: Camera, color: 'bg-amber-500/10 text-amber-400' },
  recommendations: { icon: Lightbulb, color: 'bg-primary/10 text-primary' },
  general: { icon: FileText, color: 'bg-on-surface-variant/10 text-on-surface-variant' },
}

const REPORT_TYPE_CONFIG: Record<string, { icon: typeof Sparkles; label: string; color: string; badgeLabel: string; badgeColor: string }> = {
  x_strategy: { icon: BarChart3, label: 'Platform Update', color: 'bg-sky-500/10', badgeLabel: 'Alert', badgeColor: 'text-error' },
  ig_strategy: { icon: Camera, label: 'Content Research', color: 'bg-purple-500/10', badgeLabel: 'Growth', badgeColor: 'text-tertiary' },
  performance: { icon: BarChart3, label: 'Performance', color: 'bg-emerald-500/10', badgeLabel: 'Analysis', badgeColor: 'text-primary' },
}

export function ResearchReportCard({ reportType, title, summary, createdAt, sections, defaultOpen = false }: ResearchReportCardProps) {
  const [expanded, setExpanded] = useState(defaultOpen)

  const config = REPORT_TYPE_CONFIG[reportType] ?? { icon: Sparkles, label: reportType, color: 'bg-primary/10', badgeLabel: 'Analysis', badgeColor: 'text-primary' }
  const sortedSections = [...sections].sort((a, b) => a.sort_order - b.sort_order)

  // Pick up to 3 sections for the 3-column breakdown when expanded
  const breakdownSections = sortedSections.slice(0, 3)

  // Expanded card (first/defaultOpen card — full analysis layout)
  if (expanded) {
    return (
      <div className="bg-surface-container-low rounded-xl overflow-hidden">
        <div className="p-8">
          {/* Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] bg-primary/10 px-2 py-0.5 rounded">
                  Analysis
                </span>
                <span className="text-xs text-on-surface-variant/60 font-medium tracking-wide italic">
                  {relativeDate(createdAt)}
                </span>
              </div>
              <h3 className="font-display text-3xl leading-tight">{title}</h3>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 text-on-surface-variant hover:text-on-surface transition-colors">
                <Share2 className="h-5 w-5" />
              </button>
              <button className="p-2 text-on-surface-variant hover:text-on-surface transition-colors">
                <Bookmark className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* 3-column breakdown */}
          {breakdownSections.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {breakdownSections.map((section) => (
                <div key={section.id ?? section.sort_order} className="bg-surface-container p-4 rounded-lg">
                  <p className="text-[10px] text-on-surface-variant/50 font-bold uppercase mb-1">
                    {section.section_type.replace(/_/g, ' ')}
                  </p>
                  <p className="text-sm font-semibold">{section.title}</p>
                  <p className="text-[11px] text-on-surface-variant mt-1 leading-snug line-clamp-2">
                    {section.content}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Summary / analysis text */}
          {summary && (
            <div className="prose prose-invert prose-sm max-w-none text-on-surface-variant/80">
              <p>{summary}</p>
            </div>
          )}

          {/* Remaining sections if more than 3 */}
          {sortedSections.length > 3 && (
            <div className="border-t border-outline-variant/10 pt-5 mt-5 space-y-5">
              {sortedSections.slice(3).map((section) => {
                const sConfig = SECTION_ICONS[section.section_type] ?? SECTION_ICONS.general
                return (
                  <section key={section.id ?? section.sort_order} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={cn('flex h-6 w-6 items-center justify-center rounded-md', sConfig.color.split(' ')[0])}>
                        <sConfig.icon className={cn('h-3.5 w-3.5', sConfig.color.split(' ')[1])} />
                      </div>
                      <h4 className="text-sm font-medium text-on-surface">{section.title}</h4>
                    </div>
                    <div className="rounded-lg bg-surface-container px-4 py-3">
                      <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">{section.content}</p>
                    </div>
                  </section>
                )
              })}
            </div>
          )}

          {/* Empty state */}
          {!summary && sortedSections.length === 0 && (
            <p className="text-sm text-on-surface-variant/60 text-center py-4">No content in this report yet.</p>
          )}
        </div>

        {/* Footer bar */}
        <div className="bg-surface-container px-8 py-4 flex justify-between items-center">
          <div className="flex -space-x-2">
            <div className="w-6 h-6 rounded-full border-2 border-surface bg-primary/20 flex items-center justify-center">
              <Zap className="h-2.5 w-2.5" />
            </div>
            <div className="w-6 h-6 rounded-full border-2 border-surface bg-on-tertiary-container flex items-center justify-center">
              <Activity className="h-2.5 w-2.5" />
            </div>
          </div>
          <button
            onClick={() => setExpanded(false)}
            className="text-xs font-semibold text-on-surface hover:text-primary transition-colors flex items-center gap-1"
          >
            View Full Competitor Breakdown
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    )
  }

  // Collapsed / compact card
  return (
    <div
      className="bg-surface-container-low rounded-xl p-8 hover:bg-surface-container transition-colors cursor-pointer group"
      onClick={() => setExpanded(true)}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className={cn(
            'w-14 h-14 rounded-lg flex items-center justify-center group-hover:scale-105 transition-transform bg-surface-container-highest',
          )}>
            <config.icon className={cn('h-6 w-6', reportType === 'ig_strategy' ? 'text-[#E1306C]' : 'text-primary')} />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-bold text-on-surface-variant/50 uppercase tracking-widest">
                {config.label}
              </span>
              <span className="w-1 h-1 rounded-full bg-surface-variant" />
              <span className="text-[10px] text-on-surface-variant">{relativeDate(createdAt)}</span>
            </div>
            <h4 className="font-display text-xl">{title}</h4>
          </div>
        </div>
        <div className="text-right">
          <p className={cn('text-[10px] font-bold uppercase tracking-widest mb-1', config.badgeColor)}>
            {config.badgeLabel}
          </p>
          <div className="flex items-center gap-2 text-on-surface-variant">
            {summary && <span className="text-xs line-clamp-1 max-w-[200px]">{summary}</span>}
            <ChevronDown className="h-4 w-4 shrink-0" />
          </div>
        </div>
      </div>
    </div>
  )
}
