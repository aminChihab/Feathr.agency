# Research System — Frontend

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Research page with suggestions banner, active targets management, and per-type report tabs. Add notification bell to sidebar.

**Architecture:** Sidebar gets bell icon with unread badge (fetches from `/api/notifications/count`). Research page gets three sections: pending suggestions, active targets, and filtered reports.

**Tech Stack:** Next.js 16 App Router, React, Tailwind CSS, shadcn/ui, lucide-react

**Prerequisites:** Backend plan (Plan 1) and Agents plan (Plan 2) must be completed first.

---

### Task 1: Add notification bell to sidebar

**Files:**
- Modify: `src/components/dashboard/sidebar-nav.tsx`

- [ ] **Step 1: Read current sidebar-nav.tsx**

- [ ] **Step 2: Add Bell icon import and notification count state**

Add `Bell` to the lucide-react imports. Add a client-side fetch for unread notification count.

In `src/components/dashboard/sidebar-nav.tsx`, add the Bell icon to imports:

```typescript
import {
  LayoutDashboard, Inbox, CalendarDays, BarChart3, Link2, Search,
  ListChecks, Users, Plane, Bot, Settings, Bell,
} from 'lucide-react'
```

- [ ] **Step 3: Add notification count fetch**

Inside the `SidebarNav` component, add state and effect:

```typescript
const [notifCount, setNotifCount] = useState(0)

useEffect(() => {
  async function fetchCount() {
    try {
      const res = await fetch('/api/notifications/count')
      if (res.ok) {
        const data = await res.json()
        setNotifCount(data.count ?? 0)
      }
    } catch {}
  }
  fetchCount()
  // Poll every 60 seconds
  const interval = setInterval(fetchCount, 60000)
  return () => clearInterval(interval)
}, [])
```

- [ ] **Step 4: Add bell icon to the nav, above Settings**

In the sidebar nav items rendering, add a bell link before the Settings link at the bottom. It should link to `/research` and show a badge when `notifCount > 0`:

```tsx
<Link
  href="/research"
  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors relative ${
    pathname === '/research'
      ? 'bg-bg-elevated text-text-primary'
      : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
  }`}
>
  <Bell className="h-4 w-4" />
  Notifications
  {notifCount > 0 && (
    <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-full bg-accent text-white text-[10px] font-medium px-1">
      {notifCount > 99 ? '99+' : notifCount}
    </span>
  )}
</Link>
```

- [ ] **Step 5: Add `useState` and `useEffect` to imports if not already present**

Ensure `useState` and `useEffect` are imported from React. The component needs `'use client'` directive (verify it's already there).

- [ ] **Step 6: Commit**

```bash
git add src/components/dashboard/sidebar-nav.tsx
git commit -m "feat: notification bell in sidebar with unread count badge"
```

---

### Task 2: Research page — Suggestions banner component

**Files:**
- Create: `src/components/dashboard/research-suggestions.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Check, X, Plus, Minus, Sparkles } from 'lucide-react'

interface Suggestion {
  handle?: string
  tag?: string
  reason: string
}

interface DiscoveryNotification {
  id: string
  title: string
  body: {
    source: string
    platform: string
    add_accounts?: Suggestion[]
    add_hashtags?: Suggestion[]
    remove_accounts?: Suggestion[]
    remove_hashtags?: Suggestion[]
  }
}

interface ResearchSuggestionsProps {
  notifications: DiscoveryNotification[]
  onAccept: (notificationId: string, action: 'add_account' | 'add_hashtag' | 'remove_account' | 'remove_hashtag', value: string) => Promise<void>
  onDismiss: (notificationId: string) => Promise<void>
}

