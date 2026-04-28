'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { PostModal } from '@/components/dashboard/post-modal'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { PostCardView } from '@/components/dashboard/post-card-view'
import { PageHeader } from '@/components/ui/page-header'
import {
  ChevronLeft,
  ChevronRight,
  Edit3,
  Grid3X3,
  List,
  Send,
  Sparkles,
  Loader2,
  Search,
} from 'lucide-react'
import {
  getWeekDays,
  getMonthGrid,
  isSameDay,
  postsForDay,
  type PostWithPlatform,
} from '@/lib/calendar'

type CalendarItem = Database['public']['Tables']['content_calendar']['Row']

interface MediaThumb {
  id: string
  url: string
  file_type: string
}

export interface ContentClientProps {
  userId: string
  initialPosts: PostWithPlatform[]
  initialCursor: string | null
  totalPostCount: number
  creditBalance: number | null
  initialMediaThumbs: Record<string, { id: string; url: string; fileType: string }>
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
    <div className="rounded-xl bg-surface-container-low overflow-hidden">
      <div className="grid grid-cols-7 border-b border-outline-variant/15">
        {weekDays.map((day, i) => {
          const isToday = isSameDay(day, today)
          return (
            <div
              key={i}
              className={`px-3 py-2 text-center border-r border-outline-variant/15 last:border-r-0 ${isToday ? 'bg-primary/10' : ''}`}
            >
              <p className="text-xs text-on-surface-variant">{DAY_LABELS[i]}</p>
              <p className={`text-sm font-medium mt-0.5 ${isToday ? 'text-primary' : 'text-on-surface'}`}>
                {day.getDate()}
              </p>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-7 min-h-[200px]">
        {weekDays.map((day, i) => {
          const dayPosts = postsForDay(posts, day)
          const isToday = isSameDay(day, today)
          return (
            <div
              key={i}
              className={`px-2 py-2 border-r border-outline-variant/15 last:border-r-0 space-y-1 ${isToday ? 'bg-primary/5' : ''}`}
            >
              {dayPosts.map((post) => (
                <button
                  key={post.id}
                  onClick={() => onEdit(post.id)}
                  className="w-full text-left rounded px-2 py-1.5 text-xs bg-surface-container-high hover:bg-surface-container-highest transition-colors group"
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: post.platform_color }}
                    />
                    <span className="truncate text-on-surface-variant font-medium">{post.platform_name}</span>
                  </div>
                  <p className="truncate text-on-surface leading-tight">{post.caption || 'No caption'}</p>
                  <div className="mt-1">
                    <StatusBadge status={post.status} className="text-[10px] px-1.5 py-0" />
                  </div>
                </button>
              ))}
              {dayPosts.length === 0 && (
                <div className="h-full flex items-center justify-center">
                  <span className="text-[10px] text-on-surface-variant opacity-40">--</span>
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
    <div className="rounded-xl bg-surface-container-low overflow-hidden">
      <div className="grid grid-cols-7 border-b border-outline-variant/15">
        {DAY_LABELS.map((label) => (
          <div key={label} className="px-3 py-2 text-center border-r border-outline-variant/15 last:border-r-0">
            <p className="text-xs text-on-surface-variant font-medium">{label}</p>
          </div>
        ))}
      </div>

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
                min-h-[80px] p-2 border-r border-b border-outline-variant/15 last:border-r-0 text-left transition-colors
                ${isCurrentMonth ? 'hover:bg-surface-container-high' : 'opacity-40'}
                ${isToday ? 'bg-primary/10' : ''}
                ${isSelected && !isToday ? 'bg-surface-container-high ring-1 ring-primary/50 ring-inset' : ''}
              `}
            >
              <p className={`text-xs font-medium mb-1 ${isToday ? 'text-primary' : isCurrentMonth ? 'text-on-surface' : 'text-on-surface-variant'}`}>
                {day.getDate()}
              </p>
              <div className="flex flex-wrap gap-0.5">
                {dayPosts.slice(0, 5).map((post) => (
                  <span
                    key={post.id}
                    className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[post.status] ?? 'bg-on-surface-variant'}`}
                    title={`${post.platform_name}: ${post.caption?.slice(0, 40) ?? 'No caption'}`}
                  />
                ))}
                {dayPosts.length > 5 && (
                  <span className="text-[9px] text-on-surface-variant">+{dayPosts.length - 5}</span>
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
  mediaThumbs: Record<string, MediaThumb>
  onEdit: (id: string) => void
}

function DayDetail({ day, posts, mediaThumbs, onEdit }: DayDetailProps) {
  const dayPosts = postsForDay(posts, day)
  const label = day.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })

  return (
    <div className="mt-4 rounded-xl bg-surface-container-low p-4">
      <h3 className="text-sm font-medium text-on-surface-variant mb-3">{label}</h3>
      {dayPosts.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No posts scheduled for this day.</p>
      ) : (
        <div className="space-y-2">
          {dayPosts.map((post) => (
            <DayDetailPost
              key={post.id}
              post={post}
              mediaThumbs={mediaThumbs}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface DayDetailPostProps {
  post: PostWithPlatform
  mediaThumbs: Record<string, MediaThumb>
  onEdit: (id: string) => void
}

function DayDetailPost({ post, mediaThumbs, onEdit }: DayDetailPostProps) {
  const timeLabel = post.scheduled_at
    ? new Date(post.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    : '--'

  return (
    <div className="flex items-start justify-between rounded-xl bg-surface-container-high px-3 py-2 overflow-hidden">
      <div className="flex items-start gap-2 min-w-0 flex-1">
        <span className="h-2 w-2 rounded-full flex-shrink-0 mt-1.5" style={{ backgroundColor: post.platform_color }} />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-on-surface break-words whitespace-pre-wrap">{post.caption || 'No caption'}</p>
          {post.media_ids && (post.media_ids as string[]).length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {(post.media_ids as string[]).map((mediaId) => {
                const thumb = mediaThumbs[mediaId]
                if (!thumb) return <div key={mediaId} className="h-12 w-12 rounded bg-surface-container-lowest animate-pulse" />
                return <img key={mediaId} src={thumb.url} alt="" className="h-12 w-12 rounded object-cover" />
              })}
            </div>
          )}
          <p className="text-xs text-on-surface-variant mt-1">{post.platform_name} · {timeLabel}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
        <StatusBadge status={post.status} />
        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onEdit(post.id)}>
          <Edit3 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}

// ─── Main Client Component ───────────────────────────────────────────────────

export function ContentClient({
  userId,
  initialPosts,
  initialCursor: _initialCursor,
  totalPostCount: _totalPostCount,
  creditBalance: initialCreditBalance,
  initialMediaThumbs,
}: ContentClientProps) {
  const supabase = createClient()

  // Normalize initialMediaThumbs to internal MediaThumb shape
  const normalizedInitialThumbs = Object.fromEntries(
    Object.entries(initialMediaThumbs).map(([k, v]) => [
      k,
      { id: v.id, url: v.url, file_type: v.fileType },
    ]),
  )

  const [posts, setPosts] = useState<PostWithPlatform[]>(initialPosts)
  const [modalOpen, setModalOpen] = useState(false)
  const [editPost, setEditPost] = useState<CalendarItem | null>(null)
  const [posting, setPosting] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [mediaThumbs, setMediaThumbs] = useState<Record<string, MediaThumb>>(normalizedInitialThumbs)
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [contentTab, setContentTab] = useState<'drafts' | 'calendar' | 'posted'>('drafts')
  const [creditBalance, setCreditBalance] = useState<number | null>(initialCreditBalance)

  // Calendar state
  const today = new Date()
  const [calendarMode, setCalendarMode] = useState<'week' | 'month'>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)

  async function refreshPosts() {
    const { data } = await supabase
      .from('content_calendar')
      .select('*, platform_accounts(platforms(name, color))')
      .eq('profile_id', userId)
      .order('scheduled_at', { ascending: false })

    const mapped: PostWithPlatform[] = (data ?? []).map((item: any) => ({
      ...item,
      platform_name: item.platform_accounts?.platforms?.name ?? 'Unknown',
      platform_color: item.platform_accounts?.platforms?.color ?? '#666',
    }))

    setPosts(mapped)

    const allMediaIds = new Set<string>()
    mapped.forEach((p) => {
      const ids = p.media_ids as string[] | null
      if (ids) ids.forEach((id) => allMediaIds.add(id))
    })

    if (allMediaIds.size > 0) loadMediaThumbs(Array.from(allMediaIds))
  }

  async function loadMediaThumbs(mediaIds: string[]) {
    const { data: items } = await supabase
      .from('content_library')
      .select('id, file_type, storage_path, thumbnail_path')
      .in('id', mediaIds)

    if (!items) return

    const thumbs: Record<string, MediaThumb> = {}
    for (const item of items) {
      const path = item.thumbnail_path ?? item.storage_path
      const { data: signed } = await supabase.storage.from('media').createSignedUrl(path, 3600)
      if (signed?.signedUrl) {
        thumbs[item.id] = { id: item.id, url: signed.signedUrl, file_type: item.file_type }
      }
    }
    setMediaThumbs((prev) => ({ ...prev, ...thumbs }))
  }

  async function handleApprove(id: string) {
    const post = posts.find((p) => p.id === id)
    const newStatus = post?.status === 'draft' ? 'approved' : 'draft'
    await supabase.from('content_calendar').update({ status: newStatus }).eq('id', id)
    refreshPosts()
  }

  async function handleDelete(id: string) {
    await supabase.from('content_calendar').delete().eq('id', id)
    setPosts((prev) => prev.filter((p) => p.id !== id))
  }

  async function handleRetry(id: string) {
    await supabase.from('content_calendar').update({ status: 'approved' }).eq('id', id)
    refreshPosts()
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
    refreshPosts()
    setPosting(false)
  }

  async function handleSuggestPosts() {
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
      return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} -- ${end.getDate()}, ${end.getFullYear()}`
    }
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -- ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  })()

  const monthLabel = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const aiDrafts = posts.filter((p) => p.status === 'draft' && p.ai_generated)

  // Suppress unused-variable warnings for handlers that are defined but
  // referenced only indirectly (e.g. handleRetry is available for future use)
  void handleRetry
  void setCreditBalance

  return (
    <div className="space-y-0">
      <PageHeader title="Content" subtitle="Review, approve, and schedule posts">
        <div className="hidden md:flex items-center gap-4">
          <div className="relative hidden lg:block">
            <input
              type="text"
              placeholder="Search content..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-surface-container-low border-none rounded-full px-6 py-2 text-sm w-64 focus:ring-1 focus:ring-primary placeholder:text-on-surface-variant/40 text-on-surface"
            />
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant/40" />
          </div>
          <button
            onClick={handlePostNow}
            disabled={posting}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary font-semibold text-sm rounded-full transition-transform active:scale-95 shadow-lg shadow-primary/10"
          >
            <Send className="h-3.5 w-3.5" />
            {posting ? 'Posting...' : 'Post now'}
          </button>
          <div className="flex items-center bg-surface-container-low rounded-full p-1">
            <button onClick={handleNewPost} className="px-4 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container-high rounded-full transition-all">Manual post</button>
            <button onClick={handleSuggestPosts} disabled={suggesting} className="px-4 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container-high rounded-full transition-all">
              {suggesting ? <span className="flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" />Starting...</span> : 'Suggest posts'}
            </button>
          </div>
          {creditBalance !== null && (
            <span className="bg-surface-container-highest text-on-surface-variant text-xs px-3 py-1.5 rounded-full font-body">{creditBalance} credits</span>
          )}
          <div className="flex items-center bg-surface-container-low rounded-full p-1">
            <button onClick={() => setViewMode('grid')} className={`p-2 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant/50'}`}><Grid3X3 className="h-4 w-4" /></button>
            <button onClick={() => setViewMode('list')} className={`p-2 rounded-full transition-colors ${viewMode === 'list' ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant/50'}`}><List className="h-4 w-4" /></button>
          </div>
        </div>
      </PageHeader>

      <div className="px-4 md:px-10 pt-6 pb-2 flex items-center gap-2 overflow-x-auto">
        {(['drafts', 'calendar', 'posted'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setContentTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-body transition-colors whitespace-nowrap shrink-0 ${
              contentTab === tab
                ? 'bg-surface-container-high text-on-surface font-medium'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab === 'drafts' ? 'Drafts' : tab === 'calendar' ? 'Calendar' : 'Posted'}
          </button>
        ))}
      </div>

      <div className="px-4 md:px-10 py-6 space-y-6">
        {contentTab === 'drafts' && (
          <section className="max-w-7xl mx-auto space-y-6">
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {aiDrafts.map((post) => (
                <PostCardView
                  key={post.id}
                  post={post}
                  variant={viewMode}
                  mediaThumbs={mediaThumbs}
                  actions={{
                    onApprove: handleApprove,
                    onEdit: (id) => { const p = posts.find((x) => x.id === id); if (p) { setEditPost(p); setModalOpen(true) } },
                    onDelete: handleDelete,
                  }}
                />
              ))}
            </div>

            <div className="mt-16 flex flex-col items-center justify-center py-12 border border-dashed border-outline-variant/20 rounded-3xl">
              <Sparkles className="h-10 w-10 text-on-surface-variant/20 mb-4" />
              <p className="text-on-surface-variant/40 text-sm font-medium">End of the queue. Great work today.</p>
              <button
                onClick={handleSuggestPosts}
                disabled={suggesting}
                className="mt-4 text-xs font-bold uppercase tracking-widest text-primary hover:opacity-70 transition-opacity"
              >
                {suggesting ? 'Starting...' : 'Request AI Suggestions'}
              </button>
            </div>
          </section>
        )}

        {contentTab === 'calendar' && (
          <section className="max-w-7xl mx-auto space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={navigatePrev} className="h-8 w-8 p-0 border-outline-variant/15">
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={navigateNext} className="h-8 w-8 p-0 border-outline-variant/15">
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={goToToday} className="text-xs px-3 h-8 border-outline-variant/15">
                  Today
                </Button>
                <h2 className="text-sm font-medium text-on-surface-variant ml-2">
                  {calendarMode === 'week' ? weekLabel : monthLabel}
                </h2>
              </div>

              <div className="flex items-center bg-surface-container-low rounded-lg p-0.5">
                <button
                  onClick={() => setCalendarMode('week')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    calendarMode === 'week'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Week
                </button>
                <button
                  onClick={() => setCalendarMode('month')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    calendarMode === 'month'
                      ? 'bg-primary text-on-primary'
                      : 'text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  Month
                </button>
              </div>
            </div>

            {calendarMode === 'week' ? (
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
                    mediaThumbs={mediaThumbs}
                    onEdit={handleEdit}
                  />
                )}
              </>
            )}

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
                  <span className="text-xs text-on-surface-variant">{label}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {contentTab === 'posted' && (
          <section className="max-w-7xl mx-auto space-y-6">
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {posts.filter(p => p.status === 'posted').map((post) => (
                <PostCardView
                  key={post.id}
                  post={post}
                  variant={viewMode}
                  mediaThumbs={mediaThumbs}
                />
              ))}
              {posts.filter(p => p.status === 'posted').length === 0 && (
                <div className="col-span-full py-16 text-center">
                  <p className="text-sm text-on-surface-variant/40">No posted content yet.</p>
                </div>
              )}
            </div>
          </section>
        )}

        <PostModal
          open={modalOpen}
          onClose={() => { setModalOpen(false); setEditPost(null) }}
          userId={userId}
          editPost={editPost}
          onSaved={refreshPosts}
        />
      </div>
    </div>
  )
}
