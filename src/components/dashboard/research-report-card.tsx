'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, ChevronUp, ExternalLink, TrendingUp, Users } from 'lucide-react'

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

export function ResearchReportCard({ type, title, createdAt, body }: ResearchReportCardProps) {
  const [expanded, setExpanded] = useState(false)

  const isTrend = type === 'trend'
  const tweets = isTrend ? (body.tweets ?? []) : (body.recent_tweets ?? [])

  return (
    <div className="rounded-lg border border-border bg-bg-surface">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div className="flex items-center gap-3">
          <div className={cn(
            'flex h-8 w-8 items-center justify-center rounded-lg',
            isTrend ? 'bg-status-approved/15' : 'bg-accent/15'
          )}>
            {isTrend ? <TrendingUp className="h-4 w-4 text-status-approved" /> : <Users className="h-4 w-4 text-accent" />}
          </div>
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-[10px] text-text-muted">{relativeDate(createdAt)} · {tweets.length} items</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-3">
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
            {tweets.map((tweet: any, i: number) => (
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
        </div>
      )}
    </div>
  )
}
