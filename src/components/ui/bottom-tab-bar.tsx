'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, MessageCircle, Sparkles, CalendarDays, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/', label: 'Home', icon: Home, match: (p: string) => p === '/' },
  { href: '/inbox', label: 'Inbox', icon: MessageCircle, match: (p: string) => p.startsWith('/inbox') },
  { href: '/studio', label: 'Studio', icon: Sparkles, match: (p: string) => p.startsWith('/studio') },
  { href: '/content', label: 'Content', icon: CalendarDays, match: (p: string) => p.startsWith('/content') },
  { href: '/settings', label: 'Settings', icon: Settings, match: (p: string) => p.startsWith('/settings') },
]

export function BottomTabBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 h-16 bg-surface-container-lowest border-t border-outline-variant/15 flex items-center justify-around px-4 pb-[env(safe-area-inset-bottom)]">
      {tabs.map((tab) => {
        const active = tab.match(pathname)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-col items-center gap-1 py-2 px-3 transition-colors',
              active ? 'text-primary' : 'text-on-surface-variant/50'
            )}
          >
            <tab.icon className="h-5 w-5" />
            <span className="text-[10px] uppercase tracking-wider font-body">{tab.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
