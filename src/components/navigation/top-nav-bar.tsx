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
    <div className="hidden md:block fixed top-0 left-0 right-0 z-40 px-5 pt-4">
      <nav className="mx-auto flex h-16 max-w-full items-center justify-between rounded-2xl bg-surface-container-high/80 backdrop-blur-xl px-8">
        {/* Logo */}
        <Link href="/explore" className="flex items-center">
          <img src="/logo.png" alt="Feathr" className="h-12" />
        </Link>

        {/* Nav Items */}
        <div className="flex items-center gap-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            const badgeCount = badges[item.href] || 0
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex items-center gap-2.5 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-on-surface'
                    : 'text-on-surface-variant/40 hover:text-on-surface-variant'
                }`}
              >
                <span className="relative">
                  <Icon size={20} />
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
          className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border-2 border-outline-variant/20 transition-colors hover:border-primary/40"
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <span className="text-sm font-medium text-on-surface-variant">U</span>
          )}
        </button>
      </nav>
    </div>
  )
}
