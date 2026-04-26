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
    .single() as { data: { professional_name: string | null; avatar_url: string | null } | null; error: unknown }

  const { count: unreadCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .gt('unread_count', 0)

  const { count: draftCount } = await supabase
    .from('content_calendar')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)
    .eq('status', 'draft')

  return (
    <DashboardShell
      email={user.email}
      profileName={profile?.professional_name}
      avatarUrl={profile?.avatar_url}
      badges={{
        '/inbox': unreadCount || 0,
        '/content': draftCount || 0,
      }}
    >
      {children}
    </DashboardShell>
  )
}
