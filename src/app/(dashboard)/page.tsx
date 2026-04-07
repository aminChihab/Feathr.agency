// src/app/(dashboard)/page.tsx
import { createClient } from '@/lib/supabase/server'
import { MetricCard } from '@/components/dashboard/metric-card'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { MessageSquare, Clock, CalendarDays, Link2 } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Metric queries
  const [messagesRes, draftsRes, scheduledRes, platformsRes] = await Promise.all([
    supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('status', 'new'),
    supabase
      .from('content_calendar')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('status', 'draft'),
    supabase
      .from('content_calendar')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .in('status', ['approved', 'scheduled'])
      .gte('scheduled_at', new Date().toISOString().split('T')[0])
      .lt('scheduled_at', new Date(Date.now() + 86400000).toISOString().split('T')[0]),
    supabase
      .from('platform_accounts')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('status', 'connected'),
  ])

  // Pending approvals
  const { data: pendingPosts } = await supabase
    .from('content_calendar')
    .select('id, caption, scheduled_at, status, platform_account_id, platform_accounts(platforms(name, color))')
    .eq('profile_id', user.id)
    .eq('status', 'draft')
    .order('scheduled_at', { ascending: true })
    .limit(5)

  // Hot leads
  const { data: hotLeads } = await supabase
    .from('leads')
    .select('id, notes, score, status, conversations(contact_name, contact_handle, platform_accounts(platforms(name, color)))')
    .eq('profile_id', user.id)
    .eq('status', 'new')
    .order('score', { ascending: false })
    .limit(5)

  // Scheduled today
  const todayStart = new Date().toISOString().split('T')[0]
  const tomorrowStart = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  const { data: todayPosts } = await supabase
    .from('content_calendar')
    .select('id, caption, scheduled_at, status, platform_accounts(platforms(name, color))')
    .eq('profile_id', user.id)
    .in('status', ['approved', 'scheduled', 'posted'])
    .gte('scheduled_at', todayStart)
    .lt('scheduled_at', tomorrowStart)
    .order('scheduled_at', { ascending: true })

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-light">Dashboard</h1>

      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="New messages" value={messagesRes.count ?? 0} icon={<MessageSquare className="h-5 w-5" />} />
        <MetricCard label="Pending approval" value={draftsRes.count ?? 0} icon={<Clock className="h-5 w-5" />} />
        <MetricCard label="Scheduled today" value={scheduledRes.count ?? 0} icon={<CalendarDays className="h-5 w-5" />} />
        <MetricCard label="Connected platforms" value={platformsRes.count ?? 0} icon={<Link2 className="h-5 w-5" />} />
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Pending Approvals */}
        <div className="space-y-4">
          <h2 className="text-lg font-light text-text-secondary">Pending approvals</h2>
          {(!pendingPosts || pendingPosts.length === 0) ? (
            <div className="rounded-lg border border-border bg-bg-surface p-6 text-center">
              <p className="text-text-muted">No pending approvals. Your assistants will create drafts here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pendingPosts.map((post: any) => {
                const platform = (post as any).platform_accounts?.platforms
                return (
                  <div key={post.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-surface px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: platform?.color ?? '#666' }} />
                      <p className="truncate text-sm">{post.caption || 'No caption'}</p>
                    </div>
                    <StatusBadge status={post.status} />
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Hot Leads */}
        <div className="space-y-4">
          <h2 className="text-lg font-light text-text-secondary">Hot leads</h2>
          {(!hotLeads || hotLeads.length === 0) ? (
            <div className="rounded-lg border border-border bg-bg-surface p-6 text-center">
              <p className="text-text-muted">No leads yet. Leads will appear here when clients reach out.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {hotLeads.map((lead: any) => {
                const conversation = (lead as any).conversations
                const platform = conversation?.platform_accounts?.platforms
                return (
                  <div key={lead.id} className="flex items-center justify-between rounded-lg border border-border bg-bg-surface px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: platform?.color ?? '#666' }} />
                      <div>
                        <p className="text-sm font-medium">{conversation?.contact_name ?? 'Unknown'}</p>
                        <p className="text-xs text-text-muted">{conversation?.contact_handle}</p>
                      </div>
                    </div>
                    {lead.score && (
                      <span className="rounded-full bg-accent/15 px-2.5 py-0.5 text-xs font-medium text-accent">
                        {lead.score}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Scheduled Today */}
      <div className="space-y-4">
        <h2 className="text-lg font-light text-text-secondary">Scheduled today</h2>
        {(!todayPosts || todayPosts.length === 0) ? (
          <div className="rounded-lg border border-border bg-bg-surface p-6 text-center">
            <p className="text-text-muted">Nothing scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayPosts.map((post: any) => {
              const platform = (post as any).platform_accounts?.platforms
              const time = post.scheduled_at ? new Date(post.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''
              return (
                <div key={post.id} className="flex items-center gap-4 rounded-lg border border-border bg-bg-surface px-4 py-3">
                  <span className="text-sm text-text-muted w-16">{time}</span>
                  <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: platform?.color ?? '#666' }} />
                  <p className="truncate text-sm flex-1">{post.caption || 'No caption'}</p>
                  <StatusBadge status={post.status} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* This Week Stats */}
      <div className="space-y-4">
        <h2 className="text-lg font-light text-text-secondary">This week</h2>
        <div className="rounded-lg border border-border bg-bg-surface p-6 text-center">
          <p className="text-text-muted">No data yet. Stats will appear once your platforms are active.</p>
        </div>
      </div>
    </div>
  )
}
