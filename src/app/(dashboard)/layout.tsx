import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BottomTabBar } from '@/components/ui/bottom-tab-bar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-screen bg-surface">
      <main className="pb-20">
        {children}
      </main>
      <BottomTabBar />
    </div>
  )
}
