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
    <div className="rounded-lg border border-border bg-bg-surface p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: platformColor }} />
        <h3 className="text-sm font-medium">{platformName}</h3>
        {growthPercent !== null && (
          <div className={`ml-auto flex items-center gap-1 text-xs ${growthPercent >= 0 ? 'text-status-scheduled' : 'text-status-failed'}`}>
            {growthPercent >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(growthPercent).toFixed(1)}%
          </div>
        )}
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-2xl font-light">{followers.toLocaleString()}</p>
          <p className="text-xs text-text-muted">Followers</p>
        </div>
        <div>
          <p className="text-2xl font-light">{impressions.toLocaleString()}</p>
          <p className="text-xs text-text-muted">Impressions</p>
        </div>
        <div>
          <p className="text-2xl font-light">{engagement.toLocaleString()}</p>
          <p className="text-xs text-text-muted">Engagement</p>
        </div>
      </div>
    </div>
  )
}
