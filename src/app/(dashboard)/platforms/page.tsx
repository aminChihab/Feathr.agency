'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PlatformCard } from '@/components/dashboard/platform-card'
import { ConnectPlatformModal } from '@/components/dashboard/connect-platform-modal'
import { AlertTriangle } from 'lucide-react'

interface PlatformAccount {
  id: string
  username: string | null
  status: string
  connected_at: string
  schedule_json: any
  platform_id: string
  platform_name: string
  platform_color: string
  platform_slug: string
  auth_type: string
}

interface ExpiredPlatform {
  id: string
  name: string
  slug: string
}

interface QueueItem {
  id: string
  caption: string | null
  scheduled_at: string
  platform_name: string
}

const SUGGESTED_NETWORKS = [
  { name: 'TikTok', icon: 'linked_camera', slug: 'tiktok' },
  { name: 'LinkedIn', icon: 'work', slug: 'linkedin' },
  { name: 'Threads', icon: 'alternate_email', slug: 'threads' },
  { name: 'YouTube', icon: 'youtube_activity', slug: 'youtube', dimmed: true },
  { name: 'Facebook', icon: 'social_leaderboard', slug: 'facebook', dimmed: true },
  { name: 'Custom', icon: 'add_circle', slug: 'custom' },
]

export default function PlatformsPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [accounts, setAccounts] = useState<PlatformAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [reconnectPlatform, setReconnectPlatform] = useState<{ platformSlug: string; authType: string; platformName: string } | null>(null)
  const [expiredPlatforms, setExpiredPlatforms] = useState<ExpiredPlatform[]>([])
  const [checking, setChecking] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [queueItems, setQueueItems] = useState<QueueItem[]>([])

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        await loadAccounts(user.id)
        await loadQueue(user.id)
        checkTokens()
      }
    }
    init()
  }, [])

  async function loadAccounts(uid: string) {
    setLoading(true)
    const { data } = await supabase
      .from('platform_accounts')
      .select('*, platforms(name, color, slug, auth_type)')
      .eq('profile_id', uid)
      .order('connected_at', { ascending: false })

    const mapped: PlatformAccount[] = (data ?? []).map((item: any) => ({
      id: item.id,
      username: item.username,
      status: item.status,
      connected_at: item.connected_at,
      schedule_json: item.schedule_json,
      platform_id: item.platform_id,
      platform_name: item.platforms?.name ?? 'Unknown',
      platform_color: item.platforms?.color ?? '#666',
      platform_slug: item.platforms?.slug ?? '',
      auth_type: item.platforms?.auth_type ?? 'manual',
    }))

    setAccounts(mapped)
    setLoading(false)
  }

  async function loadQueue(uid: string) {
    const { data } = await supabase
      .from('content_calendar')
      .select('id, caption, scheduled_at, platform_account_id, platform_accounts(platforms(name))')
      .eq('profile_id', uid)
      .eq('status', 'scheduled')
      .order('scheduled_at', { ascending: true })
      .limit(3)

    const items: QueueItem[] = (data ?? []).map((item: any) => ({
      id: item.id,
      caption: item.caption,
      scheduled_at: item.scheduled_at,
      platform_name: item.platform_accounts?.platforms?.name ?? 'Unknown',
    }))
    setQueueItems(items)
  }

  async function checkTokens() {
    setChecking(true)
    try {
      const res = await fetch('/api/platforms/check-tokens', { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setExpiredPlatforms(data.expired ?? [])
        if (data.expired?.length > 0 && userId) {
          await loadAccounts(userId)
        }
      }
    } catch (err) {
      console.error('[platforms] Token check failed:', err)
    } finally {
      setChecking(false)
    }
  }

  async function handleDisconnect(id: string) {
    await supabase.from('platform_accounts').delete().eq('id', id)
    setAccounts((prev) => prev.filter((a) => a.id !== id))
    setExpiredPlatforms((prev) => prev.filter((p) => p.id !== id))
  }

  function handleReconnect(account: PlatformAccount) {
    setReconnectPlatform({
      platformSlug: account.platform_slug,
      authType: account.auth_type,
      platformName: account.platform_name,
    })
    setModalOpen(true)
  }

  async function handleScheduleChange(id: string, frequency: string) {
    await supabase
      .from('platform_accounts')
      .update({ schedule_json: { frequency } })
      .eq('id', id)
    setAccounts((prev) =>
      prev.map((a) => a.id === id ? { ...a, schedule_json: { frequency } } : a)
    )
  }

  // Derive integration health from connected accounts
  const connectedCount = accounts.filter((a) => a.status === 'connected').length
  const totalCount = accounts.length
  const uptimePercent = totalCount > 0
    ? Math.round((connectedCount / totalCount) * 1000) / 10
    : 0
  const allHealthy = connectedCount === totalCount && totalCount > 0

  // Filter suggested networks to exclude already-connected slugs
  const connectedSlugs = new Set(accounts.map((a) => a.platform_slug))
  const filteredSuggested = SUGGESTED_NETWORKS.filter((n) => !connectedSlugs.has(n.slug))

  // Search filter
  const filteredAccounts = searchQuery
    ? accounts.filter((a) =>
        a.platform_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a.username ?? '').toLowerCase().includes(searchQuery.toLowerCase())
      )
    : accounts

  if (!userId) return null

  return (
    <>
      {/* Top bar area - handled by layout, but we add search + CTA */}
      <header className="flex justify-between items-center mb-0">
        <div className="flex flex-col">
          <h2 className="font-display text-3xl font-light text-primary">Platforms</h2>
          <span className="text-[10px] text-on-surface-variant tracking-widest uppercase">Connection Hub</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="relative group hidden lg:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-sm">search</span>
            <input
              className="bg-surface-container-low border-b-2 border-surface-variant focus:border-primary transition-all duration-300 text-sm py-2 pl-10 pr-4 w-64 outline-none placeholder:text-on-surface-variant/40"
              placeholder="Search platforms..."
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button
            onClick={() => { setReconnectPlatform(null); setModalOpen(true) }}
            className="bg-gradient-to-br from-primary to-primary-container text-on-primary-container px-6 py-2.5 rounded-lg text-sm font-semibold hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-lg">add</span>
            Add Platform
          </button>
        </div>
      </header>

      {/* Expired tokens banner */}
      {expiredPlatforms.length > 0 && (
        <div className="flex items-start gap-3 rounded-xl bg-error/5 px-4 py-3 mt-4">
          <AlertTriangle className="h-4 w-4 text-error mt-0.5 shrink-0" />
          <div className="space-y-1">
            <p className="text-sm font-medium text-on-surface">
              {expiredPlatforms.length === 1
                ? `${expiredPlatforms[0].name} needs to be reconnected`
                : `${expiredPlatforms.length} platforms need to be reconnected`}
            </p>
            <p className="text-xs text-on-surface-variant/60">
              {expiredPlatforms.map((p) => p.name).join(', ')} — authorization has expired. Click Reconnect to re-authorize.
            </p>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto mt-6">
        {/* Editorial Welcome Section */}
        <section className="mb-16">
          <p className="text-on-surface-variant text-sm mb-2 max-w-lg">
            Synchronize your brand across the digital ecosystem. Manage authentication, scheduling cadences, and cross-platform integrity from a single atelier.
          </p>
          <div className="w-12 h-px bg-primary/30 mt-6"></div>
        </section>

        {/* Bento Grid Connection Management */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Main Connections List */}
          <div className="md:col-span-12 lg:col-span-8 bg-surface-container-low rounded-xl p-8 border border-outline-variant/10">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h3 className="font-display text-2xl text-on-surface">Active Networks</h3>
                <p className="text-xs text-on-surface-variant">
                  {connectedCount} active instance{connectedCount !== 1 ? 's' : ''} connected
                </p>
              </div>
              <div className="flex gap-2 items-center">
                <span className={`h-2 w-2 rounded-full ${allHealthy ? 'bg-tertiary' : 'bg-error'}`}></span>
                <span className={`text-[10px] uppercase tracking-tighter font-bold ${allHealthy ? 'text-tertiary' : 'text-error'}`}>
                  {allHealthy ? 'All systems nominal' : 'Attention needed'}
                </span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : filteredAccounts.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-on-surface-variant/60 text-sm">
                  {searchQuery ? 'No platforms match your search.' : 'No platforms connected yet. Add your first platform to get started.'}
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredAccounts.map((account) => (
                  <PlatformCard
                    key={account.id}
                    account={account}
                    onDisconnect={handleDisconnect}
                    onReconnect={handleReconnect}
                    onScheduleChange={handleScheduleChange}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Secondary Action Cards */}
          <div className="md:col-span-12 lg:col-span-4 flex flex-col gap-6">
            {/* Integration Health Card */}
            <div className="bg-surface-container-high rounded-xl p-6 border border-outline-variant/10">
              <h5 className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-6">Integration Health</h5>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">API Uptime</span>
                  <span className="font-display text-lg italic text-primary">
                    {totalCount > 0 ? `${uptimePercent}%` : '—'}
                  </span>
                </div>
                <div className="w-full bg-surface-variant h-1 rounded-full overflow-hidden">
                  <div className="bg-primary h-full transition-all duration-500" style={{ width: `${uptimePercent}%` }}></div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <span className="text-sm font-medium">Sync Rate</span>
                  <span className="font-display text-lg italic text-primary">
                    {allHealthy ? 'Instant' : 'Degraded'}
                  </span>
                </div>
              </div>
            </div>

            {/* New Stream CTA */}
            <div className="bg-primary/5 rounded-xl p-6 border border-primary/20 relative overflow-hidden group">
              <div className="relative z-10">
                <h5 className="font-display text-xl text-on-surface mb-2">New Stream</h5>
                <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                  Expand your presence by connecting TikTok, LinkedIn, or Threads.
                </p>
                <button
                  onClick={() => { setReconnectPlatform(null); setModalOpen(true) }}
                  className="w-full bg-surface-container-highest border border-outline-variant/20 py-3 rounded-lg text-xs font-semibold hover:bg-surface-bright transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">auto_awesome</span>
                  Discover Integrations
                </button>
              </div>
              <div className="absolute -bottom-10 -right-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
                <span className="material-symbols-outlined text-[120px]">hub</span>
              </div>
            </div>

            {/* Next Queue */}
            <div className="bg-surface-container-low rounded-xl p-6 border border-outline-variant/10">
              <h5 className="text-[10px] uppercase tracking-[0.2em] text-on-surface-variant mb-6">Next Queue</h5>
              <div className="space-y-4">
                {queueItems.length === 0 ? (
                  <p className="text-xs text-on-surface-variant/60">No upcoming posts scheduled.</p>
                ) : (
                  queueItems.map((item) => {
                    const time = item.scheduled_at
                      ? new Date(item.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                      : 'TBD'
                    const title = item.caption
                      ? item.caption.slice(0, 40) + (item.caption.length > 40 ? '...' : '')
                      : 'Untitled Post'
                    return (
                      <div key={item.id} className="flex gap-4 items-start">
                        <div className="mt-1 text-on-surface-variant">
                          <span className="material-symbols-outlined text-sm">schedule</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{title}</p>
                          <p className="text-[10px] text-on-surface-variant">{item.platform_name} &bull; {time}</p>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Suggested Networks Grid */}
        {filteredSuggested.length > 0 && (
          <section className="mt-20">
            <h4 className="font-display text-2xl mb-8">Suggested Networks</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {filteredSuggested.map((network) => (
                <div
                  key={network.slug}
                  onClick={() => { setReconnectPlatform(null); setModalOpen(true) }}
                  className={`aspect-square bg-surface-container-lowest rounded-xl flex flex-col items-center justify-center border border-outline-variant/5 hover:border-primary/20 transition-all cursor-pointer group ${network.dimmed ? 'opacity-40' : ''}`}
                >
                  <span className={`material-symbols-outlined text-2xl text-on-surface-variant ${!network.dimmed ? 'group-hover:text-primary' : ''} transition-colors mb-3`}>
                    {network.icon}
                  </span>
                  <span className="text-[10px] font-medium tracking-wider uppercase opacity-60">{network.name}</span>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      <ConnectPlatformModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false)
          setReconnectPlatform(null)
          if (userId) {
            loadAccounts(userId)
            loadQueue(userId)
            checkTokens()
          }
        }}
        supabase={supabase}
        userId={userId}
        connectedPlatformIds={accounts.map((a) => a.platform_id)}
        reconnectPlatform={reconnectPlatform}
        onConnected={() => {
          if (userId) {
            loadAccounts(userId)
            loadQueue(userId)
            setExpiredPlatforms([])
            checkTokens()
          }
        }}
      />
    </>
  )
}
