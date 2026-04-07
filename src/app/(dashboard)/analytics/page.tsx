// src/app/(dashboard)/analytics/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { AnalyticsCard } from '@/components/dashboard/analytics-card'
import { AnalyticsChart } from '@/components/dashboard/analytics-chart'
import { RefreshCw } from 'lucide-react'

interface PlatformAnalytics {
  platformName: string
  platformColor: string
  platformAccountId: string
  latest: { followers: number; impressions: number; engagement: number }
  previous: { followers: number } | null
}

interface ChartPoint {
  date: string
  [key: string]: string | number
}

export default function AnalyticsPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [platforms, setPlatforms] = useState<PlatformAnalytics[]>([])
  const [followerData, setFollowerData] = useState<ChartPoint[]>([])
  const [engagementData, setEngagementData] = useState<ChartPoint[]>([])
  const [chartSeries, setChartSeries] = useState<{ key: string; color: string; name: string }[]>([])
  const [syncing, setSyncing] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)
      await loadAnalytics(user.id)
      setLoading(false)
    }
    init()
  }, [])

  async function loadAnalytics(uid: string) {
    // Get all analytics with platform info
    const { data: allAnalytics } = await supabase
      .from('analytics')
      .select('*, platform_accounts(platforms(name, color, slug))')
      .eq('profile_id', uid)
      .order('date', { ascending: true })

    if (!allAnalytics || allAnalytics.length === 0) {
      setPlatforms([])
      setFollowerData([])
      setEngagementData([])
      return
    }

    // Group by platform account
    const byAccount: Record<string, any[]> = {}
    for (const row of allAnalytics) {
      const accId = row.platform_account_id
      if (!byAccount[accId]) byAccount[accId] = []
      byAccount[accId].push(row)
    }

    // Build platform cards
    const platformCards: PlatformAnalytics[] = []
    const series: { key: string; color: string; name: string }[] = []

    for (const [accId, rows] of Object.entries(byAccount)) {
      const sorted = rows.sort((a: any, b: any) => a.date.localeCompare(b.date))
      const latest = sorted[sorted.length - 1]
      const previous = sorted.length >= 2 ? sorted[sorted.length - 2] : null
      const platform = (latest as any).platform_accounts?.platforms

      const name = platform?.name ?? 'Unknown'
      const color = platform?.color ?? '#666'

      platformCards.push({
        platformName: name,
        platformColor: color,
        platformAccountId: accId,
        latest: { followers: latest.followers, impressions: latest.impressions, engagement: latest.engagement },
        previous: previous ? { followers: previous.followers } : null,
      })

      series.push({ key: accId, color, name })
    }

    setPlatforms(platformCards)
    setChartSeries(series)

    // Build chart data — merge all platforms by date
    const dateMap: Record<string, ChartPoint> = {}
    for (const row of allAnalytics) {
      const date = (row as any).date
      const shortDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (!dateMap[date]) dateMap[date] = { date: shortDate }
      dateMap[date][row.platform_account_id] = row.followers
    }
    setFollowerData(Object.values(dateMap))

    const engDateMap: Record<string, ChartPoint> = {}
    for (const row of allAnalytics) {
      const date = (row as any).date
      const shortDate = new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      if (!engDateMap[date]) engDateMap[date] = { date: shortDate }
      engDateMap[date][row.platform_account_id] = row.engagement
    }
    setEngagementData(Object.values(engDateMap))
  }

  async function handleSync() {
    setSyncing(true)
    await fetch('/api/analytics/sync', { method: 'POST' })
    if (userId) await loadAnalytics(userId)
    setSyncing(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-light">Analytics</h1>
        <Button variant="outline" onClick={handleSync} disabled={syncing} className="text-xs">
          <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${syncing ? 'animate-spin' : ''}`} />
          Sync
        </Button>
      </div>

      {/* Platform Cards */}
      {platforms.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-surface p-12 text-center">
          <p className="text-text-muted">No analytics data yet. Connect platforms and sync to see your metrics.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {platforms.map((p) => {
            const growthPercent = p.previous
              ? ((p.latest.followers - p.previous.followers) / p.previous.followers) * 100
              : null

            return (
              <AnalyticsCard
                key={p.platformAccountId}
                platformName={p.platformName}
                platformColor={p.platformColor}
                followers={p.latest.followers}
                impressions={p.latest.impressions}
                engagement={p.latest.engagement}
                growthPercent={growthPercent}
              />
            )
          })}
        </div>
      )}

      {/* Follower Growth Chart */}
      <div className="space-y-3">
        <h2 className="text-lg font-light text-text-secondary">Follower growth</h2>
        <AnalyticsChart type="line" data={followerData} series={chartSeries} />
      </div>

      {/* Engagement Chart */}
      <div className="space-y-3">
        <h2 className="text-lg font-light text-text-secondary">Engagement</h2>
        <AnalyticsChart type="bar" data={engagementData} series={chartSeries} />
      </div>

      {/* Revenue */}
      <div className="space-y-3">
        <h2 className="text-lg font-light text-text-secondary">Revenue</h2>
        <div className="rounded-lg border border-border bg-bg-surface p-6 text-center">
          <p className="text-text-muted">Revenue tracking will be available when income platforms are connected.</p>
        </div>
      </div>
    </div>
  )
}
