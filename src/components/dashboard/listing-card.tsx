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
  active: 'bg-tertiary/15 text-tertiary',
  expiring: 'bg-status-draft/15 text-status-draft',
  expired: 'bg-error/15 text-error',
  renewing: 'bg-tertiary/15 text-tertiary',
  paused: 'bg-surface-container-highest text-on-surface-variant',
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
    <div className="bg-surface-container-low rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: platformColor }} />
          <h3 className="text-sm font-medium text-on-surface">{platformName}</h3>
        </div>
        <span className={cn(
          'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
          STATUS_STYLES[status] ?? 'bg-surface-container-highest text-on-surface-variant'
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
            className="flex items-center gap-1.5 text-primary text-sm hover:opacity-80"
          >
            <ExternalLink className="h-3 w-3" />
            {listingUrl.replace(/^https?:\/\//, '').slice(0, 40)}
          </a>
        )}

        {expiresAt && (
          <p className="text-xs text-on-surface-variant/60">{relativeExpiry(expiresAt)}</p>
        )}

        {renewalStatus !== 'none' && (
          <p className="text-xs text-on-surface-variant/60">Renewal: {renewalStatus}</p>
        )}

        <div className="flex gap-6 pt-1">
          <div>
            <p className="font-display text-2xl">{(performance.views ?? 0).toLocaleString()}</p>
            <p className="text-xs text-on-surface-variant">Views</p>
          </div>
          <div>
            <p className="font-display text-2xl">{(performance.clicks ?? 0).toLocaleString()}</p>
            <p className="text-xs text-on-surface-variant">Clicks</p>
          </div>
        </div>
      </div>
    </div>
  )
}
