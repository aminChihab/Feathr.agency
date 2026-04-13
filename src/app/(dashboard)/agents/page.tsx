// src/app/(dashboard)/agents/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { AgentCard } from '@/components/dashboard/agent-card'
import { ApprovalItem } from '@/components/dashboard/approval-item'

type Agent = Database['public']['Tables']['agents']['Row']

interface DraftPost {
  id: string
  caption: string | null
  scheduled_at: string | null
  platform_name: string
  platform_color: string
}

interface ActivityEntry {
  agentName: string
  description: string
  time: string
  dotColor: string
  opacity?: string
}

export default function AgentsPage() {
  const supabase = createClient()
  const [agents, setAgents] = useState<Agent[]>([])
  const [drafts, setDrafts] = useState<DraftPost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: agentsData } = await supabase
        .from('agents')
        .select('*')
        .eq('profile_id', user.id)
        .order('created_at')

      setAgents(agentsData ?? [])

      const { data: draftsData } = await supabase
        .from('content_calendar')
        .select('id, caption, scheduled_at, platform_accounts(platforms(name, color))')
        .eq('profile_id', user.id)
        .eq('status', 'draft')
        .order('scheduled_at', { ascending: true })

      setDrafts(
        (draftsData ?? []).map((d: any) => ({
          id: d.id,
          caption: d.caption,
          scheduled_at: d.scheduled_at,
          platform_name: d.platform_accounts?.platforms?.name ?? 'Unknown',
          platform_color: d.platform_accounts?.platforms?.color ?? '#666',
        }))
      )

      setLoading(false)
    }
    load()
  }, [])

  async function handleApprove(id: string) {
    await supabase.from('content_calendar').update({ status: 'approved' }).eq('id', id)
    setDrafts((prev) => prev.filter((d) => d.id !== id))
  }

  async function handleReject(id: string) {
    await supabase.from('content_calendar').delete().eq('id', id)
    setDrafts((prev) => prev.filter((d) => d.id !== id))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const aiAgents = agents.filter((a) => a.type === 'ai')
  const scriptAgents = agents.filter((a) => a.type === 'script')
  const activeCount = agents.filter((a) => a.status === 'active').length

  // Build activity log from agents with recent activity
  const activityLog: ActivityEntry[] = agents
    .filter(a => a.last_activity_at)
    .sort((a, b) => new Date(b.last_activity_at!).getTime() - new Date(a.last_activity_at!).getTime())
    .slice(0, 5)
    .map((a, i) => {
      const diffMs = Date.now() - new Date(a.last_activity_at!).getTime()
      const minutes = Math.floor(diffMs / 60000)
      let timeStr = 'just now'
      if (minutes >= 60) {
        const hours = Math.floor(minutes / 60)
        timeStr = `${hours}h ago`
      } else if (minutes > 0) {
        timeStr = `${minutes}m ago`
      }
      return {
        agentName: a.name,
        description: a.last_activity_description ?? 'Activity recorded',
        time: timeStr,
        dotColor: a.status === 'active' ? 'bg-primary' : a.status === 'error' ? 'bg-error' : 'bg-tertiary',
        opacity: i > 2 ? 'opacity-40' : undefined,
      }
    })

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#131313]/80 backdrop-blur-xl flex justify-between items-center h-20 px-10 shadow-2xl shadow-black/40">
        <h2 className="font-display text-3xl font-light text-primary">Assistants</h2>
        <div className="flex items-center gap-8">
          <div className="relative hidden lg:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
            <input
              className="bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:ring-1 focus:ring-primary/30 transition-all outline-none font-body text-on-surface placeholder:text-on-surface-variant/50"
              placeholder="Search agents..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <button className="bg-gradient-to-br from-primary to-primary-container text-on-primary font-semibold px-5 py-2.5 rounded-lg text-sm shadow-lg shadow-primary/10 hover:opacity-90 transition-opacity font-body">
              Deploy New Agent
            </button>
          </div>
        </div>
      </header>

      <div className="p-10 space-y-6">
      {/* SECTION 1: AI Assistants */}
      <section>
        <div className="flex items-baseline justify-between mb-8">
          <div>
            <h3 className="font-display text-4xl mb-2">AI Assistants</h3>
            <p className="text-on-surface-variant font-body tracking-tight">High-level cognitive agents managing strategy and synthesis.</p>
          </div>
          <span className="text-xs font-mono text-primary/60 tracking-widest uppercase">
            {String(activeCount).padStart(2, '0')} Active
          </span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {aiAgents.map((agent) => (
            <AgentCard
              key={agent.id}
              name={agent.name}
              type={agent.type as 'ai' | 'script'}
              description={agent.description}
              status={agent.status}
              lastActivityAt={agent.last_activity_at}
              lastActivityDescription={agent.last_activity_description}
            />
          ))}
          {aiAgents.length === 0 && (
            <div className="backdrop-blur-xl bg-[rgba(42,42,42,0.4)] border border-outline/10 rounded-xl p-6 text-center text-on-surface-variant">
              <p>No AI assistants configured yet. Deploy your first agent to get started.</p>
            </div>
          )}
        </div>
      </section>

      {/* SECTION 2: Automated + Activity Log */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Automated workflows */}
        <div className="lg:col-span-2">
          <div className="flex items-baseline justify-between mb-8">
            <div>
              <h3 className="font-display text-4xl mb-2">Automated</h3>
              <p className="text-on-surface-variant font-body tracking-tight">Recurring utility tasks and data synchronization.</p>
            </div>
          </div>
          <div className="space-y-4">
            {scriptAgents.map((agent) => (
              <AgentCard
                key={agent.id}
                name={agent.name}
                type={agent.type as 'ai' | 'script'}
                description={agent.description}
                status={agent.status}
                lastActivityAt={agent.last_activity_at}
                lastActivityDescription={agent.last_activity_description}
              />
            ))}
            {scriptAgents.length === 0 && (
              <div className="bg-surface-container-low rounded-xl p-6 text-center text-on-surface-variant">
                <p>No automated scripts configured yet.</p>
              </div>
            )}
          </div>

          {/* Pending Approvals */}
          {drafts.length > 0 && (
            <div className="mt-10 space-y-3">
              <h4 className="text-[10px] uppercase tracking-widest text-on-surface-variant/60">Pending Approvals</h4>
              <div className="space-y-2">
                {drafts.map((draft) => (
                  <ApprovalItem
                    key={draft.id}
                    id={draft.id}
                    caption={draft.caption}
                    scheduledAt={draft.scheduled_at}
                    platformName={draft.platform_name}
                    platformColor={draft.platform_color}
                    onApprove={handleApprove}
                    onReject={handleReject}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Activity Log + Transparency Node */}
        <div className="bg-surface-container-lowest rounded-2xl p-8 border border-outline-variant/10">
          <h4 className="font-display text-2xl mb-6">Activity Log</h4>

          {activityLog.length === 0 ? (
            <p className="text-sm text-on-surface-variant">No activity yet. Activity will appear here once your assistants are running.</p>
          ) : (
            <div className="space-y-8 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[1px] before:bg-outline-variant/20">
              {activityLog.map((entry, i) => (
                <div key={i} className={`relative pl-8 ${entry.opacity ?? ''}`}>
                  <div className="absolute left-0 top-1 w-[22px] h-[22px] rounded-full bg-surface-container flex items-center justify-center border border-outline-variant/20">
                    <span className={`w-1.5 h-1.5 rounded-full ${entry.dotColor}`} />
                  </div>
                  <p className="text-xs text-on-surface font-semibold">{entry.agentName}</p>
                  <p className="text-[11px] text-on-surface-variant mt-1">{entry.description}</p>
                  <span className="text-[9px] uppercase tracking-widest text-on-surface-variant/40 mt-2 block">{entry.time}</span>
                </div>
              ))}
            </div>
          )}

          {/* Transparency Node */}
          <div className="mt-12 p-6 rounded-xl bg-gradient-to-br from-surface-container-high to-surface-container-low border border-primary/10">
            <div className="flex items-center gap-3 mb-4">
              <span className="material-symbols-outlined text-primary" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
              <h5 className="text-xs font-bold uppercase tracking-wider text-primary">Transparency Node</h5>
            </div>
            <p className="text-[11px] leading-relaxed text-on-surface-variant">
              All AI actions are logged with 256-bit encryption. Human oversight is required for budget escalations &gt; $500.00.
            </p>
            <button className="mt-4 text-[10px] font-bold text-on-surface hover:text-primary transition-colors flex items-center gap-2">
              View Compliance Audit <span className="material-symbols-outlined text-xs">arrow_forward</span>
            </button>
          </div>
        </div>
      </section>
      </div>
    </>
  )
}
