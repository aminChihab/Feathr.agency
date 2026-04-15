// src/app/(dashboard)/content/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { PostModal } from '@/components/dashboard/post-modal'
import { StatusBadge } from '@/components/dashboard/status-badge'
import { MediaLibrary } from '@/components/studio/media-library'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Grid3X3,
  List,
  Pencil,
  Send,
  Sparkles,
  Loader2,
  Search,
  X,
} from 'lucide-react'

type CalendarItem = Database['public']['Tables']['content_calendar']['Row']

interface PostWithPlatform extends CalendarItem {
  platform_name: string
  platform_color: string
}

interface MediaThumb {
  id: string
  url: string
  file_type: string
}

// ─── Calendar helpers ────────────────────────────────────────────────────────

/** Returns an array of 7 Date objects for the week containing `date` (Mon-Sun). */
export function getWeekDays(date: Date): Date[] {
  const d = new Date(date)
  const day = d.getDay() // 0=Sun ... 6=Sat
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

  const startOffset = (firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1)
  const gridStart = new Date(firstDay)
  gridStart.setDate(firstDay.getDate() - startOffset)

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

// ─── Platform dot colors ─────────────────────────────────────────────────────
const PLATFORM_DOT: Record<string, string> = {
  instagram: '#E1306C',
  twitter: '#1DA1F2',
  linkedin: '#0077B5',
  facebook: '#1877F2',
  tiktok: '#000000',
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
            <div key={post.id} className="flex items-start justify-between rounded-xl bg-surface-container-high px-3 py-2 overflow-hidden">
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
                  <p className="text-xs text-on-surface-variant mt-1">{post.platform_name} · {post.scheduled_at ? new Date(post.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '--'}</p>
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
  const [mediaThumbs, setMediaThumbs] = useState<Record<string, MediaThumb>>({})
  const [searchQuery, setSearchQuery] = useState('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [contentTab, setContentTab] = useState<'drafts' | 'media' | 'studio'>('drafts')
  const [creditBalance, setCreditBalance] = useState<number | null>(null)

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
    fetch('/api/credits').then(r => r.json()).then(d => setCreditBalance(d.balance)).catch(() => {})
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

    const allMediaIds = new Set<string>()
    mapped.forEach((p) => {
      const ids = p.media_ids as string[] | null
      if (ids) ids.forEach((id) => allMediaIds.add(id))
    })

    if (allMediaIds.size > 0) {
      loadMediaThumbs(Array.from(allMediaIds))
    }
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
      const { data: signed } = await supabase.storage
        .from('media')
        .createSignedUrl(path, 3600)
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
      return `${start.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} -- ${end.getDate()}, ${end.getFullYear()}`
    }
    return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} -- ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
  })()

  const monthLabel = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  const aiDrafts = posts.filter((p) => p.status === 'draft' && p.ai_generated)

  if (!userId) return null

  return (
    <div className="space-y-0">
      {/* ── Sticky TopAppBar ─────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full bg-[#131313]/80 backdrop-blur-xl flex justify-between items-center h-20 px-10 shadow-2xl shadow-black/40">
        <h2 className="font-display text-3xl font-light text-primary">Content</h2>
        <div className="flex items-center gap-4">
          {/* Search */}
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
          {/* Post now CTA */}
          <button
            onClick={handlePostNow}
            disabled={posting}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-br from-primary to-primary-container text-on-primary font-semibold text-sm rounded-full transition-transform active:scale-95 shadow-lg shadow-primary/10"
          >
            <Send className="h-3.5 w-3.5" />
            {posting ? 'Posting...' : 'Post now'}
          </button>
          {/* Manual post / Suggest posts pill */}
          <div className="flex items-center bg-surface-container-low rounded-full p-1">
            <button
              onClick={handleNewPost}
              className="px-4 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container-high rounded-full transition-all"
            >
              Manual post
            </button>
            <button
              onClick={handleSuggestPosts}
              disabled={suggesting}
              className="px-4 py-1.5 text-xs font-medium text-on-surface hover:bg-surface-container-high rounded-full transition-all"
            >
              {suggesting ? (
                <span className="flex items-center gap-1.5">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Starting...
                </span>
              ) : (
                'Suggest posts'
              )}
            </button>
          </div>
          {creditBalance !== null && (
            <span className="bg-surface-container-highest text-on-surface-variant text-xs px-3 py-1.5 rounded-full font-body">
              {creditBalance} credits
            </span>
          )}
          {/* View toggle */}
          <div className="flex items-center bg-surface-container-low rounded-full p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant/50'}`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-full transition-colors ${viewMode === 'list' ? 'bg-surface-container-high text-on-surface' : 'text-on-surface-variant/50'}`}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="px-10 pt-6 pb-2 flex items-center gap-2">
        {(['drafts', 'media', 'studio'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setContentTab(tab)}
            className={`px-4 py-2 rounded-full text-sm font-body transition-colors ${
              contentTab === tab
                ? 'bg-surface-container-high text-on-surface font-medium'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab === 'drafts' ? 'Drafts' : tab === 'media' ? 'Media Library' : 'Studio'}
          </button>
        ))}
      </div>

      <div className="p-10 space-y-6">
        {contentTab === 'drafts' && (
        <section className="max-w-7xl mx-auto space-y-6">
          {/* Posts List (Compact Rows) */}
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-3'}>
              {aiDrafts.map((post) => {
                const ids = post.media_ids as string[] | null
                const firstThumb = ids?.[0] ? mediaThumbs[ids[0]] : null

                if (viewMode === 'list') {
                  return (
                    <div key={post.id} className="flex items-center gap-4 p-4 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group">
                      {/* Small thumbnail */}
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-container shrink-0">
                        {firstThumb ? (
                          <img src={firstThumb.url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-on-surface-variant/20 text-[9px] uppercase">No img</div>
                        )}
                      </div>
                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-on-surface truncate">{post.caption || 'No caption'}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: post.platform_color ?? '#666' }} />
                          <span className="text-xs text-on-surface-variant">{post.platform_name}</span>
                        </div>
                      </div>
                      {/* Date */}
                      <div className="text-right shrink-0">
                        <p className="font-display text-sm text-on-surface">
                          {post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Unscheduled'}
                        </p>
                        <p className="text-[10px] text-on-surface-variant">
                          {post.scheduled_at ? new Date(post.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </p>
                      </div>
                      {/* Status + Actions */}
                      <StatusBadge status={post.status} />
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleApprove(post.id)} className="p-1.5 rounded-full hover:bg-primary/20 text-primary transition-colors"><Check className="h-4 w-4" /></button>
                        <button onClick={() => { setEditPost(post); setModalOpen(true) }} className="p-1.5 rounded-full hover:bg-surface-container-high text-on-surface-variant transition-colors"><Pencil className="h-4 w-4" /></button>
                        <button onClick={() => handleDelete(post.id)} className="p-1.5 rounded-full hover:bg-error/20 text-error transition-colors"><X className="h-4 w-4" /></button>
                      </div>
                    </div>
                  )
                }

                // Grid view
                return (
                  <div key={post.id} className="bg-surface-container-low rounded-2xl overflow-hidden hover:bg-surface-container transition-colors group">
                    {/* Media thumbnail */}
                    <div className="aspect-[4/3] relative overflow-hidden bg-surface-container">
                      {firstThumb ? (
                        <>
                          <img src={firstThumb.url} alt="" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                          {ids && ids.length > 1 && (
                            <span className="absolute top-2 right-2 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">+{ids.length - 1}</span>
                          )}
                        </>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <span className="text-on-surface-variant/20 text-xs uppercase tracking-wider">No media</span>
                        </div>
                      )}
                    </div>
                    {/* Card body */}
                    <div className="p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-display text-lg text-on-surface">
                          {post.scheduled_at ? new Date(post.scheduled_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) : 'Unscheduled'}
                        </span>
                        <span className="text-xs text-on-surface-variant">
                          {post.scheduled_at ? new Date(post.scheduled_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: post.platform_color ?? '#666' }} />
                        <span className="text-xs text-on-surface-variant">{post.platform_name}</span>
                        <StatusBadge status={post.status} />
                      </div>
                      <p className="text-sm text-on-surface line-clamp-3">{post.caption || 'No caption'}</p>
                      <div className="flex items-center gap-2 pt-2 border-t border-outline-variant/10">
                        <button onClick={() => handleApprove(post.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-primary/20 text-primary transition-colors text-xs font-medium">
                          <Check className="h-3.5 w-3.5" /> Approve
                        </button>
                        <button onClick={() => { setEditPost(post); setModalOpen(true) }} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-surface-container-high text-on-surface-variant transition-colors text-xs font-medium">
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </button>
                        <button onClick={() => handleDelete(post.id)} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg hover:bg-error/20 text-error transition-colors text-xs font-medium">
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* End of queue */}
          {!loading && (
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
          )}

          {/* Calendar controls */}
          <div className="space-y-4 pt-8">
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

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
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
                    mediaThumbs={mediaThumbs}
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
                  <span className="text-xs text-on-surface-variant">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
        )}

        {contentTab === 'media' && userId && (
          <MediaLibrary
            supabase={supabase}
            userId={userId}
            creditBalance={creditBalance}
            onCreditsChanged={() => fetch('/api/credits').then(r => r.json()).then(d => setCreditBalance(d.balance)).catch(() => {})}
          />
        )}

        {contentTab === 'studio' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Sparkles className="h-12 w-12 text-primary/40 mb-4" />
            <h3 className="font-display text-2xl text-on-surface mb-2">Studio</h3>
            <p className="text-sm text-on-surface-variant max-w-sm">Video and reel creation tools coming soon.</p>
          </div>
        )}

      <PostModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditPost(null) }}
        supabase={supabase}
        userId={userId}
        editPost={editPost}
        onSaved={() => { if (userId) loadPosts(userId) }}
      />
    </div>
    </div>
  )
}
