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
} from 'lucide-react'

interface ResearchReportCardProps {
  type: string
  title: string
  createdAt: string
  body: any
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

function getSectionCount(body: any): { topics: number; ideas: number; competitors: number; gaps: number } {
  return {
    topics: body.trending_topics?.length ?? 0,
    ideas: body.content_ideas?.length ?? 0,
    competitors: body.competitor_strategies?.length ?? 0,
    gaps: body.content_gaps?.length ?? 0,
  }
}

function isAgentReport(body: any): boolean {
  return !!(body.summary || body.content_ideas || body.trending_topics || body.competitor_strategies ||
    body.type === 'x_strategy' || body.type === 'ig_strategy' || body.type === 'performance' ||
    body.reply_opportunities || body.trending_formats || body.top_posts)
}

export function ResearchReportCard({ type, title, createdAt, body, defaultOpen = false }: ResearchReportCardProps) {
  const [expanded, setExpanded] = useState(defaultOpen)
  const counts = getSectionCount(body)
  const totalInsights = counts.topics + counts.ideas + counts.competitors + counts.gaps

  return (
    <div className="rounded-xl border border-border bg-bg-surface overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-6 py-5 text-left group"
      >
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10">
            <Sparkles className="h-5 w-5 text-accent" />
          </div>
          <div>
            <p className="text-base font-medium text-text-primary">{title}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-text-muted">{relativeDate(createdAt)}</span>
              <span className="text-xs text-text-muted">·</span>
              <span className="text-xs text-text-muted">{totalInsights} insights</span>
            </div>
          </div>
        </div>
        <ChevronDown className={cn(
          'h-4 w-4 text-text-muted transition-transform duration-200',
          expanded && 'rotate-180'
        )} />
      </button>

      {/* Stat pills - always visible */}
      {!expanded && totalInsights > 0 && (
        <div className="flex gap-2 px-6 pb-4 -mt-1">
          {counts.topics > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-400">
              <TrendingUp className="h-3 w-3" /> {counts.topics} trends
            </span>
          )}
          {counts.ideas > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-400">
              <Lightbulb className="h-3 w-3" /> {counts.ideas} ideas
            </span>
          )}
          {counts.competitors > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-[11px] text-accent">
              <Eye className="h-3 w-3" /> {counts.competitors} competitors
            </span>
          )}
          {counts.gaps > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 px-2.5 py-1 text-[11px] text-sky-400">
              <Target className="h-3 w-3" /> {counts.gaps} opportunities
            </span>
          )}
        </div>
      )}

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-border px-6 py-5 space-y-6">
          {/* Summary */}
          {body.summary && (
            <div className="rounded-lg bg-accent/5 border border-accent/10 p-4">
              <p className="text-sm text-text-primary leading-relaxed">{body.summary}</p>
            </div>
          )}

          {/* Trending Topics */}
          {counts.topics > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <h4 className="text-sm font-medium text-text-primary">Trending Topics</h4>
                <span className="text-[10px] text-text-muted bg-bg-base rounded-full px-2 py-0.5">{counts.topics}</span>
              </div>
              <div className="grid gap-2">
                {body.trending_topics.map((topic: any, i: number) => (
                  <div key={i} className="rounded-lg bg-bg-base px-4 py-3 border border-border/50">
                    <p className="text-sm font-medium text-text-primary">{topic.topic}</p>
                    <p className="text-xs text-text-secondary mt-1">{topic.signal}</p>
                    {topic.relevance && (
                      <p className="text-xs text-emerald-400 mt-1.5">{topic.relevance}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Content Ideas */}
          {counts.ideas > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10">
                  <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <h4 className="text-sm font-medium text-text-primary">Content Ideas</h4>
                <span className="text-[10px] text-text-muted bg-bg-base rounded-full px-2 py-0.5">{counts.ideas}</span>
              </div>
              <div className="grid gap-2">
                {body.content_ideas.map((idea: any, i: number) => (
                  <div key={i} className="rounded-lg bg-bg-base px-4 py-3 border border-border/50">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-text-primary">{idea.idea}</p>
                      {idea.format && (
                        <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
                          {idea.format}
                        </span>
                      )}
                    </div>
                    {idea.example_caption && (
                      <p className="text-xs text-text-secondary italic border-l-2 border-accent/20 pl-3 mt-2">
                        &ldquo;{idea.example_caption}&rdquo;
                      </p>
                    )}
                    {idea.expected_outcome && (
                      <p className="text-[11px] text-text-muted mt-2">{idea.expected_outcome}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Competitor Strategies */}
          {counts.competitors > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-accent/10">
                  <Eye className="h-3.5 w-3.5 text-accent" />
                </div>
                <h4 className="text-sm font-medium text-text-primary">Competitor Strategies</h4>
                <span className="text-[10px] text-text-muted bg-bg-base rounded-full px-2 py-0.5">{counts.competitors}</span>
              </div>
              <div className="grid gap-2">
                {body.competitor_strategies.map((comp: any, i: number) => (
                  <div key={i} className="rounded-lg bg-bg-base px-4 py-3 border border-border/50">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-sm font-medium text-text-primary">@{comp.handle}</p>
                      {comp.followers > 0 && (
                        <span className="text-[10px] text-text-muted">{comp.followers.toLocaleString()} followers</span>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary">{comp.what_works}</p>
                    {comp.takeaway && (
                      <p className="text-xs text-accent mt-1.5">{comp.takeaway}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Content Gaps */}
          {counts.gaps > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10">
                  <Target className="h-3.5 w-3.5 text-sky-400" />
                </div>
                <h4 className="text-sm font-medium text-text-primary">Opportunities</h4>
                <span className="text-[10px] text-text-muted bg-bg-base rounded-full px-2 py-0.5">{counts.gaps}</span>
              </div>
              <div className="grid gap-2">
                {body.content_gaps.map((gap: any, i: number) => (
                  <div key={i} className="rounded-lg bg-bg-base px-4 py-3 border border-border/50">
                    <p className="text-sm font-medium text-text-primary">{gap.gap}</p>
                    <p className="text-xs text-text-secondary mt-1">{gap.detail}</p>
                    {gap.opportunity && (
                      <p className="text-xs text-sky-400 mt-1.5">{gap.opportunity}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Timing & Hashtags - side by side */}
          {(body.timing_recommendations || body.hashtag_recommendations) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {body.timing_recommendations && (
                <div className="rounded-lg bg-bg-base border border-border/50 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Clock className="h-3.5 w-3.5 text-text-muted" />
                    <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider">Best Timing</h4>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-text-muted">Times</span>
                      <span className="text-text-primary text-right">{body.timing_recommendations.best_times}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Days</span>
                      <span className="text-text-primary text-right">{body.timing_recommendations.best_days}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Frequency</span>
                      <span className="text-text-primary text-right">{body.timing_recommendations.frequency}</span>
                    </div>
                  </div>
                </div>
              )}

              {body.hashtag_recommendations && (
                <div className="rounded-lg bg-bg-base border border-border/50 px-4 py-3">
                  <div className="flex items-center gap-2 mb-2.5">
                    <Hash className="h-3.5 w-3.5 text-text-muted" />
                    <h4 className="text-xs font-medium text-text-muted uppercase tracking-wider">Hashtags</h4>
                  </div>
                  {body.hashtag_recommendations.primary_discovery && (
                    <div className="flex flex-wrap gap-1.5">
                      {body.hashtag_recommendations.primary_discovery.map((tag: string, i: number) => (
                        <span key={i} className="rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] text-accent">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {body.hashtag_recommendations.notes && (
                    <p className="text-[11px] text-text-muted mt-2">{body.hashtag_recommendations.notes}</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Reply Opportunities (X Strategy) */}
          {body.reply_opportunities?.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10">
                  <MessageCircle className="h-3.5 w-3.5 text-sky-400" />
                </div>
                <h4 className="text-sm font-medium text-text-primary">Reply Opportunities</h4>
              </div>
              <div className="grid gap-2">
                {body.reply_opportunities.map((opp: any, i: number) => (
                  <div key={i} className="rounded-lg bg-bg-base px-4 py-3 border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-text-primary">{opp.author}</span>
                      {opp.tweet_url && (
                        <a href={opp.tweet_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">View tweet</a>
                      )}
                    </div>
                    <p className="text-xs text-text-secondary">{opp.why}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Trending Formats (IG Strategy) */}
          {body.trending_formats?.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/10">
                  <Video className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <h4 className="text-sm font-medium text-text-primary">Trending Formats</h4>
              </div>
              <div className="grid gap-2">
                {body.trending_formats.map((fmt: any, i: number) => (
                  <div key={i} className="rounded-lg bg-bg-base px-4 py-3 border border-border/50">
                    <p className="text-sm font-medium text-text-primary">{fmt.format}</p>
                    <p className="text-xs text-text-secondary mt-1">{fmt.why}</p>
                    {fmt.example_accounts?.length > 0 && <p className="text-xs text-accent mt-1">{fmt.example_accounts.join(', ')}</p>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Media Style Tips (IG Strategy) */}
          {body.media_style_tips?.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10">
                  <Camera className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <h4 className="text-sm font-medium text-text-primary">Media Style Tips</h4>
              </div>
              <div className="grid gap-2">
                {body.media_style_tips.map((tip: any, i: number) => (
                  <div key={i} className="rounded-lg bg-bg-base px-4 py-3 border border-border/50">
                    <p className="text-sm text-text-primary">{tip.tip}</p>
                    <p className="text-xs text-text-muted mt-1">{tip.based_on}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Top Posts (Performance) */}
          {body.top_posts?.length > 0 && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <h4 className="text-sm font-medium text-text-primary">Top Performing Posts</h4>
              </div>
              <div className="grid gap-2">
                {body.top_posts.map((post: any, i: number) => (
                  <div key={i} className="rounded-lg bg-bg-base px-4 py-3 border border-border/50">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-text-muted">{post.platform}</span>
                      <span className="text-xs font-medium text-emerald-400">{post.engagement} engagement</span>
                    </div>
                    <p className="text-sm text-text-primary">{post.caption_preview}</p>
                    <p className="text-xs text-text-secondary mt-1">{post.why}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Growth Status (Performance) */}
          {body.growth_status && (
            <div className="rounded-lg bg-bg-base border border-border/50 px-4 py-3 text-center">
              <span className="text-xs text-text-muted">Growth status: </span>
              <span className={`text-xs font-medium ${
                body.growth_status === 'growing' ? 'text-emerald-400' :
                body.growth_status === 'declining' ? 'text-status-failed' : 'text-text-secondary'
              }`}>{body.growth_status}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
