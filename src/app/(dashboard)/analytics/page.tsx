// src/app/(dashboard)/analytics/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AnalyticsChart } from '@/components/dashboard/analytics-chart'
import { RefreshCw, TrendingUp, ArrowUp, Globe, Zap, Share2, Sparkles, BarChart3, Megaphone } from 'lucide-react'

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

    const byAccount: Record<string, any[]> = {}
    for (const row of allAnalytics) {
      const accId = row.platform_account_id
      if (!byAccount[accId]) byAccount[accId] = []
      byAccount[accId].push(row)
    }

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

  // Compute aggregate metrics from platform data
  const totalImpressions = platforms.reduce((sum, p) => sum + p.latest.impressions, 0)
  const totalFollowers = platforms.reduce((sum, p) => sum + p.latest.followers, 0)
  const avgEngagement = platforms.length > 0
    ? platforms.reduce((sum, p) => sum + p.latest.engagement, 0) / platforms.length
    : 0
  const totalPreviousFollowers = platforms.reduce((sum, p) => sum + (p.previous?.followers ?? p.latest.followers), 0)
  const followerGrowth = totalPreviousFollowers > 0
    ? totalFollowers - totalPreviousFollowers
    : 0
  const reachGrowthPercent = totalPreviousFollowers > 0
    ? ((totalImpressions - totalPreviousFollowers) / totalPreviousFollowers * 100)
    : 0

  function formatNumber(n: number): string {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
    if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
    return n.toLocaleString()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div>
      {/* Sticky Top Bar */}
      <header className="sticky top-0 z-40 w-full bg-surface/80 backdrop-blur-xl flex justify-between items-center h-20 px-10 shadow-2xl shadow-black/40">
        <h2 className="font-display text-3xl font-light text-primary">Analytics</h2>
        <div className="flex items-center gap-8">
          <div className="relative flex items-center bg-surface-container-low rounded-full px-4 py-2 min-w-[300px]">
            <span className="text-on-surface-variant text-sm mr-2">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
            </span>
            <input
              className="bg-transparent border-none focus:ring-0 focus:outline-none text-sm text-on-surface placeholder:text-on-surface-variant/40 w-full"
              placeholder="Search insights..."
              type="text"
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-5 py-2 border border-outline-variant/20 hover:opacity-80 transition-opacity text-on-surface text-sm font-medium rounded-full"
            >
              <RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
              Sync
            </button>
            <button className="px-6 py-2.5 gradient-cta text-on-primary-container text-sm font-semibold rounded-xl hover:opacity-90 active:opacity-70 transition-all">
              Create Campaign
            </button>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <section className="p-10 space-y-10">

        {/* Platform Stat Cards (Bento Grid) */}
        {platforms.length === 0 ? (
          <div className="bg-surface-container-low rounded-xl p-12 text-center">
            <p className="text-on-surface-variant/60">No analytics data yet. Connect platforms and sync to see your metrics.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {/* Card 1: Cumulative Reach (wide) */}
            <div className="col-span-1 md:col-span-2 bg-surface-container-low p-8 rounded-2xl relative overflow-hidden group">
              <div className="flex justify-between items-start relative z-10">
                <div>
                  <p className="text-on-surface-variant text-xs tracking-widest uppercase mb-1">Cumulative Reach</p>
                  <h3 className="font-display text-5xl text-on-surface tracking-tighter">{formatNumber(totalImpressions)}</h3>
                  <div className="flex items-center gap-2 mt-4 text-tertiary text-sm">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-semibold">+{Math.abs(reachGrowthPercent).toFixed(1)}%</span>
                    <span className="text-on-surface-variant/40 ml-1">vs last month</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                  <Globe className="h-5 w-5" />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity text-on-surface">
                <svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 12c0-1.66-.44-3.21-1.2-4.55l-1.73 1a7.963 7.963 0 0 1 .93 3.55c0 1.25-.29 2.43-.8 3.48l1.71 1.01A9.94 9.94 0 0 0 21 12Z"/><path d="M10 2.1A10.01 10.01 0 0 0 2 12c0 4.42 2.87 8.17 6.84 9.49l.56-1.92A8.01 8.01 0 0 1 4 12c0-3.76 2.6-6.91 6.1-7.74z"/><path d="m14 2.1.57 1.97A8.005 8.005 0 0 1 20 12"/></svg>
              </div>
            </div>

            {/* Card 2: Engagement Rate */}
            <div className="bg-surface-container-high p-8 rounded-2xl flex flex-col justify-between">
              <div>
                <p className="text-on-surface-variant text-xs tracking-widest uppercase mb-1">Engagement</p>
                <h3 className="font-display text-4xl text-on-surface">{avgEngagement.toFixed(1)}%</h3>
              </div>
              <div className="mt-6 flex items-center gap-2 text-primary">
                <div className="h-1.5 flex-1 bg-surface-container rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${Math.min(avgEngagement * 15, 100)}%` }} />
                </div>
                <span className="text-xs font-bold">{avgEngagement >= 3 ? 'High' : avgEngagement >= 1.5 ? 'Med' : 'Low'}</span>
              </div>
            </div>

            {/* Card 3: Followers */}
            <div className="bg-surface-container-low p-8 rounded-2xl flex flex-col justify-between">
              <div>
                <p className="text-on-surface-variant text-xs tracking-widest uppercase mb-1">Followers</p>
                <h3 className="font-display text-4xl text-on-surface">{formatNumber(totalFollowers)}</h3>
              </div>
              <div className="mt-6 flex items-center gap-2 text-tertiary text-sm">
                <ArrowUp className="h-4 w-4" />
                <span className="font-semibold">{formatNumber(followerGrowth)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Visualization Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Growth Chart Area */}
          <div className="lg:col-span-2 bg-surface p-1 rounded-xl">
            <div className="flex items-center justify-between mb-8 px-4">
              <div>
                <h4 className="font-display text-2xl text-on-surface">Growth Velocity</h4>
                <p className="text-on-surface-variant text-xs">Platform performance over the last 30 days</p>
              </div>
              <div className="flex gap-4">
                {chartSeries.map((s) => (
                  <div key={s.key} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className="text-[10px] text-on-surface-variant uppercase tracking-tighter">{s.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="h-[400px] w-full bg-surface-container-lowest rounded-2xl overflow-hidden p-4">
              <AnalyticsChart type="line" data={followerData} series={chartSeries} height={360} />
            </div>
          </div>

          {/* Secondary Insights */}
          <div className="flex flex-col gap-6">
            {/* Audience Sentiment */}
            <div className="bg-surface-container-low p-6 rounded-xl ghost-border">
              <h4 className="font-display text-xl text-on-surface mb-4">Audience Sentiment</h4>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-on-surface-variant">Positive</span>
                    <span className="text-xs font-bold text-tertiary">78%</span>
                  </div>
                  <div className="h-1 bg-surface-container rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-tertiary w-[78%]" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-on-surface-variant">Neutral</span>
                    <span className="text-xs font-bold text-on-surface">18%</span>
                  </div>
                  <div className="h-1 bg-surface-container rounded-full overflow-hidden mt-1">
                    <div className="h-full bg-on-surface-variant/40 w-[18%]" />
                  </div>
                </div>
              </div>
            </div>

            {/* Campaign Spotlight */}
            <div className="flex-1 bg-surface-container-highest p-8 rounded-xl relative overflow-hidden group">
              <div className="relative z-10">
                <p className="text-primary text-[10px] uppercase font-bold tracking-[0.2em] mb-2">Campaign Spotlight</p>
                <h4 className="font-display text-2xl leading-tight text-on-surface mb-6">
                  Sustainable Luxury<br />Launch Results
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-primary" />
                    <span className="text-sm">24k Conversion Events</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <Share2 className="h-4 w-4 text-primary" />
                    <span className="text-sm">1.8k Shares</span>
                  </div>
                </div>
              </div>
              <div className="absolute bottom-0 right-0 w-32 h-32 opacity-10 blur-2xl bg-primary" />
            </div>
          </div>
        </div>

        {/* Actionable Insights */}
        <div className="bg-surface-container-lowest rounded-xl p-8 ghost-border">
          <div className="flex items-center justify-between mb-8">
            <h4 className="font-display text-2xl text-on-surface">Actionable Insights</h4>
            <button className="text-primary text-xs font-bold uppercase tracking-widest hover:underline transition-all">View All Alerts</button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Insight 1 */}
            <div className="flex gap-4 group cursor-pointer">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-surface-container flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-colors">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-on-surface mb-1">Peak Engagement Alert</h5>
                <p className="text-xs text-on-surface-variant leading-relaxed">LinkedIn activity spikes at 10:00 AM EST. Schedule your next post then for 40% higher reach.</p>
              </div>
            </div>
            {/* Insight 2 */}
            <div className="flex gap-4 group cursor-pointer">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-surface-container flex items-center justify-center text-tertiary group-hover:bg-tertiary group-hover:text-on-tertiary transition-colors">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-on-surface mb-1">Content Gap Detected</h5>
                <p className="text-xs text-on-surface-variant leading-relaxed">Video content is performing 3x better than static images this week. Consider pivoting.</p>
              </div>
            </div>
            {/* Insight 3 */}
            <div className="flex gap-4 group cursor-pointer">
              <div className="w-12 h-12 shrink-0 rounded-xl bg-surface-container flex items-center justify-center text-secondary group-hover:bg-secondary group-hover:text-on-secondary transition-colors">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <h5 className="text-sm font-bold text-on-surface mb-1">Competitor Strategy</h5>
                <p className="text-xs text-on-surface-variant leading-relaxed">&ldquo;Brand Atelier&rdquo; launched a new reels series. We recommend a tactical response.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Decorative Bento Section */}
        <div className="grid grid-cols-12 gap-6 h-64">
          <div className="col-span-12 md:col-span-8 rounded-2xl overflow-hidden relative bg-surface-container-highest">
            <div className="absolute inset-0 bg-gradient-to-t from-surface to-transparent opacity-60" />
            <div className="absolute bottom-8 left-8">
              <p className="font-display text-3xl text-on-surface">Data Processing Nodes: Active</p>
            </div>
          </div>
          <div className="col-span-12 md:col-span-4 bg-primary p-8 rounded-2xl flex flex-col justify-center items-center text-center">
            <h5 className="font-display text-3xl text-on-primary-container italic">Global Sync</h5>
            <p className="text-on-primary-container/80 text-sm mt-2">All platform nodes are operating at optimal latency.</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="p-10 border-t border-outline-variant/10 text-on-surface-variant text-[10px] tracking-widest uppercase flex justify-between">
        <span>&copy; 2024 Feathr Marketing Atelier. All Rights Reserved.</span>
        <div className="flex gap-6">
          <a className="hover:text-primary transition-colors" href="#">Privacy Policy</a>
          <a className="hover:text-primary transition-colors" href="#">Terms of Service</a>
        </div>
      </footer>
    </div>
  )
}
