'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Inbox, CalendarDays, BarChart3, Link2,
  Search, ListChecks, Users, Plane, Bot, Settings, Bell, X,
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/content', label: 'Content', icon: CalendarDays },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/platforms', label: 'Platforms', icon: Link2 },
  { href: '/research', label: 'Research', icon: Search },
  { href: '/listings', label: 'Listings', icon: ListChecks },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/touring', label: 'Touring', icon: Plane },
  { href: '/agents', label: 'Assistants', icon: Bot },
]

const settingsItem = { href: '/settings', label: 'Settings', icon: Settings }

interface Notification {
  id: string
  type: string
  title: string
  body: any
  read: boolean
  created_at: string
}

interface SidebarNavProps {
  profileName: string | null
  email: string
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function notifLink(notif: Notification): string {
  if (notif.type === 'discovery') return '/research'
  if (notif.type === 'performance') return '/research'
  return '/'
}

export function SidebarNav({ profileName, email }: SidebarNavProps) {
  const pathname = usePathname()
  const [notifCount, setNotifCount] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loadingNotifs, setLoadingNotifs] = useState(false)
  const popoverRef = useRef<HTMLDivElement>(null)

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
    const interval = setInterval(fetchCount, 60000)
    return () => clearInterval(interval)
  }, [])

  // Close popover on outside click
  useEffect(() => {
    if (!notifOpen) return
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [notifOpen])

  async function openNotifications() {
    setNotifOpen(!notifOpen)
    if (!notifOpen) {
      setLoadingNotifs(true)
      try {
        const res = await fetch('/api/notifications')
        if (res.ok) {
          const data = await res.json()
          setNotifications(data.notifications ?? [])
        }
      } catch {}
      setLoadingNotifs(false)
    }
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ read: true }),
    })
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n))
    setNotifCount((c) => Math.max(0, c - 1))
  }

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-outline-variant/15 bg-surface-container-lowest">
      {/* Logo */}
      <div className="mb-10 px-6 pt-8">
        <div className="flex items-center gap-1">
          <h1 className="font-display text-4xl italic text-primary">Feathr</h1>
          <Image src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 object-contain opacity-80" />
        </div>
        <p className="font-body text-[9px] tracking-[0.25em] uppercase opacity-40 mt-1.5">Marketing Atelier</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3 py-4">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-on-surface-variant/70 hover:bg-surface-container-high hover:text-on-surface'
              )}
            >
              <item.icon className={cn('h-4 w-4', active && 'text-primary')} />
              <span>{item.label}</span>
            </Link>
          )
        })}

        {/* Settings */}
        {(() => {
          const active = isActive(settingsItem.href)
          return (
            <Link
              href={settingsItem.href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                active
                  ? 'bg-primary/10 text-primary font-medium'
                  : 'text-on-surface-variant/70 hover:bg-surface-container-high hover:text-on-surface'
              )}
            >
              <settingsItem.icon className={cn('h-4 w-4', active && 'text-primary')} />
              <span>{settingsItem.label}</span>
            </Link>
          )
        })()}
      </nav>

      {/* Profile + Notifications */}
      <div className="relative border-t border-outline-variant/15 px-4 py-4" ref={popoverRef}>
        <div className="flex items-center justify-between">
          <p className="truncate text-sm text-on-surface">
            {profileName || email}
          </p>
          <button
            onClick={openNotifications}
            className="relative p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high transition-colors"
          >
            <Bell className="h-4 w-4" />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full bg-primary text-white text-[9px] font-medium px-1">
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </button>
        </div>

        {/* Notification popover */}
        {notifOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-2 rounded-xl border border-outline-variant/15 bg-surface-container-high shadow-[0_20px_40px_rgba(0,0,0,0.4)] overflow-hidden max-h-80 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant/15">
              <h3 className="text-sm font-medium">Notifications</h3>
              <button onClick={() => setNotifOpen(false)} className="text-on-surface-variant hover:text-on-surface">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {loadingNotifs ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-on-surface-variant">No notifications</p>
              ) : (
                <div className="divide-y divide-outline-variant/15">
                  {notifications.slice(0, 10).map((notif) => (
                    <Link
                      key={notif.id}
                      href={notifLink(notif)}
                      onClick={() => { if (!notif.read) markRead(notif.id); setNotifOpen(false) }}
                      className={cn(
                        'block px-4 py-3 hover:bg-surface-container-high transition-colors',
                        !notif.read && 'bg-primary/5'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!notif.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-primary shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-on-surface truncate">{notif.title}</p>
                          <p className="text-[10px] text-on-surface-variant mt-0.5">{relativeTime(notif.created_at)}</p>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
