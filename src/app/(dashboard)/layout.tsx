import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { SidebarNav } from '@/components/dashboard/sidebar-nav'

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
    <div className="flex min-h-screen bg-surface">
      <SidebarNav
        profileName={profile?.professional_name ?? null}
        email={user.email ?? ''}
      />
      <main className="ml-64 flex-1 min-h-screen">{children}</main>
    </div>
  )
}
