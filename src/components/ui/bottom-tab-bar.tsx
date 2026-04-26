// src/components/ui/bottom-tab-bar.tsx
'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Compass, FileText, Image, MessageCircle, User } from 'lucide-react'
import { NavBadge } from '@/components/navigation/nav-badge'

const tabs = [
  { icon: Compass, label: 'Explore', href: '/explore' },
  { icon: FileText, label: 'Content', href: '/content' },
  { icon: Image, label: 'Gallery', href: '/gallery' },
  { icon: MessageCircle, label: 'Inbox', href: '/inbox' },
]

interface BottomTabBarProps {
  onProfileClick: () => void
  badges?: Record<string, number>
}

export function BottomTabBar({ onProfileClick, badges = {} }: BottomTabBarProps) {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around border-t border-white/5 bg-surface-container-lowest pb-[env(safe-area-inset-bottom)] md:hidden">
      {tabs.map((tab) => {
        const isActive = pathname === tab.href || pathname.startsWith(tab.href + '/')
        const Icon = tab.icon
        const badgeCount = badges[tab.href] || 0
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex flex-col items-center gap-0.5 ${
              isActive ? 'text-primary' : 'text-on-surface-variant/50'
            }`}
          >
            <span className="relative">
              <Icon size={22} />
              <NavBadge count={badgeCount} />
            </span>
            <span className="text-[10px] uppercase tracking-wider">{tab.label}</span>
          </Link>
        )
      })}

      {/* Profile tab — opens drawer instead of navigating */}
      <button
        onClick={onProfileClick}
        className="flex flex-col items-center gap-0.5 text-on-surface-variant/50"
      >
        <User size={22} />
        <span className="text-[10px] uppercase tracking-wider">Profile</span>
      </button>
    </nav>
  )
}
