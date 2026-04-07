import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import {
  LayoutDashboard, Inbox, CalendarDays, BarChart3, Link2,
  Search, ListChecks, Users, Plane, Bot, Settings,
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

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('professional_name, status')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex min-h-screen bg-bg-base">
      <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-bg-surface">
        <div className="flex h-16 items-center px-6">
          <span className="font-display text-xl tracking-wide text-text-primary">Feathr</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-elevated hover:text-text-primary"
            >
              <item.icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>
        <div className="border-t border-border px-4 py-4">
          <p className="truncate text-sm text-text-primary">
            {profile?.professional_name || user.email}
          </p>
        </div>
      </aside>
      <main className="ml-64 flex-1 p-8">{children}</main>
    </div>
  )
}
