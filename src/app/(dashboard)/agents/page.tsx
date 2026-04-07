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

export default function AgentsPage() {
  const supabase = createClient()
  const [agents, setAgents] = useState<Agent[]>([])
  const [drafts, setDrafts] = useState<DraftPost[]>([])
  const [loading, setLoading] = useState(true)

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
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  const aiAgents = agents.filter((a) => a.type === 'ai')
  const scriptAgents = agents.filter((a) => a.type === 'script')

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-light">Assistants</h1>

      {/* AI Assistants */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">AI Assistants</h2>
        <div className="grid grid-cols-2 gap-4">
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
        </div>
      </div>

      {/* Automated Scripts */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">Automated</h2>
        <div className="grid grid-cols-2 gap-4">
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
        </div>
      </div>

      {/* Approval Queue */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">Pending Approvals</h2>
        {drafts.length === 0 ? (
          <div className="rounded-lg border border-border bg-bg-surface p-6 text-center">
            <p className="text-text-muted">No pending actions. Your assistants will submit work here for your approval.</p>
          </div>
        ) : (
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
        )}
      </div>

      {/* Activity Log */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium uppercase tracking-wider text-text-muted">Activity Log</h2>
        <div className="rounded-lg border border-border bg-bg-surface p-6 text-center">
          <p className="text-text-muted">No activity yet. Activity will appear here once your assistants are running.</p>
        </div>
      </div>
    </div>
  )
}
