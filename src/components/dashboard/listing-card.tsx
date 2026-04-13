// src/components/dashboard/listing-card.tsx
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

const STATUS_STYLES: Record<string, { bg: string; text: string; dotColor: string }> = {
  active: { bg: 'bg-tertiary/10', text: 'text-tertiary', dotColor: 'bg-tertiary' },
  expiring: { bg: 'bg-secondary-container', text: 'text-on-secondary-container', dotColor: 'bg-secondary' },
  expired: { bg: 'bg-error-container', text: 'text-on-error-container', dotColor: 'bg-error' },
  renewing: { bg: 'bg-tertiary/10', text: 'text-tertiary', dotColor: 'bg-tertiary' },
  paused: { bg: 'bg-surface-container-highest', text: 'text-on-surface-variant', dotColor: 'bg-on-surface-variant/40' },
}

function relativeExpiry(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diffDays = Math.round((then - now) / 86400000)
  if (diffDays > 0) return `Expires in ${diffDays} day${diffDays !== 1 ? 's' : ''}`
  if (diffDays === 0) return 'Expires today'
  return `Expired ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ListingCard({
  platformName, platformColor, listingUrl, status, expiresAt, renewalStatus, performance,
}: ListingCardProps) {
  const config = STATUS_STYLES[status] ?? STATUS_STYLES.paused
  const initial = platformName.charAt(0).toUpperCase()
  const isFeatured = status === 'active' && (performance.views ?? 0) > 1000
  const isExpired = status === 'expired'

  return (
    <div className="bg-surface-container-low hover:bg-surface-container-high transition-all duration-300 rounded-xl overflow-hidden group flex flex-col border border-outline-variant/5 shadow-xl shadow-black/20">
      {/* Banner image area */}
      <div className="h-32 bg-surface-container-highest relative overflow-hidden">
        <div className="w-full h-full bg-gradient-to-br from-surface-container-highest to-surface-container opacity-40 group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-surface-container-low to-transparent" />
        {isFeatured && (
          <div className="absolute top-4 left-4 flex gap-1.5 items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_#FEBBCB]" />
            <span className="text-xs font-medium text-on-surface">Featured Site</span>
          </div>
        )}
      </div>

      {/* Card body */}
      <div className="p-6 pt-0 -mt-8 relative z-10 flex-1">
        {/* Platform initial */}
        <div className="bg-surface-container-high w-14 h-14 rounded-xl flex items-center justify-center mb-4 shadow-2xl border border-outline-variant/20">
          <span className="font-display text-2xl text-primary font-bold">{initial}</span>
        </div>

        {/* Name + status */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h4 className="text-xl font-display tracking-tight">{platformName}</h4>
            <p className="text-xs text-on-surface-variant/70">
              {listingUrl ? listingUrl.replace(/^https?:\/\//, '').split('/')[0] : 'Directory Listing'}
            </p>
          </div>
          <span className={cn(
            'text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full flex items-center',
            config.bg, config.text
          )}>
            <span className={cn('w-1.5 h-1.5 rounded-full mr-2', config.dotColor)} />
            {status}
          </span>
        </div>

        {/* Views + Clicks */}
        <div className={cn('grid grid-cols-2 gap-4 mb-6', isExpired && 'opacity-40')}>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Views</p>
            <p className="text-lg font-display">{(performance.views ?? 0).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-[10px] text-on-surface-variant uppercase tracking-widest mb-1">Clicks</p>
            <p className="text-lg font-display">{(performance.clicks ?? 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Renewal footer */}
        <div className="pt-6 border-t border-outline-variant/10 mt-auto">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="text-on-surface-variant">Renewal Status</span>
            {renewalStatus === 'auto' ? (
              <span className="text-on-surface font-medium">Auto-renew ON</span>
            ) : renewalStatus === 'manual' ? (
              <button className="text-primary font-bold flex items-center gap-1">
                RENEW NOW
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            ) : renewalStatus === 'free' ? (
              <span className="text-on-surface font-medium">Free Tier</span>
            ) : (
              <span className="text-on-surface-variant/50">
                {isExpired ? 'Suspended' : renewalStatus}
              </span>
            )}
          </div>
          <div className={cn(
            'flex items-center justify-between text-xs italic',
            isExpired ? 'text-on-surface-variant/40' : status === 'expiring' ? 'text-error font-medium' : 'text-on-surface-variant/70'
          )}>
            {expiresAt ? (
              <>
                <span>{relativeExpiry(expiresAt)}</span>
                <span>{formatDate(expiresAt)}</span>
              </>
            ) : (
              <>
                <span>No expiry date</span>
                <span className="material-symbols-outlined text-sm">all_inclusive</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
