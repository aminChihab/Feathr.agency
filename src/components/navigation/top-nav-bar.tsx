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
  creditBalance?: number | null
}

export function TopNavBar({ avatarUrl, onAvatarClick, badges = {}, creditBalance }: TopNavBarProps) {
  const pathname = usePathname()

  return (
    <div className="hidden md:block fixed top-0 left-0 right-0 z-40 px-5 pt-4">
      <nav className="mx-auto flex h-[72px] max-w-full items-center justify-between rounded-2xl bg-surface-container-high px-8 nav-glow shimmer-border">
        {/* Logo */}
        <Link href="/explore" className="flex items-center">
          <img src="/logo.png" alt="Feathr" className="h-12 transition-all duration-300 hover:drop-shadow-[0_0_8px_rgba(182,133,255,0.4)]" />
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
                className={`relative flex items-center gap-2.5 rounded-xl px-5 py-2.5 text-sm font-medium transition-colors ${
                  isActive
                    ? 'text-white bg-white/5 rounded-lg'
                    : 'text-on-surface-variant/50 hover:text-on-surface-variant'
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

        {/* Right side: credits + avatar */}
        <div className="flex items-center gap-3">
          {creditBalance != null && (
            <span className="flex items-center gap-1.5 bg-surface-container-highest text-on-surface-variant text-sm px-4 py-2 rounded-full font-medium">
              {creditBalance}
              <span className="text-primary">●</span>
            </span>
          )}
          <button
            onClick={onAvatarClick}
            className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-outline-variant/30 transition-all duration-300 hover:border-primary/50 hover:ring-2 hover:ring-primary/30"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Profile" className="h-full w-full object-cover" />
            ) : (
              <span className="text-sm font-medium text-on-surface-variant">U</span>
            )}
          </button>
        </div>
      </nav>
    </div>
  )
}
