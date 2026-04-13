'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import Image from 'next/image'
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
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-bg-surface">
      {/* Logo */}
      <div className="flex h-16 items-center px-6">
        <span className="font-display text-2xl font-semibold text-text-primary uppercase tracking-widest" style={{ marginRight: '-10px' }}>Feathr</span>
        <Image src="/logo.png" alt="Feathr" width={50} height={50} className="h-[50px] w-[50px] object-contain" />
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
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              )}
            >
              <item.icon className={cn('h-4 w-4', active && 'text-accent')} />
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
                  ? 'bg-accent/10 text-accent font-medium'
                  : 'text-text-secondary hover:bg-bg-elevated hover:text-text-primary'
              )}
            >
              <settingsItem.icon className={cn('h-4 w-4', active && 'text-accent')} />
              <span>{settingsItem.label}</span>
            </Link>
          )
        })()}
      </nav>

      {/* Profile + Notifications */}
      <div className="relative border-t border-border px-4 py-4" ref={popoverRef}>
        <div className="flex items-center justify-between">
          <p className="truncate text-sm text-text-primary">
            {profileName || email}
          </p>
          <button
            onClick={openNotifications}
            className="relative p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-elevated transition-colors"
          >
            <Bell className="h-4 w-4" />
            {notifCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full bg-accent text-white text-[9px] font-medium px-1">
                {notifCount > 99 ? '99+' : notifCount}
              </span>
            )}
          </button>
        </div>

        {/* Notification popover */}
        {notifOpen && (
          <div className="absolute bottom-full left-2 right-2 mb-2 rounded-xl border border-border bg-bg-surface shadow-xl shadow-black/30 overflow-hidden max-h-80 flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-medium">Notifications</h3>
              <button onClick={() => setNotifOpen(false)} className="text-text-muted hover:text-text-primary">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              {loadingNotifs ? (
                <div className="flex items-center justify-center py-6">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                </div>
              ) : notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-xs text-text-muted">No notifications</p>
              ) : (
                <div className="divide-y divide-border/50">
                  {notifications.slice(0, 10).map((notif) => (
                    <Link
                      key={notif.id}
                      href={notifLink(notif)}
                      onClick={() => { if (!notif.read) markRead(notif.id); setNotifOpen(false) }}
                      className={cn(
                        'block px-4 py-3 hover:bg-bg-elevated transition-colors',
                        !notif.read && 'bg-accent/5'
                      )}
                    >
                      <div className="flex items-start gap-2">
                        {!notif.read && <span className="mt-1.5 h-2 w-2 rounded-full bg-accent shrink-0" />}
                        <div className="min-w-0">
                          <p className="text-xs font-medium text-text-primary truncate">{notif.title}</p>
                          <p className="text-[10px] text-text-muted mt-0.5">{relativeTime(notif.created_at)}</p>
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