export function ResearchSuggestions({ notifications, onAccept, onDismiss }: ResearchSuggestionsProps) {
  const [processing, setProcessing] = useState<string | null>(null)

  if (notifications.length === 0) return null

  const sourceLabel = (source: string) => {
    if (source === 'x_strategist') return 'X/Twitter'
    if (source === 'ig_strategist') return 'Instagram'
    return source
  }

  return (
    <div className="rounded-xl border border-accent/20 bg-accent/5 overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-accent/10">
        <Sparkles className="h-4 w-4 text-accent" />
        <h2 className="text-sm font-medium">Research Suggestions</h2>
        <span className="text-xs text-text-muted">from your AI strategists</span>
      </div>

      <div className="divide-y divide-border/50">
        {notifications.map((notif) => {
          const b = notif.body
          const allItems = [
            ...(b.add_accounts ?? []).map((s) => ({ ...s, type: 'add_account' as const, value: s.handle!, icon: Plus })),
            ...(b.add_hashtags ?? []).map((s) => ({ ...s, type: 'add_hashtag' as const, value: s.tag!, icon: Plus })),
            ...(b.remove_accounts ?? []).map((s) => ({ ...s, type: 'remove_account' as const, value: s.handle!, icon: Minus })),
            ...(b.remove_hashtags ?? []).map((s) => ({ ...s, type: 'remove_hashtag' as const, value: s.tag!, icon: Minus })),
          ]

          return (
            <div key={notif.id} className="px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-accent">{sourceLabel(b.source)}</span>
                  <span className="text-xs text-text-muted">{notif.title}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-text-muted"
                  onClick={() => onDismiss(notif.id)}
                >
                  Dismiss all
                </Button>
              </div>

              <div className="space-y-2">
                {allItems.map((item, i) => {
                  const isRemove = item.type.startsWith('remove')
                  const key = `${notif.id}-${i}`

                  return (
                    <div key={key} className="flex items-center justify-between rounded-lg bg-bg-surface px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <item.icon className={`h-3 w-3 shrink-0 ${isRemove ? 'text-status-failed' : 'text-status-scheduled'}`} />
                        <span className="text-sm font-medium truncate">{item.value}</span>
                        <span className="text-xs text-text-muted truncate">{item.reason}</span>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs shrink-0 ml-2"
                        disabled={processing === key}
                        onClick={async () => {
                          setProcessing(key)
                          await onAccept(notif.id, item.type, item.value)
                          setProcessing(null)
                        }}
                      >
                        <Check className="h-3 w-3 mr-1" />
                        {isRemove ? 'Remove' : 'Follow'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/research-suggestions.tsx
git commit -m "feat: research suggestions banner component"
```

---

### Task 3: Research page — Active targets component

**Files:**
- Create: `src/components/dashboard/research-targets.tsx`

- [ ] **Step 1: Create the component**

```typescript
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { X, Plus, Hash, Users } from 'lucide-react'

interface ResearchTargetsProps {
  terms: string[]
  handles: string[]
  discoveredTerms: string[]
  discoveredHandles: string[]
  onAddTerm: (term: string) => void
  onRemoveTerm: (term: string) => void
  onAddHandle: (handle: string) => void
  onRemoveHandle: (handle: string) => void
}

export function ResearchTargets({
  terms, handles, discoveredTerms, discoveredHandles,
  onAddTerm, onRemoveTerm, onAddHandle, onRemoveHandle,
}: ResearchTargetsProps) {
  const [newTerm, setNewTerm] = useState('')
  const [newHandle, setNewHandle] = useState('')

  return (
    <div className="rounded-xl border border-border bg-bg-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h2 className="text-base font-medium">Active Research Targets</h2>
        <p className="text-xs text-text-muted mt-0.5">Accounts and terms your AI strategists monitor</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-border">
        {/* Accounts */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-text-muted" />
            <h3 className="text-sm font-medium">Accounts</h3>
            <span className="text-[10px] text-text-muted bg-bg-base rounded-full px-2 py-0.5">{handles.length}</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="@handle"
              value={newHandle}
              onChange={(e) => setNewHandle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newHandle.trim()) {
                  onAddHandle(newHandle.trim().replace(/^@/, ''))
                  setNewHandle('')
                }
              }}
              className="flex-1 rounded-lg bg-bg-base border border-border px-3 py-1.5 text-xs focus:outline-none focus:border-accent/60"
            />
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => {
                if (newHandle.trim()) {
                  onAddHandle(newHandle.trim().replace(/^@/, ''))
                  setNewHandle('')
                }
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {handles.map((handle) => {
              const isDiscovered = discoveredHandles.includes(handle)
              return (
                <span
                  key={handle}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                    isDiscovered
                      ? 'bg-accent/10 text-accent border border-accent/20'
                      : 'bg-bg-base text-text-secondary border border-border'
                  }`}
                >
                  @{handle}
                  <button onClick={() => onRemoveHandle(handle)} className="hover:text-status-failed">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )
            })}
          </div>
        </div>

        {/* Terms / Hashtags */}
        <div className="p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Hash className="h-3.5 w-3.5 text-text-muted" />
            <h3 className="text-sm font-medium">Search Terms</h3>
            <span className="text-[10px] text-text-muted bg-bg-base rounded-full px-2 py-0.5">{terms.length}</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="hashtag or search term"
              value={newTerm}
              onChange={(e) => setNewTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newTerm.trim()) {
                  onAddTerm(newTerm.trim())
                  setNewTerm('')
                }
              }}
              className="flex-1 rounded-lg bg-bg-base border border-border px-3 py-1.5 text-xs focus:outline-none focus:border-accent/60"
            />
            <Button
              size="sm"
              variant="outline"
              className="text-xs"
              onClick={() => {
                if (newTerm.trim()) {
                  onAddTerm(newTerm.trim())
                  setNewTerm('')
                }
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {terms.map((term) => {
              const isDiscovered = discoveredTerms.includes(term)
              return (
                <span
                  key={term}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs ${
                    isDiscovered
                      ? 'bg-accent/10 text-accent border border-accent/20'
                      : 'bg-bg-base text-text-secondary border border-border'
                  }`}
                >
                  {term}
                  <button onClick={() => onRemoveTerm(term)} className="hover:text-status-failed">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/research-targets.tsx
git commit -m "feat: active research targets component with add/remove"
```

---

### Task 4: Redesign Research page

**Files:**
- Modify: `src/app/(dashboard)/research/page.tsx` (full rewrite)

- [ ] **Step 1: Rewrite the research page**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { ResearchReportCard } from '@/components/dashboard/research-report-card'
import { ResearchSuggestions } from '@/components/dashboard/research-suggestions'
import { ResearchTargets } from '@/components/dashboard/research-targets'
import { Button } from '@/components/ui/button'
import { Sparkles, Loader2, Search } from 'lucide-react'

type Report = Database['public']['Tables']['research_reports']['Row']

function isAgentReport(body: any): boolean {
  return !!(body?.summary || body?.content_ideas || body?.trending_topics || body?.competitor_strategies || body?.type)
}

function getReportType(body: any): string {
  if (body?.type === 'x_strategy') return 'x_strategy'
  if (body?.type === 'ig_strategy') return 'ig_strategy'
  if (body?.type === 'performance') return 'performance'
  return 'other'
}

export default function ResearchPage() {
  const supabase = createClient()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [filter, setFilter] = useState<'all' | 'x_strategy' | 'ig_strategy' | 'performance'>('all')

  // Notifications
  const [notifications, setNotifications] = useState<any[]>([])

  // Research targets
  const [terms, setTerms] = useState<string[]>([])
  const [handles, setHandles] = useState<string[]>([])
  const [discoveredTerms, setDiscoveredTerms] = useState<string[]>([])
  const [discoveredHandles, setDiscoveredHandles] = useState<string[]>([])

  async function loadAll() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Load reports
    const { data: reportData } = await supabase
      .from('research_reports')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })

    const aiReports = (reportData ?? []).filter((r) => isAgentReport(r.body))
    setReports(aiReports)

    // Load notifications
    const notifRes = await fetch('/api/notifications')
    if (notifRes.ok) {
      const notifData = await notifRes.json()
      setNotifications(
        (notifData.notifications ?? []).filter((n: any) => n.type === 'discovery' && !n.acted_on)
      )
    }

    // Load research settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('settings')
      .eq('id', user.id)
      .single()

    const settings = (profile?.settings as any) ?? {}
    setTerms(settings.research_terms ?? [])
    setHandles(settings.competitor_handles ?? [])
    setDiscoveredTerms(settings.discovered_terms ?? [])
    setDiscoveredHandles(settings.discovered_handles ?? [])

    setLoading(false)
  }

  useEffect(() => { loadAll() }, [])

  async function handleNewResearch() {
    setTriggering(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Step 1: Sync Twitter data
      await fetch('/api/research/sync', { method: 'POST' })

      // Step 2: Sync Instagram data
      await fetch('/api/research/sync-instagram', { method: 'POST' })

      // Step 3: Trigger all three agents
      for (const agent of ['x-strategist', 'ig-strategist', 'performance-analyst']) {
        await fetch('/api/agent/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            agent,
            profile_id: user.id,
            title: `Analyze and create ${agent} report`,
          }),
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

    const update: any = { profile_id: user.id }
    if (action === 'add_account') update.add_handles = [value]
    if (action === 'add_hashtag') update.add_terms = [value]
    if (action === 'remove_account') update.remove_handles = [value]
    if (action === 'remove_hashtag') update.remove_terms = [value]

    // Update settings
    const res = await fetch('/api/agent/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    })

    if (res.ok) {
      const data = await res.json()
      setTerms(data.research_terms ?? [])
      setHandles(data.competitor_handles ?? [])
      setDiscoveredTerms(data.discovered_terms ?? [])
      setDiscoveredHandles(data.discovered_handles ?? [])
    }

    // TODO: If add_account, also follow via platform API (future enhancement)
  }

  async function handleDismissNotification(notifId: string) {
    await fetch(`/api/notifications/${notifId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acted_on: true, read: true }),
    })
    setNotifications((prev) => prev.filter((n) => n.id !== notifId))
  }

  async function handleAddTerm(term: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const currentSettings = (await supabase.from('profiles').select('settings').eq('id', user.id).single()).data?.settings as any ?? {}
    const newTerms = [...new Set([...(currentSettings.research_terms ?? []), term])]
    await supabase.from('profiles').update({ settings: { ...currentSettings, research_terms: newTerms } }).eq('id', user.id)
    setTerms(newTerms)
  }

  async function handleRemoveTerm(term: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const currentSettings = (await supabase.from('profiles').select('settings').eq('id', user.id).single()).data?.settings as any ?? {}
    const newTerms = (currentSettings.research_terms ?? []).filter((t: string) => t !== term)
    await supabase.from('profiles').update({ settings: { ...currentSettings, research_terms: newTerms } }).eq('id', user.id)
    setTerms(newTerms)
  }

  async function handleAddHandle(handle: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const currentSettings = (await supabase.from('profiles').select('settings').eq('id', user.id).single()).data?.settings as any ?? {}
    const newHandles = [...new Set([...(currentSettings.competitor_handles ?? []), handle])]
    await supabase.from('profiles').update({ settings: { ...currentSettings, competitor_handles: newHandles } }).eq('id', user.id)
    setHandles(newHandles)
  }

  async function handleRemoveHandle(handle: string) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const currentSettings = (await supabase.from('profiles').select('settings').eq('id', user.id).single()).data?.settings as any ?? {}
    const newHandles = (currentSettings.competitor_handles ?? []).filter((h: string) => h !== handle)
    await supabase.from('profiles').update({ settings: { ...currentSettings, competitor_handles: newHandles } }).eq('id', user.id)
    setHandles(newHandles)
  }

  const filteredReports = filter === 'all'
    ? reports
    : reports.filter((r) => getReportType(r.body as any) === filter)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-light">Research</h1>
          {reports.length > 0 && (
            <p className="text-sm text-text-muted mt-1">{reports.length} report{reports.length !== 1 ? 's' : ''}</p>
          )}
        </div>
        <Button onClick={handleNewResearch} disabled={triggering}>
          {triggering ? (
            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
          )}
          {triggering ? 'Running...' : 'New Research'}
        </Button>
      </div>

      {/* Suggestions */}
      <ResearchSuggestions
        notifications={notifications}
        onAccept={handleAcceptSuggestion}
        onDismiss={handleDismissNotification}
      />

      {/* Active Targets */}
      <ResearchTargets
        terms={terms}
        handles={handles}
        discoveredTerms={discoveredTerms}
        discoveredHandles={discoveredHandles}
        onAddTerm={handleAddTerm}
        onRemoveTerm={handleRemoveTerm}
        onAddHandle={handleAddHandle}
        onRemoveHandle={handleRemoveHandle}
      />

      {/* Report filter tabs */}
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
              filter === key
                ? 'bg-accent text-white'
                : 'bg-bg-elevated text-text-secondary hover:text-text-primary'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Reports */}
      {filteredReports.length === 0 ? (
        <div className="rounded-xl border border-border bg-bg-surface p-16 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10">
            <Search className="h-6 w-6 text-accent" />
          </div>
          <p className="text-text-primary font-medium">No reports yet</p>
          <p className="text-sm text-text-muted mt-1.5 max-w-sm mx-auto">
            Click &ldquo;New Research&rdquo; to have your AI strategists analyze the market and your performance.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredReports.map((report, i) => (
            <ResearchReportCard
              key={report.id}
              type={report.type}
              title={report.title}
              createdAt={report.created_at}
              body={report.body}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add 'src/app/(dashboard)/research/page.tsx'
git commit -m "feat: redesign research page with suggestions, targets, and report tabs"
```

---

### Task 5: Update ResearchReportCard for new report types

**Files:**
- Modify: `src/components/dashboard/research-report-card.tsx`

- [ ] **Step 1: Add support for x_strategy, ig_strategy, and performance report types**

The card already handles agent reports with `summary`, `content_ideas`, `trending_topics`, `competitor_strategies`, etc. For the new types, add these sections to the expanded view:

Add after the existing `hashtag_recommendations` section (before the closing of the `isAgent` block):

```tsx
{/* Reply Opportunities (X Strategy) */}
{body.reply_opportunities?.length > 0 && (
  <section className="space-y-3">
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-sky-500/10">
        <MessageCircle className="h-3.5 w-3.5 text-sky-400" />
      </div>
      <h4 className="text-sm font-medium text-text-primary">Reply Opportunities</h4>
    </div>
    <div className="grid gap-2">
      {body.reply_opportunities.map((opp: any, i: number) => (
        <div key={i} className="rounded-lg bg-bg-base px-4 py-3 border border-border/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-sm font-medium text-text-primary">{opp.author}</span>
            {opp.tweet_url && (
              <a href={opp.tweet_url} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">
                View tweet
              </a>
            )}
          </div>
          <p className="text-xs text-text-secondary">{opp.why}</p>
        </div>
      ))}
    </div>
  </section>
)}

{/* Trending Formats (IG Strategy) */}
{body.trending_formats?.length > 0 && (
  <section className="space-y-3">
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/10">
        <Video className="h-3.5 w-3.5 text-purple-400" />
      </div>
      <h4 className="text-sm font-medium text-text-primary">Trending Formats</h4>
    </div>
    <div className="grid gap-2">
      {body.trending_formats.map((fmt: any, i: number) => (
        <div key={i} className="rounded-lg bg-bg-base px-4 py-3 border border-border/50">
          <p className="text-sm font-medium text-text-primary">{fmt.format}</p>
          <p className="text-xs text-text-secondary mt-1">{fmt.why}</p>
          {fmt.example_accounts?.length > 0 && (
            <p className="text-xs text-accent mt-1">{fmt.example_accounts.join(', ')}</p>
          )}
        </div>
      ))}
    </div>
  </section>
)}

{/* Media Style Tips (IG Strategy) */}
{body.media_style_tips?.length > 0 && (
  <section className="space-y-3">
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10">
        <Camera className="h-3.5 w-3.5 text-amber-400" />
      </div>
      <h4 className="text-sm font-medium text-text-primary">Media Style Tips</h4>
    </div>
    <div className="grid gap-2">
      {body.media_style_tips.map((tip: any, i: number) => (
        <div key={i} className="rounded-lg bg-bg-base px-4 py-3 border border-border/50">
          <p className="text-sm text-text-primary">{tip.tip}</p>
          <p className="text-xs text-text-muted mt-1">{tip.based_on}</p>
        </div>
      ))}
    </div>
  </section>
)}

{/* Top/Worst Posts (Performance) */}
{body.top_posts?.length > 0 && (
  <section className="space-y-3">
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10">
        <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
      </div>
      <h4 className="text-sm font-medium text-text-primary">Top Performing Posts</h4>
    </div>
    <div className="grid gap-2">
      {body.top_posts.map((post: any, i: number) => (
        <div key={i} className="rounded-lg bg-bg-base px-4 py-3 border border-border/50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-text-muted">{post.platform}</span>
            <span className="text-xs font-medium text-emerald-400">{post.engagement} engagement</span>
          </div>
          <p className="text-sm text-text-primary">{post.caption_preview}</p>
          <p className="text-xs text-text-secondary mt-1">{post.why}</p>
        </div>
      ))}
    </div>
  </section>
)}

{body.growth_status && (
  <div className="rounded-lg bg-bg-base border border-border/50 px-4 py-3 text-center">
    <span className="text-xs text-text-muted">Growth status: </span>
    <span className={`text-xs font-medium ${
      body.growth_status === 'growing' ? 'text-emerald-400' :
      body.growth_status === 'declining' ? 'text-status-failed' :
      'text-text-secondary'
    }`}>{body.growth_status}</span>
  </div>
)}
```

Also add `MessageCircle, Video, Camera` to the lucide-react imports.

Update the `isAgentReport` function to also detect new types:

```typescript
function isAgentReport(body: any): boolean {
  return !!(body.summary || body.content_ideas || body.trending_topics || body.competitor_strategies ||
    body.type === 'x_strategy' || body.type === 'ig_strategy' || body.type === 'performance' ||
    body.reply_opportunities || body.trending_formats || body.top_posts)
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/dashboard/research-report-card.tsx
git commit -m "feat: support x_strategy, ig_strategy, performance report types in cards"
```
