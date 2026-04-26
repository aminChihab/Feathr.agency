// src/app/(dashboard)/inbox/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { ConversationList } from '@/components/inbox/conversation-list'
import { MessageThread } from '@/components/inbox/message-thread'
import { LinkClientModal } from '@/components/inbox/link-client-modal'
import { BookingModal } from '@/components/dashboard/booking-modal'
import { computeConversationFields } from '@/lib/conversations'
import { PageHeader } from '@/components/ui/page-header'
import { ArrowLeft, Search } from 'lucide-react'

type Message = Database['public']['Tables']['messages']['Row']
type Client = Database['public']['Tables']['clients']['Row']

interface ConversationData {
  id: string
  contact_name: string | null
  contact_handle: string | null
  status: string
  priority: string
  type: string
  ai_summary: string | null
  last_message_at: string | null
  created_at: string
  platform_account_id: string
  client_id: string | null
  platform_name: string
  platform_color: string
  platform_slug: string
}

export default function InboxPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [conversations, setConversations] = useState<ConversationData[]>([])
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [client, setClient] = useState<Client | null>(null)
  const [platforms, setPlatforms] = useState<{ id: string; name: string; color: string }[]>([])
  const [filters, setFilters] = useState({
    status: 'all', priority: 'all', type: 'all', platform: 'all', search: '', category: 'all',
  })
  const [syncing, setSyncing] = useState(false)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  const loadConversations = useCallback(async (uid: string) => {
    const { data } = await supabase
      .from('conversations')
      .select('*, platform_accounts(platforms(name, color, slug))')
      .eq('profile_id', uid)
      .order('last_message_at', { ascending: false })

    const convIds = (data ?? []).map((c: any) => c.id)

    // Get message counts per conversation
    let countMap: Record<string, number> = {}
    if (convIds.length > 0) {
      const { data: msgCounts } = await supabase
        .from('messages')
        .select('conversation_id')
        .in('conversation_id', convIds)

      for (const msg of msgCounts ?? []) {
        countMap[msg.conversation_id] = (countMap[msg.conversation_id] ?? 0) + 1
      }
    }

    const mapped = (data ?? []).map((c: any) => {
      const computed = computeConversationFields({
        created_at: c.created_at,
        last_message_at: c.last_message_at,
        client_id: c.client_id,
        status: c.status,
        message_count: countMap[c.id] ?? 0,
        platform_slug: c.platform_accounts?.platforms?.slug ?? '',
        has_lead: false,
        client_total_bookings: 0,
      })
      return {
        ...c,
        status: computed.status,
        priority: computed.priority,
        type: computed.type,
        platform_name: c.platform_accounts?.platforms?.name ?? 'Unknown',
        platform_color: c.platform_accounts?.platforms?.color ?? '#666',
        platform_slug: c.platform_accounts?.platforms?.slug ?? '',
      }
    })

    setConversations(mapped)
  }, [supabase])

  // Init
  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      // Load connected platforms for filter dropdown
      const { data: accounts } = await supabase
        .from('platform_accounts')
        .select('id, platforms(name, color)')
        .eq('profile_id', user.id)
        .eq('status', 'connected')

      setPlatforms(
        (accounts ?? []).map((a: any) => ({
          id: a.id,
          name: a.platforms?.name ?? 'Unknown',
          color: a.platforms?.color ?? '#666',
        }))
      )

      await loadConversations(user.id)

      setLoading(false)
    }
    init()
  }, [])

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConvId) {
      setMessages([])
      setClient(null)
      return
    }

    async function loadMessages() {
      if (!activeConvId) return
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConvId)
        .order('sent_at', { ascending: true })

      setMessages(data ?? [])

      // Load client if linked
      const conv = conversations.find((c) => c.id === activeConvId)
      if (conv?.client_id) {
        const { data: clientData } = await supabase
          .from('clients')
          .select('*')
          .eq('id', conv.client_id)
          .single()
        setClient(clientData)
      } else {
        setClient(null)
      }
    }
    loadMessages()
  }, [activeConvId])

  // Realtime: conversations
  useEffect(() => {
    if (!userId) return

    const channel = supabase
      .channel('inbox-conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `profile_id=eq.${userId}` },
        () => { loadConversations(userId) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, loadConversations])

  // Realtime: messages for active conversation
  useEffect(() => {
    if (!activeConvId) return

    const channel = supabase
      .channel('inbox-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeConvId])

  async function handleSync() {
    setSyncing(true)
    await fetch('/api/inbox/sync', { method: 'POST' })
    if (userId) await loadConversations(userId)
    setSyncing(false)
  }

  async function handleApproveMessage(id: string) {
    await supabase.from('messages').update({ ai_approved: true }).eq('id', id)
    setMessages((prev) =>
      prev.map((m) => m.id === id ? { ...m, ai_approved: true } : m)
    )
  }

  async function handleRejectMessage(id: string) {
    await supabase.from('messages').delete().eq('id', id)
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  async function handleBookingSaved() {
    // Reload client data after booking
    const conv = conversations.find((c) => c.id === activeConvId)
    if (conv?.client_id) {
      const { data: clientData } = await supabase
        .from('clients')
        .select('*')
        .eq('id', conv.client_id)
        .single()
      setClient(clientData)
    }
  }

  if (loading || !userId) {
    return (
      <div className="flex h-[calc(100vh-5rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  const activeConv = conversations.find((c) => c.id === activeConvId)

  return (
    <div>
      {!activeConvId ? (
        <>
          <PageHeader title="Inbox" subtitle="Conversations and leads">
            <div className="flex items-center gap-4">
              <div className="relative hidden lg:block">
                <input
                  className="bg-surface-container-low border-none rounded-full py-2 pl-4 pr-10 text-sm w-64 focus:ring-1 focus:ring-primary/30 transition-all outline-none font-body text-on-surface placeholder:text-on-surface-variant/50"
                  placeholder="Search conversations..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  type="text"
                />
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-on-surface-variant/40" />
              </div>
              <button className="bg-gradient-to-br from-primary to-primary-container text-on-primary font-semibold px-5 py-2.5 rounded-full text-sm shadow-lg shadow-primary/10 hover:opacity-90 transition-opacity font-body">
                Create Campaign
              </button>
            </div>
          </PageHeader>
          <div className="px-4 md:px-10">
            <ConversationList
              conversations={conversations}
              activeId={activeConvId}
              onSelect={setActiveConvId}
              filters={filters}
              onFilterChange={handleFilterChange}
              platforms={platforms}
              onSync={handleSync}
              syncing={syncing}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 5rem)' }}>
          <div className="flex items-center gap-3 px-4 py-3 border-b border-outline-variant/15">
            <button
              onClick={() => setActiveConvId(null)}
              className="flex items-center gap-2 text-on-surface-variant hover:text-on-surface transition-colors"
            >
              <ArrowLeft size={20} />
              <span className="text-sm">Back to Inbox</span>
            </button>
            {activeConv && (
              <span className="text-sm text-on-surface font-medium ml-auto">
                {activeConv.contact_name || activeConv.contact_handle || 'Unknown'}
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <MessageThread
              conversation={activeConv!}
              messages={messages}
              supabase={supabase}
              userId={userId}
              onMessageSent={async () => {
                const slug = activeConv?.platform_slug
                if (slug === 'instagram') {
                  await fetch('/api/instagram/send', { method: 'POST' })
                } else if (slug === 'whatsapp') {
                  await fetch('/api/whatsapp/send', { method: 'POST' })
                } else {
                  await fetch('/api/inbox/send', { method: 'POST' })
                }
              }}
              onApproveMessage={handleApproveMessage}
              onRejectMessage={handleRejectMessage}
            />
          </div>
        </div>
      )}

      {activeConvId && userId && (
        <LinkClientModal
          open={linkModalOpen}
          onClose={() => setLinkModalOpen(false)}
          supabase={supabase}
          userId={userId}
          conversationId={activeConvId}
          contactName={activeConv?.contact_name ?? null}
          contactHandle={activeConv?.contact_handle ?? null}
          onLinked={(linkedClient) => {
            setClient(linkedClient)
            setConversations((prev) =>
              prev.map((c) => c.id === activeConvId ? { ...c, client_id: linkedClient.id } : c)
            )
          }}
        />
      )}

      {client && userId && (
        <BookingModal
          open={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          supabase={supabase}
          userId={userId}
          clientId={client.id}
          clientName={client.name}
          onSaved={handleBookingSaved}
        />
      )}
    </div>
  )
}
