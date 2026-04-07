// src/app/(dashboard)/inbox/page.tsx
'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { ConversationList } from '@/components/inbox/conversation-list'
import { MessageThread } from '@/components/inbox/message-thread'
import { ClientSidebar } from '@/components/inbox/client-sidebar'
import { LinkClientModal } from '@/components/inbox/link-client-modal'
import { BookingModal } from '@/components/dashboard/booking-modal'
import { computeConversationFields } from '@/lib/conversations'
import { MessageSquare } from 'lucide-react'

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

  async function handleUnlinkClient() {
    if (!activeConvId) return
    await supabase
      .from('conversations')
      .update({ client_id: null })
      .eq('id', activeConvId)
    setConversations((prev) =>
      prev.map((c) => c.id === activeConvId ? { ...c, client_id: null } : c)
    )
    setClient(null)
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
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    )
  }

  const activeConv = conversations.find((c) => c.id === activeConvId)

  return (
    <div className="flex h-[calc(100vh-4rem)] -m-8">
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

      {activeConv ? (
        <MessageThread
          conversation={activeConv}
          messages={messages}
          supabase={supabase}
          userId={userId}
          onMessageSent={() => {}}
          onApproveMessage={handleApproveMessage}
          onRejectMessage={handleRejectMessage}
        />
      ) : (
        <div className="flex flex-1 items-center justify-center">
          <div className="text-center space-y-2">
            <MessageSquare className="h-12 w-12 text-text-muted mx-auto" />
            <p className="text-text-muted">Select a conversation to view messages</p>
          </div>
        </div>
      )}

      <ClientSidebar
        client={client}
        onLinkClient={() => setLinkModalOpen(true)}
        onUnlinkClient={handleUnlinkClient}
        onAddBooking={client ? () => setBookingModalOpen(true) : undefined}
      />

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
