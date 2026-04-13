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
      {/* Metric Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="New messages" value={messagesRes.count ?? 0} icon={<MessageSquare className="h-5 w-5" />} statusLabel="LIVE" />
        <MetricCard label="Pending approval" value={draftsRes.count ?? 0} icon={<Clock className="h-5 w-5" />} statusLabel="ACTION REQUIRED" />
        <MetricCard label="Scheduled today" value={scheduledRes.count ?? 0} icon={<CalendarDays className="h-5 w-5" />} statusLabel="ON TRACK" />
        <MetricCard label="Connected platforms" value={platformsRes.count ?? 0} icon={<Link2 className="h-5 w-5" />} statusLabel="ACTIVE" />
      </div>

      <div className="grid grid-cols-2 gap-8">
        {/* Pending Approvals */}
        <div className="space-y-4">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-xl text-on-surface">Pending Approvals</h2>
              <p className="text-sm text-on-surface-variant mt-1">AI-generated drafts awaiting final refinement</p>
            </div>
            <a href="/content" className="text-primary text-sm">View All Drafts</a>
          </div>
          {(!pendingPosts || pendingPosts.length === 0) ? (
            <div className="bg-surface-container-low rounded-xl p-6 text-center">
              <p className="text-on-surface-variant">No pending approvals. Your assistants will create drafts here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingPosts.map((post: any) => {
                const platform = (post as any).platform_accounts?.platforms
                return (
                  <div key={post.id} className="flex items-center justify-between bg-surface-container-low rounded-xl px-5 py-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: platform?.color ?? '#666' }} />
                      <p className="truncate text-sm text-on-surface">{post.caption || 'No caption'}</p>
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
          <h2 className="font-display text-xl text-on-surface">Hot Leads</h2>
          {(!hotLeads || hotLeads.length === 0) ? (
            <div className="bg-surface-container-low rounded-xl p-6 text-center">
              <p className="text-on-surface-variant">No leads yet. Leads will appear here when clients reach out.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {hotLeads.map((lead: any) => {
                const conversation = (lead as any).conversations
                const platform = conversation?.platform_accounts?.platforms
                return (
                  <div key={lead.id} className="flex items-center justify-between bg-surface-container-low rounded-xl px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: platform?.color ?? '#666' }} />
                      <div>
                        <p className="text-sm font-medium text-on-surface">{conversation?.contact_name ?? 'Unknown'}</p>
                        <p className="text-xs text-on-surface-variant">{conversation?.contact_handle}</p>
                      </div>
                    </div>
                    {lead.score && (
                      <span className="bg-primary/15 text-primary rounded-full px-2.5 py-0.5 text-xs font-medium">
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

      {/* This Week (formerly Scheduled Today) */}
      <div className="space-y-4">
        <h2 className="font-display text-xl text-on-surface">This Week</h2>
        {(!todayPosts || todayPosts.length === 0) ? (
          <div className="bg-surface-container-low rounded-xl p-6 text-center">
            <p className="text-on-surface-variant">Nothing scheduled for today.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {todayPosts.map((post: any) => {
              const platform = (post as any).platform_accounts?.platforms
              const time = post.scheduled_at ? new Date(post.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''
              return (
                <div key={post.id} className="flex items-center gap-4 bg-surface-container-low rounded-xl px-5 py-4">
                  <span className="text-sm text-on-surface-variant w-16">{time}</span>
                  <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: platform?.color ?? '#666' }} />
                  <p className="truncate text-sm text-on-surface flex-1">{post.caption || 'No caption'}</p>
                  <StatusBadge status={post.status} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* This Week Stats */}
      <div className="space-y-4">
        <h2 className="font-display text-xl text-on-surface">This Week</h2>
        <div className="bg-surface-container-low rounded-xl p-6 text-center">
          <p className="text-on-surface-variant">No data yet. Stats will appear once your platforms are active.</p>
        </div>
      </div>
    </div>
  )
}
