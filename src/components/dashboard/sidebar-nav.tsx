'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import Image from 'next/image'
import {
  LayoutDashboard, Inbox, CalendarDays, BarChart3, Link2,
  Search, ListChecks, Users, Plane, Bot, Settings, Bell,
} from 'lucide-react'
import { useState, useEffect } from 'react'

const navItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox },
  { href: '/content', label: 'Content', icon: CalendarDays },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/platforms', label: 'Platforms', icon: Link2 },
  { href: '/listings', label: 'Listings', icon: ListChecks },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/touring', label: 'Touring', icon: Plane },
  { href: '/agents', label: 'Assistants', icon: Bot },
]

const settingsItem = { href: '/settings', label: 'Settings', icon: Settings }

interface SidebarNavProps {
  profileName: string | null
  email: string
}

export function SidebarNav({ profileName, email }: SidebarNavProps) {
  const pathname = usePathname()
  const [notifCount, setNotifCount] = useState(0)

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

        {/* Notifications bell */}
        <Link
          href="/research"
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors relative ${
            pathname === '/research'
              ? 'bg-bg-elevated text-text-primary'
              : 'text-text-secondary hover:bg-bg-surface hover:text-text-primary'
          }`}
        >
          <Bell className="h-4 w-4" />
          Notifications
          {notifCount > 0 && (
            <span className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-5 min-w-[1.25rem] rounded-full bg-accent text-white text-[10px] font-medium px-1">
              {notifCount > 99 ? '99+' : notifCount}
            </span>
          )}
        </Link>

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

      {/* Profile */}
      <div className="border-t border-border px-4 py-4">
        <p className="truncate text-sm text-text-primary">
          {profileName || email}
        </p>
      </div>
    </aside>
  )
}
