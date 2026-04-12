// src/app/(dashboard)/content/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { PostModal } from '@/components/dashboard/post-modal'
import { MediaGrid } from '@/components/dashboard/media-grid'
import { StatusBadge } from '@/components/dashboard/status-badge'
import {
  ChevronLeft,
  ChevronRight,
  Check,
  X,
  Edit3,
  Send,
  Plus,
  Sparkles,
  Loader2,
  Calendar as CalendarIcon,
  Grid3X3,
} from 'lucide-react'

type CalendarItem = Database['public']['Tables']['content_calendar']['Row']

interface PostWithPlatform extends CalendarItem {
  platform_name: string
  platform_color: string
}

// ─── Calendar helpers ────────────────────────────────────────────────────────

/** Returns an array of 7 Date objects for the week containing `date` (Mon→Sun). */
export function getWeekDays(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun … 6=Sat
  // Monday = day 1; shift so week starts Monday
  const diffToMon = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diffToMon)
  return Array.from({ length: 7 }, (_, i) => {
    const copy = new Date(d)
    copy.setDate(d.getDate() + i)
    return copy
  })
}

/** Returns an array of Date objects for a calendar month grid (always full weeks, Mon-first). */
export function getMonthGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  // Find Monday on/before firstDay
  const startOffset = (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1)
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - startOffset)

  // Find Sunday on/after lastDay
  const endOffset = (lastDay.getDay() === 0 ? 0 : 7 - lastDay.getDay())
  const gridEnd = new Date(lastDay)
  gridEnd.setDate(lastDay.getDate() + endOffset)

  const days: Date[] = []
  const cur = new Date(gridStart)
  while (cur <= gridEnd) {
    days.push(new Date(cur))
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

function postsForDay(posts: PostWithPlatform[], day: Date): PostWithPlatform[] {
  return posts.filter((p) => {
    if (!p.scheduled_at) return false
    return isSameDay(new Date(p.scheduled_at), day)
  })
}

// ─── Status dot color ────────────────────────────────────────────────────────
const STATUS_DOT: Record<string, string> = {
  draft: 'bg-status-draft',
  approved: 'bg-status-approved',
  scheduled: 'bg-status-scheduled',
  posted: 'bg-status-posted',
  failed: 'bg-status-failed',
}

// ─── Week View ───────────────────────────────────────────────────────────────

interface WeekViewProps {
  weekDays: Date[]
  posts: PostWithPlatform[]
  today: Date
  onEdit: (id: string) => void
}

function WeekView({ weekDays, posts, today, onEdit }: WeekViewProps) {
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

  return (
    <div className="rounded-lg border border-border bg-bg-surface overflow-hidden">
      {/* Header row */}
      <div className="grid grid-cols-7 border-b border-border">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today)
          return (
            <div
              key={i}
              className={`px-3 py-2 text-center border-r border-border last:border-r-0 ${isToday ? 'bg-accent/10' : ''}`}
            >
              <p className="text-xs text-text-muted">{DAY_LABELS[i]}</p>
              <p className={`text-sm font-medium mt-0.5 ${isToday ? 'text-accent' : 'text-text-primary'}`}>
                {day.getDate()}
              </p>
            </div>
          )
        })}
      </div>

      {/* Posts per day */}
      <div className="grid grid-cols-7 min-h-[200px]">
        {weekDays.map((day, i) => {
          const dayPosts = postsForDay(posts, day)
          const isToday = isSameDay(day, today)
          return (
            <div
              key={i}
              className={`px-2 py-2 border-r border-border last:border-r-0 space-y-1 ${isToday ? 'bg-accent/5' : ''}`}
            >
              {dayPosts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => onEdit(post.id)}
                  className="w-full text-left rounded px-2 py-1.5 text-xs bg-bg-elevated hover:bg-bg-overlay transition-colors group"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: post.platform_color }}
                    />
                    <span className="truncate text-text-muted font-medium">{post.platform_name}</span>
                  </div>
                  <p className="truncate text-text-primary leading-tight">{post.caption || 'No caption'}</p>
                  <div className="mt-1">
                    <StatusBadge status={post.status} className="text-[10px] px-1.5 py-0" />
                  </div>
                </button>
              ))}
              {dayPosts.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <span className="text-[10px] text-text-muted opacity-40">—</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Month View ──────────────────────────────────────────────────────────────

interface MonthViewProps {
  year: number
  month: number
  posts: PostWithPlatform[]
  today: Date
  onDayClick: (day: Date) => void
  selectedDay: Date | null
}

function MonthView({ year, month, posts, today, onDayClick, selectedDay }: MonthViewProps) {
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  const grid = getMonthGrid(year, month)

  return (
    <div className="rounded-lg border border-border bg-bg-surface overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAY_LABELS.map((label) => (
          <div key={label} className="px-3 py-2 text-center border-r border-border last:border-r-0">
            <p className="text-xs text-text-muted font-medium">{label}</p>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7">
        {grid.map((day, i) => {
          const isCurrentMonth = day.getMonth() === month
          const isToday = isSameDay(day, today)
          const isSelected = selectedDay ? isSameDay(day, selectedDay) : false
          const dayPosts = postsForDay(posts, day)

          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className={`
                min-h-[80px] p-2 border-r border-b border-border last:border-r-0 text-left transition-colors
                ${isCurrentMonth ? 'hover:bg-bg-elevated' : 'opacity-40'}
                ${isToday ? 'bg-accent/10' : ''}
                ${isSelected && !isToday ? 'bg-bg-elevated ring-1 ring-accent/50 ring-inset' : ''}
              `}
            >
              <p className={`text-xs font-medium mb-1 ${isToday ? 'text-accent' : isCurrentMonth ? 'text-text-primary' : 'text-text-muted'}`}>
                {day.getDate()}
              </p>
              <div className="flex flex-wrap gap-0.5">
                {dayPosts.slice(0, 5).map((post) => (
                  <span
                    key={post.id}
                    className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[post.status] ?? 'bg-text-muted'}`}
                    title={`${post.platform_name}: ${post.caption?.slice(0, 40) ?? 'No caption'}`}
                  />
                ))}
                {dayPosts.length > 5 && (
                  <span className="text-[9px] text-text-muted">+{dayPosts.length - 5}</span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Selected Day Detail ─────────────────────────────────────────────────────

interface DayDetailProps {
  day: Date
  posts: PostWithPlatform[]
  onEdit: (id: string) => void
}

function DayDetail({ day, posts, onEdit }: DayDetailProps) {
  const dayPosts = postsForDay(posts, day)
  const label = day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="mt-4 rounded-lg border border-border bg-bg-surface p-4">
      <h3 className="text-sm font-medium text-text-secondary mb-3">{label}</h3>
      {dayPosts.length === 0 ? (
        <p className="text-sm text-text-muted">No posts scheduled for this day.</p>
      ) : (
        <div className="space-y-2">
          {dayPosts.map((post) => (
            <div key={post.id} className="flex items-start justify-between rounded-lg border border-border bg-bg-elevated px-3 py-2 overflow-hidden">
              <div className="flex items-start gap-2 min-w-0 flex-1">
                <span className="h-2 w-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: post.platform_color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm break-words whitespace-pre-wrap">{post.caption || 'No caption'}</p>
                  <p className="text-xs text-text-muted mt-1">{post.platform_name} · {post.scheduled_at ? new Date(post.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                <StatusBadge status={post.status} />
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(post.id)}>
                  <Edit3 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Approval Queue ──────────────────────────────────────────────────────────

interface ApprovalQueueProps {
  drafts: PostWithPlatform[]
  onApprove: (id: string) => void
  onEdit: (id: string) => void
  onReject: (id: string) => void
}

function ApprovalQueue({ drafts, onApprove, onEdit, onReject }: ApprovalQueueProps) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-medium">Pending Approvals</h2>
          {drafts.length > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-full bg-accent text-white text-xs font-medium px-1.5">
              {drafts.length}
            </span>
          )}
        </div>
        <p className="text-xs text-text-muted">AI-generated drafts awaiting your review</p>
      </div>

      {drafts.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <div className="h-8 w-8 rounded-full bg-status-scheduled/15 flex items-center justify-center mx-auto mb-2">
            <Check className="h-4 w-4 text-status-scheduled" />
          </div>
          <p className="text-sm text-text-muted">No pending approvals — you're all caught up!</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {drafts.map((post) => {
            const time = post.scheduled_at
              ? new Date(post.scheduled_at).toLocaleString('en-US', {
                  weekday: 'short', month: 'short', day: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })
              : 'Not scheduled'

            return (
              <div key={post.id} className="px-5 py-4">
                {/* Platform + time */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: post.platform_color }}
                    />
                    <span className="text-sm font-medium">{post.platform_name}</span>
                    <StatusBadge status={post.status} />
                  </div>
                  <span className="text-xs text-text-muted">{time}</span>
                </div>

                {/* Full caption */}
                <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap break-words mb-4">
                  {post.caption || 'No caption'}
                </p>

                {/* Action buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    className="bg-status-scheduled/20 text-status-scheduled hover:bg-status-scheduled/30 border-0 font-medium"
                    onClick={() => onApprove(post.id)}
                  >
                    <Check className="h-3.5 w-3.5 mr-1.5" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-text-secondary hover:text-text-primary"
                    onClick={() => onEdit(post.id)}
                  >
                    <Edit3 className="h-3.5 w-3.5 mr-1.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    className="bg-status-failed/15 text-status-failed hover:bg-status-failed/25 border-0"
                    onClick={() => onReject(post.id)}
                  >
                    <X className="h-3.5 w-3.5 mr-1.5" />
                    Reject
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function ContentPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [posts, setPosts] = useState<PostWithPlatform[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editPost, setEditPost] = useState<CalendarItem | null>(null)
  const [posting, setPosting] = useState(false)
  const [suggesting, setSuggesting] = useState(false)

  // Calendar state
  const today = new Date()
  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        loadPosts(user.id)
      }
    }
    init()
  }, [])

  async function loadPosts(uid: string) {
    setLoading(true)
    const { data } = await supabase
      .from('content_calendar')
      .select('*, platform_accounts(platforms(name, color))')
      .eq('profile_id', uid)
      .order('scheduled_at', { ascending: false })

    const mapped: PostWithPlatform[] = (data ?? []).map((item: any) => ({
      ...item,
      platform_name: item.platform_accounts?.platforms?.name ?? 'Unknown',
      platform_color: item.platform_accounts?.platforms?.color ?? '#666',
    }))

    setPosts(mapped)
    setLoading(false)
  }

  async function handleApprove(id: string) {
    const post = posts.find((p) => p.id === id)
    const newStatus = post?.status === 'draft' ? 'approved' : 'draft'
    await supabase.from('content_calendar').update({ status: newStatus }).eq('id', id)
    if (userId) loadPosts(userId)
  }

  async function handleDelete(id: string) {
    await supabase.from('content_calendar').delete().eq('id', id)
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleRetry(id: string) {
    await supabase.from('content_calendar').update({ status: 'approved' }).eq('id', id)
    if (userId) loadPosts(userId)
  }

  function handleEdit(id: string) {
    const post = posts.find((p) => p.id === id)
    if (post) {
      setEditPost(post)
      setModalOpen(true)
    }
  }

  function handleNewPost() {
    setEditPost(null)
    setModalOpen(true)
  }

  async function handlePostNow() {
    setPosting(true)
    const res = await fetch('/api/post/process', { method: 'POST' })
    const data = await res.json()
    console.log('Post result:', data)
    if (userId) loadPosts(userId)
    setPosting(false)
  }

  async function handleSuggestPosts() {
    if (!userId) return
    setSuggesting(true)
    try {
      const res = await fetch('/api/agent/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent: 'content-writer',
          profile_id: userId,
          title: 'Plan and write posts for the next 7 days',
        }),
      })
      const data = await res.json()
      if (res.ok) {
        console.log('[content] Triggered content writer:', data.identifier)
      } else {
        console.error('[content] Failed to trigger:', data)
      }
    } catch (err) {
      console.error('[content] Error triggering:', err)
    } finally {
      setSuggesting(false)
    }
  }

  // Navigation
  function navigatePrev() {
    const d = new Date(currentDate)
    if (calendarMode === 'week') {
      d.setDate(d.getDate() - 7)
    } else {
      d.setMonth(d.getMonth() - 1)
    }
    setCurrentDate(d)
  }

  function navigateNext() {
    const d = new Date(currentDate)
    if (calendarMode === 'week') {
      d.setDate(d.getDate() + 7)
    } else {
      d.setMonth(d.getMonth() + 1)
    }
    setCurrentDate(d)
  }

  function goToToday() {
    setCurrentDate(new Date())
  }

  // Derived values
  const weekDays = getWeekDays(currentDate)
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  const weekLabel = (() => {
    const start = weekDays[0]
    const end = weekDays[6]
    const sameMonth = start.getMonth() === end.getMonth()
    if (sameMonth) {
      return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} – ${end.getDate()}, ${end.getFullYear()}`
    }
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} – ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  })()

  const monthLabel = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const aiDrafts = posts.filter((p) => p.status === 'draft' && p.ai_generated)

  if (!userId) return null

  return (
    <Tabs defaultValue="content" className="space-y-6">
      {/* Top-level tabs as page header */}
      <div className="flex items-center justify-between">
        <TabsList className="bg-transparent p-0 gap-6">
          <TabsTrigger value="content" className="px-0 pb-2 text-3xl font-light rounded-none border-b-2 data-[state=active]:border-accent data-[state=active]:text-text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-text-muted data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            Content
          </TabsTrigger>
          <TabsTrigger value="media" className="px-0 pb-2 text-3xl font-light rounded-none border-b-2 data-[state=active]:border-accent data-[state=active]:text-text-primary data-[state=inactive]:border-transparent data-[state=inactive]:text-text-muted data-[state=active]:bg-transparent data-[state=active]:shadow-none">
            Media
          </TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handlePostNow} disabled={posting} className="text-xs">
            <Send className="h-3.5 w-3.5 mr-1.5" />
            {posting ? 'Posting...' : 'Post now'}
          </Button>
          <Button variant="outline" onClick={handleNewPost} className="text-xs">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Manual post
          </Button>
          <Button onClick={handleSuggestPosts} disabled={suggesting} className="bg-accent text-white hover:bg-accent-hover">
            {suggesting ? (
              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            )}
            {suggesting ? 'Starting...' : 'Suggest posts'}
          </Button>
        </div>
      </div>

      {/* ── Content Tab ────────────────────────────────────────────────── */}
      <TabsContent value="content" className="mt-0 space-y-6">

      {/* Approval Queue */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : (
        <ApprovalQueue
          drafts={aiDrafts}
          onApprove={handleApprove}
          onEdit={handleEdit}
          onReject={handleDelete}
        />
      )}

      {/* Calendar controls */}
      <div className="space-y-4">
          {/* Calendar controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={navigatePrev} className="h-8 w-8 p-0">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={navigateNext} className="h-8 w-8 p-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToToday} className="text-xs px-3 h-8">
                Today
              </Button>
              <h2 className="text-sm font-medium text-text-secondary ml-2">
                {calendarMode === 'week' ? weekLabel : monthLabel}
              </h2>
            </div>

            {/* Week / Month toggle */}
            <div className="flex items-center bg-bg-surface rounded-lg border border-border p-0.5">
              <button
                onClick={() => setCalendarMode('week')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  calendarMode === 'week'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setCalendarMode('month')}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  calendarMode === 'month'
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-text-primary'
                }`}
              >
                Month
              </button>
            </div>
          </div>

          {/* Calendar body */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            </div>
          ) : calendarMode === 'week' ? (
            <WeekView
              weekDays={weekDays}
              posts={posts}
              today={today}
              onEdit={handleEdit}
            />
          ) : (
            <>
              <MonthView
                year={currentYear}
                month={currentMonth}
                posts={posts}
                today={today}
                onDayClick={(day) => setSelectedDay((prev) => (prev && isSameDay(prev, day) ? null : day))}
                selectedDay={selectedDay}
              />
              {selectedDay && (
                <DayDetail
                  day={selectedDay}
                  posts={posts}
                  onEdit={handleEdit}
                />
              )}
            </>
          )}

          {/* Legend */}
          <div className="flex items-center gap-4 pt-1">
            {[
              { status: 'draft', label: 'Draft' },
              { status: 'approved', label: 'Approved' },
              { status: 'scheduled', label: 'Scheduled' },
              { status: 'posted', label: 'Posted' },
              { status: 'failed', label: 'Failed' },
            ].map(({ status, label }) => (
              <div key={status} className="flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${STATUS_DOT[status]}`} />
                <span className="text-xs text-text-muted">{label}</span>
              </div>
            ))}
          </div>
      </div>

      </TabsContent>

      {/* ── Media Tab ────────────────────────────────────────────────── */}
      <TabsContent value="media" className="mt-0">
        <MediaGrid supabase={supabase} userId={userId} />
      </TabsContent>

      <PostModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditPost(null) }}
        supabase={supabase}
        userId={userId}
        editPost={editPost}
        onSaved={() => { if (userId) loadPosts(userId) }}
      />
    </Tabs>
  )
}
