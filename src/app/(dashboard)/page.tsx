import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { MessageCircle, CalendarDays, Sparkles, ChevronRight, Check } from 'lucide-react'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('professional_name')
    .eq('id', user.id)
    .single()

  const [messagesRes, draftsRes, scheduledRes, leadsRes] = await Promise.all([
    supabase
      .from('conversations')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('status', 'new'),
    supabase
      .from('content_calendar')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('status', 'draft'),
    supabase
      .from('content_calendar')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .in('status', ['approved', 'scheduled'])
      .gte('scheduled_at', new Date().toISOString().split('T')[0])
      .lt('scheduled_at', new Date(Date.now() + 86400000).toISOString().split('T')[0]),
    supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('profile_id', user.id)
      .eq('status', 'new'),
  ])

  const unread = messagesRes.count ?? 0
  const hotLeads = leadsRes.count ?? 0
  const drafts = draftsRes.count ?? 0
  const scheduled = scheduledRes.count ?? 0

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  const cards = [
    {
      href: '/inbox',
      icon: MessageCircle,
      primary: unread > 0 ? `${unread} unread message${unread !== 1 ? 's' : ''}` : null,
      secondary: hotLeads > 0 ? `${hotLeads} hot lead${hotLeads !== 1 ? 's' : ''} waiting` : null,
      empty: 'No new messages',
      label: 'Inbox',
    },
    {
      href: '/content',
      icon: CalendarDays,
      primary: drafts > 0 ? `${drafts} draft${drafts !== 1 ? 's' : ''} ready for review` : null,
      secondary: scheduled > 0 ? `${scheduled} scheduled for today` : null,
      empty: 'No pending content',
      label: 'Content',
    },
    {
      href: '/studio',
      icon: Sparkles,
      primary: null,
      secondary: null,
      empty: 'Studio coming soon',
      label: 'Studio',
    },
  ]

  return (
    <div className="px-6 pt-12 pb-8 max-w-lg mx-auto space-y-8">
      <div>
        <h1 className="font-display text-3xl text-on-surface">
          {greeting}, <span className="text-primary italic">{profile?.professional_name ?? 'there'}</span>
        </h1>
      </div>

      <div className="space-y-4">
        {cards.map((card) => {
          const hasAction = card.primary || card.secondary
          return (
            <Link
              key={card.href}
              href={card.href}
              className="block bg-surface-container-low rounded-2xl p-6 hover:bg-surface-container transition-colors group"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center shrink-0">
                    <card.icon className={`h-5 w-5 ${hasAction ? 'text-primary' : 'text-on-surface-variant/40'}`} />
                  </div>
                  <div>
                    {hasAction ? (
                      <>
                        {card.primary && (
                          <p className="font-display text-xl text-on-surface">{card.primary}</p>
                        )}
                        {card.secondary && (
                          <p className="text-sm text-on-surface-variant mt-1">{card.secondary}</p>
                        )}
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-on-surface-variant/40" />
                        <p className="text-sm text-on-surface-variant/40">{card.empty}</p>
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-on-surface-variant/30 group-hover:text-on-surface-variant transition-colors mt-2" />
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
