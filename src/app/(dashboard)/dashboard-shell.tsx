// src/app/(dashboard)/dashboard-shell.tsx
'use client'

import { useState } from 'react'
import { TopNavBar } from '@/components/navigation/top-nav-bar'
import { BottomTabBar } from '@/components/ui/bottom-tab-bar'
import { ProfileDrawer } from '@/components/navigation/profile-drawer'

interface DashboardShellProps {
  children: React.ReactNode
  email?: string | null
  profileName?: string | null
  avatarUrl?: string | null
  badges?: Record<string, number>
}

export function DashboardShell({ children, email, profileName, avatarUrl, badges }: DashboardShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <div className="min-h-screen bg-surface">
      <TopNavBar
        avatarUrl={avatarUrl}
        onAvatarClick={() => setDrawerOpen(true)}
        badges={badges}
      />
      <main className="pb-20 md:pt-20 md:pb-0">
        {children}
      </main>
      <BottomTabBar onProfileClick={() => setDrawerOpen(true)} badges={badges} />
      <ProfileDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        email={email}
        avatarUrl={avatarUrl}
        profileName={profileName}
      />
    </div>
  )
}
