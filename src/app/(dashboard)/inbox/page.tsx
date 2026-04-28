// src/app/(dashboard)/inbox/page.tsx
import { createClient } from '@/lib/supabase/server'
import { applyCursorPagination, PAGE_SIZES } from '@/lib/pagination'
import { InboxClient } from './inbox-client'

export default async function InboxPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: rows } = await supabase
    .from('conversations')
    .select('*, platform_accounts(platforms(name, color, slug))')
    .eq('profile_id', user.id)
    .order('last_message_at', { ascending: false })
    .limit(PAGE_SIZES.conversations + 1)

  const mapped = (rows ?? []).map((c: any) => ({
    id: c.id,
    contact_name: c.contact_name,
    contact_handle: c.contact_handle,
    status: c.status,
    priority: c.priority,
    type: c.type,
    ai_summary: c.ai_summary,
    last_message_at: c.last_message_at,
    created_at: c.created_at,
    platform_account_id: c.platform_account_id,
    client_id: c.client_id,
    platform_name: c.platform_accounts?.platforms?.name ?? 'Unknown',
    platform_color: c.platform_accounts?.platforms?.color ?? '#666',
    platform_slug: c.platform_accounts?.platforms?.slug ?? '',
  }))

  const { items: initialConversations, nextCursor } = applyCursorPagination(mapped, PAGE_SIZES.conversations)

  const { count: totalCount } = await supabase
    .from('conversations')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', user.id)

  const { data: platformAccounts } = await supabase
    .from('platform_accounts')
    .select('id, platforms(name, color)')
    .eq('profile_id', user.id)
    .eq('status', 'connected')

  const platforms = (platformAccounts ?? []).map((a: any) => ({
    id: a.id,
    name: a.platforms?.name ?? 'Unknown',
    color: a.platforms?.color ?? '#666',
  }))

  return (
    <InboxClient
      userId={user.id}
      initialConversations={initialConversations}
      initialCursor={nextCursor}
      totalConversationCount={totalCount ?? 0}
      platforms={platforms}
    />
  )
}
