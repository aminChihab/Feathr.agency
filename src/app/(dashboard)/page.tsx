// src/app/(dashboard)/page.tsx
import { createClient } from '@/lib/supabase/server'
import { MetricCard } from '@/components/dashboard/metric-card'
import { StatusBadge } from '@/components/dashboard/status-badge'
import Link from 'next/link'
import {
  MessageSquare, Clock, CalendarDays, Link2,
  ChevronLeft, ChevronRight, CheckCircle2, XCircle, Flame,
} from 'lucide-react'

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

  // Pending approvals with media
  const { data: pendingPosts } = await supabase
    .from('content_calendar')
    .select('id, caption, scheduled_at, status, media_ids, platform_account_id, platform_accounts(platforms(name, color))')
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

  // This week's scheduled posts
  const now = new Date()
  const dayOfWeek = now.getDay()
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
  const monday = new Date(now)
  monday.setDate(now.getDate() + mondayOffset)
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 7)

  const { data: weekPosts } = await supabase
    .from('content_calendar')
    .select('id, caption, scheduled_at, status, platform_accounts(platforms(name, color))')
    .eq('profile_id', user.id)
    .in('status', ['approved', 'scheduled', 'posted'])
    .gte('scheduled_at', monday.toISOString())
    .lt('scheduled_at', sunday.toISOString())
    .order('scheduled_at', { ascending: true })

  // Build calendar days
  const weekDays = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
  const calendarDays = weekDays.map((label, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const dayNum = date.getDate()
    const isToday = date.toDateString() === now.toDateString()
    const isWeekend = i >= 5
    const postsOnDay = (weekPosts ?? []).filter((p: any) => {
      if (!p.scheduled_at) return false
      const postDate = new Date(p.scheduled_at)
      return postDate.getDate() === dayNum && postDate.getMonth() === date.getMonth()
    })
    return { label, dayNum, isToday, isWeekend, hasPost: postsOnDay.length > 0 }
  })

  // Next upcoming event
  const nextEvent = (weekPosts ?? []).find((p: any) => {
    if (!p.scheduled_at) return false
    return new Date(p.scheduled_at) >= now
  })

  return (
    <div className="space-y-10">
      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          label="New messages"
          value={messagesRes.count ?? 0}
          icon={<MessageSquare className="h-5 w-5" />}
          statusLabel="Live"
          statusColor="text-primary"
        />
        <MetricCard
          label="Pending approval"
          value={draftsRes.count ?? 0}
          icon={<Clock className="h-5 w-5" />}
          statusLabel="Action Required"
          statusColor="text-tertiary"
        />
        <MetricCard
          label="Scheduled today"
          value={scheduledRes.count ?? 0}
          icon={<CalendarDays className="h-5 w-5" />}
          statusLabel="On Track"
          statusColor="text-secondary"
        />
        <MetricCard
          label="Connected platforms"
          value={platformsRes.count ?? 0}
          icon={<Link2 className="h-5 w-5" />}
          statusLabel="Active"
          statusColor="text-on-surface-variant"
        />
      </div>

      {/* Main Sections: Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-8 items-start">

        {/* Pending Approvals (7/12 width) */}
        <section className="col-span-12 lg:col-span-7 bg-surface-container-lowest/50 rounded-2xl p-8 border border-outline-variant/10">
          <div className="flex justify-between items-end mb-10">
            <div>
              <h3 className="font-display text-2xl text-on-surface">Pending Approvals</h3>
              <p className="text-on-surface-variant text-xs mt-1">AI-generated drafts awaiting final refinement</p>
            </div>
            <Link href="/content" className="text-primary text-xs font-semibold hover:underline">
              View All Drafts
            </Link>
          </div>

          {(!pendingPosts || pendingPosts.length === 0) ? (
            <div className="text-center py-12">
              <p className="text-on-surface-variant">No pending approvals. Your assistants will create drafts here.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {pendingPosts.map((post: any) => {
                const platform = (post as any).platform_accounts?.platforms
                return (
                  <div key={post.id} className="group flex gap-6 items-center p-4 rounded-xl hover:bg-surface-container-high transition-colors">
                    {/* Thumbnail placeholder */}
                    <div className="w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-surface-container">
                      <div className="w-full h-full flex items-center justify-center text-on-surface-variant/30">
                        <CalendarDays className="h-8 w-8" />
                      </div>
                    </div>
                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex gap-2 mb-2">
                        <span className="px-2 py-0.5 bg-surface-container-highest rounded text-[10px] text-on-surface-variant font-medium">
                          {platform?.name ?? 'Unknown'}
                        </span>
                        <span className="px-2 py-0.5 bg-primary/10 rounded text-[10px] text-primary font-medium">
                          Draft
                        </span>
                      </div>
                      <h4 className="font-body text-sm font-semibold mb-1 truncate text-on-surface">
                        {post.caption?.slice(0, 60) || 'No caption'}
                      </h4>
                      <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                        {post.caption || ''}
                      </p>
                    </div>
                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <button className="p-2 rounded-full hover:bg-primary/20 text-primary transition-colors">
                        <CheckCircle2 className="h-5 w-5" />
                      </button>
                      <button className="p-2 rounded-full hover:bg-error/20 text-error transition-colors">
                        <XCircle className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        {/* Right Column (5/12 width) */}
        <section className="col-span-12 lg:col-span-5 flex flex-col gap-8">

          {/* Hot Leads Panel */}
          <div className="bg-surface-container-low rounded-2xl p-8 border border-outline-variant/10">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-display text-2xl text-on-surface">Hot Leads</h3>
              <Flame className="h-5 w-5 text-secondary" />
            </div>

            {(!hotLeads || hotLeads.length === 0) ? (
              <p className="text-on-surface-variant text-sm text-center py-6">No leads yet. Leads will appear here when clients reach out.</p>
            ) : (
              <div className="space-y-4">
                {hotLeads.map((lead: any) => {
                  const conversation = (lead as any).conversations
                  const name = conversation?.contact_name ?? 'Unknown'
                  const initial = name.charAt(0).toUpperCase()
                  return (
                    <div key={lead.id} className="flex justify-between items-center p-3 rounded-lg hover:bg-surface-container-high transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-surface-container flex items-center justify-center font-display text-primary text-xl">
                          {initial}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{name}</div>
                          <div className="text-[10px] uppercase tracking-wider text-on-surface-variant">
                            {conversation?.contact_handle ?? ''}
                          </div>
                        </div>
                      </div>
                      {lead.score && (
                        <div className="flex flex-col items-end">
                          <span className="text-primary font-display text-lg">{lead.score}</span>
                          <span className="text-[9px] uppercase opacity-40">Lead Score</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Calendar Preview */}
          <div className="bg-surface-container-lowest border border-outline-variant/10 rounded-2xl p-8 overflow-hidden relative">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-display text-2xl text-on-surface">This Week</h3>
              <div className="flex gap-1">
                <button className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-surface-container text-on-surface-variant">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* 7-Day Grid */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((day) => (
                <div key={day.label} className="text-center">
                  <div className="text-[9px] text-on-surface-variant uppercase mb-2">{day.label}</div>
                  <div className={`h-12 flex flex-col items-center justify-center rounded-lg border transition-colors ${
                    day.isToday
                      ? 'bg-primary/20 border-primary/20'
                      : 'bg-surface-container-low border-outline-variant/5'
                  } ${day.isWeekend ? 'opacity-50' : ''}`}>
                    <span className={`text-xs ${day.isToday ? 'text-primary font-bold' : ''}`}>
                      {day.dayNum}
                    </span>
                    {day.hasPost && (
                      <div className="w-1 h-1 bg-primary rounded-full mt-1" />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Next Event */}
            {nextEvent && (
              <div className="mt-6 pt-6 border-t border-outline-variant/10">
                <div className="flex items-center gap-3 text-xs">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-on-surface-variant">
                    {(nextEvent as any).caption?.slice(0, 40) ?? 'Scheduled post'} —{' '}
                    {new Date((nextEvent as any).scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
