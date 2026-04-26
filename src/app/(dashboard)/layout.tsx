import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from './dashboard-shell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('professional_name, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <DashboardShell
      email={user.email}
      profileName={profile?.professional_name}
      avatarUrl={profile?.avatar_url}
    >
      {children}
    </DashboardShell>
  )
}
