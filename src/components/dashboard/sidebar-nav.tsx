'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Inbox, CalendarDays, BarChart3, Link2,
  Search, ListChecks, Users, Plane, Bot, Settings, Feather,
} from 'lucide-react'

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
  { href: '/settings', label: 'Settings', icon: Settings },
]

interface SidebarNavProps {
  profileName: string | null
  email: string
}

export function SidebarNav({ profileName, email }: SidebarNavProps) {
  const pathname = usePathname()

  function isActive(href: string) {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-bg-surface">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2.5 px-6">
        <span className="font-display text-xl tracking-wide text-text-primary">Feathr</span>
        <Feather className="h-5 w-5 text-accent" />
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
