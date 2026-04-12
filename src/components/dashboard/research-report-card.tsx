'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, ExternalLink, TrendingUp, Users, FileText, Lightbulb, Target, Clock, Hash } from 'lucide-react'

interface ResearchReportCardProps {
  type: string
  title: string
  createdAt: string
  body: any
}

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function isAgentReport(body: any): boolean {
  return !!(body.summary || body.content_ideas || body.trending_topics || body.competitor_strategies)
}

function getItemCount(body: any): number {
  if (isAgentReport(body)) {
    return (body.trending_topics?.length ?? 0) +
      (body.content_ideas?.length ?? 0) +
      (body.competitor_strategies?.length ?? 0) +
      (body.content_gaps?.length ?? 0)
  }
  const tweets = body.tweets ?? body.recent_tweets ?? []
  return tweets.length
}

export function ResearchReportCard({ type, title, createdAt, body }: ResearchReportCardProps) {
  const [expanded, setExpanded] = useState(false)

  const isTrend = type === 'trend'
  const isAgent = isAgentReport(body)
  const itemCount = getItemCount(body)

  return (
    <div className="rounded-lg border border-border bg-bg-surface">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg',
            isAgent ? 'bg-accent/15' : isTrend ? 'bg-status-approved/15' : 'bg-accent/15'
          )}>
            {isAgent ? <FileText className="h-4 w-4 text-accent" /> :
             isTrend ? <TrendingUp className="h-4 w-4 text-status-approved" /> :
             <Users className="h-4 w-4 text-accent" />}
          </div>
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-[10px] text-text-muted">{relativeDate(createdAt)} · {itemCount} items</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {/* Agent-generated report */}
          {isAgent && (
            <>
              {/* Summary */}
              {body.summary && (
                <div className="rounded-lg bg-bg-base p-4">
                  <p className="text-sm text-text-primary leading-relaxed">{body.summary}</p>
                </div>
              )}

              {/* Trending Topics */}
              {body.trending_topics?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-status-approved" />
                    <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted">Trending Topics</h4>
                  </div>
                  {body.trending_topics.map((topic: any, i: number) => (
                    <div key={i} className="rounded-lg bg-bg-base px-4 py-3 space-y-1">
                      <p className="text-sm font-medium text-text-primary">{topic.topic}</p>
                      <p className="text-xs text-text-secondary">{topic.signal}</p>
                      <p className="text-xs text-accent">{topic.relevance}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Content Ideas */}
              {body.content_ideas?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="h-3.5 w-3.5 text-status-draft" />
                    <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted">Content Ideas</h4>
                  </div>
                  {body.content_ideas.map((idea: any, i: number) => (
                    <div key={i} className="rounded-lg bg-bg-base px-4 py-3 space-y-2">
                      <p className="text-sm font-medium text-text-primary">{idea.idea}</p>
                      <p className="text-xs text-text-secondary">{idea.format}</p>
                      {idea.example_caption && (
                        <p className="text-xs text-text-primary italic border-l-2 border-accent/30 pl-3">
                          &ldquo;{idea.example_caption}&rdquo;
                        </p>
                      )}
                      <p className="text-[10px] text-text-muted">{idea.expected_outcome}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Competitor Strategies */}
              {body.competitor_strategies?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-accent" />
                    <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted">Competitor Strategies</h4>
                  </div>
                  {body.competitor_strategies.map((comp: any, i: number) => (
                    <div key={i} className="rounded-lg bg-bg-base px-4 py-3 space-y-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-text-primary">@{comp.handle}</p>
                        <span className="text-[10px] text-text-muted">{(comp.followers ?? 0).toLocaleString()} followers</span>
                      </div>
                      <p className="text-xs text-text-secondary">{comp.what_works}</p>
                      <p className="text-xs text-accent">{comp.takeaway}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Content Gaps */}
              {body.content_gaps?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-status-scheduled" />
                    <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted">Content Gaps &amp; Opportunities</h4>
                  </div>
                  {body.content_gaps.map((gap: any, i: number) => (
                    <div key={i} className="rounded-lg bg-bg-base px-4 py-3 space-y-1">
                      <p className="text-sm font-medium text-text-primary">{gap.gap}</p>
                      <p className="text-xs text-text-secondary">{gap.detail}</p>
                      <p className="text-xs text-status-scheduled">{gap.opportunity}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Timing & Hashtags */}
              {body.timing_recommendations && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-text-muted" />
                    <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted">Timing</h4>
                  </div>
                  <div className="rounded-lg bg-bg-base px-4 py-3 text-xs space-y-1">
                    <p><span className="text-text-muted">Best times:</span> <span className="text-text-primary">{body.timing_recommendations.best_times}</span></p>
                    <p><span className="text-text-muted">Best days:</span> <span className="text-text-primary">{body.timing_recommendations.best_days}</span></p>
                    <p><span className="text-text-muted">Frequency:</span> <span className="text-text-primary">{body.timing_recommendations.frequency}</span></p>
                  </div>
                </div>
              )}

              {body.hashtag_recommendations && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Hash className="h-3.5 w-3.5 text-text-muted" />
                    <h4 className="text-xs font-medium uppercase tracking-wider text-text-muted">Hashtags</h4>
                  </div>
                  <div className="rounded-lg bg-bg-base px-4 py-3 text-xs space-y-2">
                    {body.hashtag_recommendations.primary_discovery && (
                      <div className="flex flex-wrap gap-1">
                        {body.hashtag_recommendations.primary_discovery.map((tag: string, i: number) => (
                          <span key={i} className="rounded-full bg-accent/10 px-2 py-0.5 text-accent">{tag}</span>
                        ))}
                      </div>
                    )}
                    {body.hashtag_recommendations.notes && (
                      <p className="text-text-muted">{body.hashtag_recommendations.notes}</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Raw scraped data reports (tweets/competitors) */}
          {!isAgent && (
            <>
              {isTrend && body.term && (
                <p className="text-xs text-text-muted">Search term: &quot;{body.term}&quot;</p>
              )}

              {!isTrend && body.profile && (
                <div className="rounded-lg bg-bg-base p-3 space-y-1 text-xs">
                  <p className="font-medium">{body.profile.display_name}</p>
                  {body.profile.bio && <p className="text-text-secondary">{body.profile.bio}</p>}
                  <div className="flex gap-4 text-text-muted pt-1">
                    <span>{(body.profile.followers ?? 0).toLocaleString()} followers</span>
                    <span>{(body.profile.following ?? 0).toLocaleString()} following</span>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {(body.tweets ?? body.recent_tweets ?? []).map((tweet: any, i: number) => (
                  <div key={i} className="rounded-lg bg-bg-base px-4 py-3 space-y-1">
                    {tweet.authorHandle && (
                      <p className="text-[10px] text-text-muted">{tweet.authorName || tweet.authorHandle}</p>
                    )}
                    <p className="text-xs text-text-primary">{tweet.text}</p>
                    <div className="flex items-center gap-4 text-[10px] text-text-muted pt-1">
                      {tweet.replies !== undefined && <span>{tweet.replies} replies</span>}
                      {tweet.retweets !== undefined && <span>{tweet.retweets} retweets</span>}
                      {tweet.likes !== undefined && <span>{tweet.likes} likes</span>}
                      {tweet.views !== undefined && tweet.views > 0 && <span>{tweet.views.toLocaleString()} views</span>}
                      {tweet.tweetUrl && (
                        <a href={tweet.tweetUrl} target="_blank" rel="noopener noreferrer" className="text-accent hover:text-accent-hover flex items-center gap-0.5">
                          <ExternalLink className="h-2.5 w-2.5" />
                          view
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
