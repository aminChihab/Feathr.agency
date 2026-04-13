// src/components/dashboard/analytics-card.tsx
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
    <div className="bg-surface-container-low rounded-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: platformColor }} />
        <h3 className="text-sm font-body font-medium text-on-surface-variant">{platformName}</h3>
        {growthPercent !== null && (
          <div className={`ml-auto flex items-center gap-1 text-xs ${growthPercent >= 0 ? 'text-tertiary' : 'text-error'}`}>
            {growthPercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(growthPercent).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="font-display text-3xl text-on-surface">{followers.toLocaleString()}</p>
          <p className="text-xs text-on-surface-variant/60">Followers</p>
        </div>
        <div>
          <p className="font-display text-3xl text-on-surface">{impressions.toLocaleString()}</p>
          <p className="text-xs text-on-surface-variant/60">Impressions</p>
        </div>
        <div>
          <p className="font-display text-3xl text-on-surface">{engagement.toLocaleString()}</p>
          <p className="text-xs text-on-surface-variant/60">Engagement</p>
        </div>
      </div>
    </div>
  )
}
