'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ResearchReportCard } from '@/components/dashboard/research-report-card'
import { ResearchSuggestions } from '@/components/dashboard/research-suggestions'
import { ResearchTargets } from '@/components/dashboard/research-targets'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, Search } from 'lucide-react'

interface ReportSection {
  section_type: string
  title: string
  content: string
  sort_order: number
}

interface Report {
  id: string
  report_type: string
  title: string
  summary: string | null
  created_at: string
  research_report_sections: ReportSection[]
}

export default function ResearchPage() {
  const supabase = createClient()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [filter, setFilter] = useState<'all' | 'x_strategy' | 'ig_strategy' | 'performance'>('all')
  const [notifications, setNotifications] = useState<any[]>([])
  const [twitterTargets, setTwitterTargets] = useState({ handles: [] as string[], terms: [] as string[], discoveredHandles: [] as string[], discoveredTerms: [] as string[] })
  const [instagramTargets, setInstagramTargets] = useState({ handles: [] as string[], terms: [] as string[], discoveredHandles: [] as string[], discoveredTerms: [] as string[] })

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Load reports with sections
    const { data: reportData } = await supabase
      .from('research_reports')
      .select('id, report_type, title, summary, created_at, research_report_sections(section_type, title, content, sort_order)')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    setReports((reportData as Report[] | null) ?? [])

    const notifRes = await fetch('/api/notifications')
    if (notifRes.ok) {
      const notifData = await notifRes.json()
      setNotifications((notifData.notifications ?? []).filter((n: any) => n.type === 'discovery' && !n.acted_on))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .single()

    const s = (profile?.settings as any) ?? {}
    setTwitterTargets({
      handles: s.twitter_handles ?? s.competitor_handles ?? [],
      terms: s.twitter_terms ?? s.research_terms ?? [],
      discoveredHandles: s.discovered_twitter_handles ?? [],
      discoveredTerms: s.discovered_twitter_terms ?? [],
    })
    setInstagramTargets({
      handles: s.instagram_handles ?? [],
      terms: s.instagram_terms ?? [],
      discoveredHandles: s.discovered_instagram_handles ?? [],
      discoveredTerms: s.discovered_instagram_terms ?? [],
    })
    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function handleNewResearch() {
    setTriggering(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      await fetch('/api/research/sync', { method: 'POST' })
      await fetch('/api/research/sync-instagram', { method: 'POST' })

      for (const agent of ['x-strategist', 'ig-strategist', 'performance-analyst']) {
        await fetch('/api/agent/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ agent, profile_id: user.id, title: `Analyze and create ${agent} report` }),
        })
      }
    } catch (err) {
      console.error('[research] Error:', err)
    } finally {
      setTriggering(false)
    }
  }

  async function handleAcceptSuggestion(notifId: string, action: string, value: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const notif = notifications.find((n) => n.id === notifId)
    const platform = notif?.body?.platform ?? 'twitter'

    const update: any = { profile_id: user.id, platform }
    if (action === 'add_account') update.add_handles = [value]
    if (action === 'add_hashtag') update.add_terms = [value]
    if (action === 'remove_account') update.remove_handles = [value]
    if (action === 'remove_hashtag') update.remove_terms = [value]

    await fetch('/api/agent/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })
    loadAll()
  }

  async function handleDismissNotification(notifId: string) {
    await fetch(`/api/notifications/${notifId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acted_on: true, read: true }),
    })
    setNotifications((prev) => prev.filter((n) => n.id !== notifId))
  }

  async function handleAddTerm(platform: string, term: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user.id).single()
    const s = (profile?.settings as any) ?? {}
    const key = `${platform}_terms`
    const current: string[] = s[key] ?? []
    await supabase.from('profiles').update({ settings: { ...s, [key]: [...new Set([...current, term])] } }).eq('id', user.id)
    loadAll()
  }

  async function handleRemoveTerm(platform: string, term: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user.id).single()
    const s = (profile?.settings as any) ?? {}
    const key = `${platform}_terms`
    const current: string[] = s[key] ?? []
    await supabase.from('profiles').update({ settings: { ...s, [key]: current.filter((t) => t !== term) } }).eq('id', user.id)
    loadAll()
  }

  async function handleAddHandle(platform: string, handle: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user.id).single()
    const s = (profile?.settings as any) ?? {}
    const key = `${platform}_handles`
    const current: string[] = s[key] ?? []
    await supabase.from('profiles').update({ settings: { ...s, [key]: [...new Set([...current, handle])] } }).eq('id', user.id)
    loadAll()
  }

  async function handleRemoveHandle(platform: string, handle: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('settings').eq('id', user.id).single()
    const s = (profile?.settings as any) ?? {}
    const key = `${platform}_handles`
    const current: string[] = s[key] ?? []
    await supabase.from('profiles').update({ settings: { ...s, [key]: current.filter((h) => h !== handle) } }).eq('id', user.id)
    loadAll()
  }

  const filteredReports = filter === 'all' ? reports : reports.filter((r) => r.report_type === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-primary">Research</h1>
          {reports.length > 0 && (
            <p className="text-sm text-on-surface-variant/60 mt-1">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="text-xs" onClick={async () => {
            const res = await fetch('/api/research/sync', { method: 'POST' })
            const data = await res.json()
            console.log('[research] Twitter sync:', data)
            alert(`Twitter: ${data.trend_reports ?? 0} trends, ${data.competitor_reports ?? 0} competitors, ${(data.errors ?? []).length} errors`)
          }}>Test Twitter</Button>
          <Button variant="outline" className="text-xs" onClick={async () => {
            const res = await fetch('/api/research/sync-instagram', { method: 'POST' })
            const data = await res.json()
            console.log('[research] IG sync:', data)
            alert(`IG: ${data.runs_started ?? 0} runs started, ${(data.errors ?? []).length} errors`)
          }}>Test IG</Button>
          <button onClick={handleNewResearch} disabled={triggering} className="silk-gradient text-on-primary px-5 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 active:opacity-70 transition-all shadow-lg shadow-primary/10 disabled:opacity-50">
            {triggering ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 mr-1.5" />}
            {triggering ? 'Running...' : 'New Research'}
          </button>
        </div>
      </div>

      <ResearchSuggestions notifications={notifications} onAccept={handleAcceptSuggestion} onDismiss={handleDismissNotification} />

      <ResearchTargets
        twitter={twitterTargets}
        instagram={instagramTargets}
        onAddTerm={handleAddTerm}
        onRemoveTerm={handleRemoveTerm}
        onAddHandle={handleAddHandle}
        onRemoveHandle={handleRemoveHandle}
      />

      <div className="flex gap-2">
        {([
          { key: 'all', label: 'All' },
          { key: 'x_strategy', label: 'X/Twitter' },
          { key: 'ig_strategy', label: 'Instagram' },
          { key: 'performance', label: 'Performance' },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              filter === key ? 'bg-primary text-on-primary' : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {filteredReports.length === 0 ? (
        <div className="bg-surface-container-low rounded-xl p-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Search className="h-6 w-6 text-primary" />
          </div>
          <p className="text-on-surface font-medium">No reports yet</p>
          <p className="text-sm text-on-surface-variant/60 mt-1.5 max-w-sm mx-auto">
            Click &ldquo;New Research&rdquo; to have your AI strategists analyze the market and your performance.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report, i) => (
            <ResearchReportCard
              key={report.id}
              reportType={report.report_type}
              title={report.title}
              summary={report.summary}
              createdAt={report.created_at}
              sections={report.research_report_sections ?? []}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
