// src/components/dashboard/listing-card.tsx
import { ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ListingCardProps {
  platformName: string
  platformColor: string
  listingUrl: string | null
  status: string
  expiresAt: string | null
  renewalStatus: string
  performance: { views?: number; clicks?: number }
}

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-status-scheduled/15 text-status-scheduled',
  expiring: 'bg-status-draft/15 text-status-draft',
  expired: 'bg-status-failed/15 text-status-failed',
  renewing: 'bg-status-approved/15 text-status-approved',
  paused: 'bg-bg-elevated text-text-muted',
}

function relativeExpiry(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffDays = Math.round((then - now) / 86400000)
  if (diffDays > 0) return `Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`
  if (diffDays === 0) return 'Expires today'
  return `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`
}

export function ListingCard({
  platformName, platformColor, listingUrl, status, expiresAt, renewalStatus, performance,
}: ListingCardProps) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: platformColor }} />
          <h3 className="text-sm font-medium">{platformName}</h3>
        </div>
        <span className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
          STATUS_STYLES[status] ?? 'bg-bg-elevated text-text-muted'
        )}>
          {status}
        </span>
      </div>

      <div className="mt-3 space-y-2">
        {listingUrl && (
          <a
            href={listingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-accent hover:text-accent-hover"
          >
            <ExternalLink className="h-3 w-3" />
            {listingUrl.replace(/^https?:\/\//, '').slice(0, 40)}
          </a>
        )}

        {expiresAt && (
          <p className="text-xs text-text-muted">{relativeExpiry(expiresAt)}</p>
        )}

        {renewalStatus !== 'none' && (
          <p className="text-xs text-text-muted">Renewal: {renewalStatus}</p>
        )}

        <div className="flex gap-6 pt-1">
          <div>
            <p className="text-lg font-light">{(performance.views ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-text-muted">Views</p>
          </div>
          <div>
            <p className="text-lg font-light">{(performance.clicks ?? 0).toLocaleString()}</p>
            <p className="text-[10px] text-text-muted">Clicks</p>
          </div>
        </div>
      </div>
    </div>
  )
}
