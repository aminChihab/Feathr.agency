'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Compass, FileText, Image, MessageCircle } from 'lucide-react'
import { NavBadge } from './nav-badge'

const navItems = [
  { icon: Compass, label: 'Explore', href: '/explore' },
  { icon: FileText, label: 'Content', href: '/content' },
  { icon: Image, label: 'Gallery', href: '/gallery' },
  { icon: MessageCircle, label: 'Inbox', href: '/inbox' },
]

interface TopNavBarProps {
  avatarUrl?: string | null
  onAvatarClick: () => void
  badges?: Record<string, number>
}

export function TopNavBar({ avatarUrl, onAvatarClick, badges = {} }: TopNavBarProps) {
  const pathname = usePathname()

  return (
    <div className="hidden md:block fixed top-0 left-0 right-0 z-40 px-4 pt-3">
      <nav className="mx-auto flex h-14 max-w-full items-center justify-between rounded-2xl bg-surface-container-high px-6">
        {/* Logo */}
        <Link href="/explore" className="flex items-center">
          <span className="font-display text-xl text-primary">feathr</span>
        </Link>

        {/* Nav Items */}
        <div className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            const badgeCount = badges[item.href] || 0
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-xs uppercase tracking-wider transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-on-surface-variant/50 hover:text-on-surface-variant'
                }`}
              >
                <span className="relative">
                  <Icon size={18} />
                  <NavBadge count={badgeCount} />
                </span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {/* Avatar */}
        <button
          onClick={onAvatarClick}
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-outline-variant/15"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm text-on-surface-variant">U</span>
          )}
        </button>
      </nav>
    </div>
  )
}
