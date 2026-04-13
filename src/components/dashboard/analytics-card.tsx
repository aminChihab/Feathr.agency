// src/components/dashboard/analytics-card.tsx
// NOTE: This component is no longer rendered directly — the analytics page
// now uses inline metric cards matching the Stitch mockup layout.
// Kept for backward compatibility if referenced elsewhere.

import { TrendingUp, TrendingDown } from 'lucide-react'

interface AnalyticsCardProps {
  platformName: string
  platformColor: string
  followers: number
  impressions: number
  engagement: number
  growthPercent: number | null
}

export function AnalyticsCard({
  platformName, platformColor, followers, impressions, engagement, growthPercent,
}: AnalyticsCardProps) {
  return (
    <div className="bg-surface-container-low rounded-2xl p-8 space-y-4 relative overflow-hidden group">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: platformColor }} />
        <p className="text-xs tracking-widest uppercase text-on-surface-variant">{platformName}</p>
        {growthPercent !== null && (
          <div className={`ml-auto flex items-center gap-1 text-xs ${growthPercent >= 0 ? 'text-tertiary' : 'text-error'}`}>
            {growthPercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(growthPercent).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <h3 className="font-display text-3xl text-on-surface tracking-tighter">{followers.toLocaleString()}</h3>
          <p className="text-xs text-on-surface-variant/60">Followers</p>
        </div>
        <div>
          <h3 className="font-display text-3xl text-on-surface tracking-tighter">{impressions.toLocaleString()}</h3>
          <p className="text-xs text-on-surface-variant/60">Impressions</p>
        </div>
        <div>
          <h3 className="font-display text-3xl text-on-surface tracking-tighter">{engagement.toLocaleString()}</h3>
          <p className="text-xs text-on-surface-variant/60">Engagement</p>
        </div>
      </div>
    </div>
  )
}
