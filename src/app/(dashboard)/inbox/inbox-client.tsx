'use client'

import { useState, useCallback, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PAGE_SIZES } from '@/lib/pagination'
import type { Database } from '@/types/database'
import { ConversationList } from '@/components/inbox/conversation-list'
import { MessageThread } from '@/components/inbox/message-thread'
import { LinkClientModal } from '@/components/inbox/link-client-modal'
import { BookingModal } from '@/components/dashboard/booking-modal'
import { PageHeader } from '@/components/ui/page-header'
import { ArrowLeft, Search } from 'lucide-react'

type Message = Database['public']['Tables']['messages']['Row']
type Client = Database['public']['Tables']['clients']['Row']

export interface ConversationData {
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

export interface InboxClientProps {
  userId: string
  initialConversations: ConversationData[]
  initialCursor: string | null
  totalConversationCount: number
  platforms: { id: string; name: string; color: string }[]
}

export function InboxClient({
  userId,
  initialConversations,
  initialCursor: _initialCursor,
  totalConversationCount: _totalConversationCount,
  platforms,
}: InboxClientProps) {
  const supabase = createClient()

  const [conversations, setConversations] = useState<ConversationData[]>(initialConversations)
  const [activeConvId, setActiveConvId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [hasOlderMessages, setHasOlderMessages] = useState(false)
  const [messageCursor, setMessageCursor] = useState<string | null>(null)
  const [client, setClient] = useState<Client | null>(null)
  const [filters, setFilters] = useState<Filters>({
    status: 'all', priority: 'all', type: 'all', platform: 'all', search: '', category: 'all',
  })
  const [syncing, setSyncing] = useState(false)
  const [linkModalOpen, setLinkModalOpen] = useState(false)
  const [bookingModalOpen, setBookingModalOpen] = useState(false)

  const refreshConversations = useCallback(async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*, platform_accounts(platforms(name, color, slug))')
      .eq('profile_id', userId)
      .order('last_message_at', { ascending: false })

    const mapped = (data ?? []).map((c: any) => ({
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

    setConversations(mapped)
  }, [supabase, userId])

  // Realtime: conversations
  useEffect(() => {
    const channel = supabase
      .channel('inbox-conversations')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'conversations', filter: `profile_id=eq.${userId}` },
        () => { refreshConversations() }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId, refreshConversations, supabase])

  // Realtime: messages for active conversation
  useEffect(() => {
    if (!activeConvId) return

    const channel = supabase
      .channel('inbox-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${activeConvId}` },
        (payload) => { setMessages((prev) => [...prev, payload.new as Message]) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeConvId, supabase])

  // Load messages when conversation changes
  useEffect(() => {
    if (!activeConvId) {
      setMessages([])
      setClient(null)
      setHasOlderMessages(false)
      setMessageCursor(null)
      return
    }
    loadInitialMessages(activeConvId)
    loadConversationClient(activeConvId)
  }, [activeConvId])

  async function loadInitialMessages(convId: string) {
    const pageSize = PAGE_SIZES.messages
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', convId)
      .order('sent_at', { ascending: false })
      .limit(pageSize + 1)

    const rows = data ?? []
    const hasMore = rows.length > pageSize
    const page = hasMore ? rows.slice(0, pageSize) : rows
    setHasOlderMessages(hasMore)
    setMessageCursor(hasMore ? page[page.length - 1].sent_at : null)
    setMessages([...page].reverse())
  }

  async function loadConversationClient(convId: string) {
    const conv = conversations.find((c) => c.id === convId)
    if (!conv?.client_id) { setClient(null); return }
    const { data } = await supabase.from('clients').select('*').eq('id', conv.client_id).single()
    setClient(data)
  }

  async function handleLoadOlder() {
    if (!activeConvId || !messageCursor) return
    const pageSize = PAGE_SIZES.messages
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', activeConvId)
      .lt('sent_at', messageCursor)
      .order('sent_at', { ascending: false })
      .limit(pageSize + 1)

    const rows = data ?? []
    const hasMore = rows.length > pageSize
    const page = hasMore ? rows.slice(0, pageSize) : rows
    setHasOlderMessages(hasMore)
    setMessageCursor(hasMore ? page[page.length - 1].sent_at : null)
    setMessages((prev) => [...[...page].reverse(), ...prev])
  }

  async function handleSync() {
    setSyncing(true)
    await fetch('/api/inbox/sync', { method: 'POST' })
    await refreshConversations()
    setSyncing(false)
  }

  async function handleApproveMessage(id: string) {
    await supabase.from('messages').update({ ai_approved: true }).eq('id', id)
    setMessages((prev) => prev.map((m) => m.id === id ? { ...m, ai_approved: true } : m))
  }

  async function handleRejectMessage(id: string) {
    await supabase.from('messages').delete().eq('id', id)
    setMessages((prev) => prev.filter((m) => m.id !== id))
  }

  function handleFilterChange(key: string, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  async function handleBookingSaved() {
    const conv = conversations.find((c) => c.id === activeConvId)
    if (!conv?.client_id) return
    const { data } = await supabase.from('clients').select('*').eq('id', conv.client_id).single()
    setClient(data)
  }

  async function handleMessageSent() {
    const slug = activeConv?.platform_slug
    if (slug === 'instagram') await fetch('/api/instagram/send', { method: 'POST' })
    else if (slug === 'whatsapp') await fetch('/api/whatsapp/send', { method: 'POST' })
    else await fetch('/api/inbox/send', { method: 'POST' })
  }

  const activeConv = conversations.find((c) => c.id === activeConvId)

  return (
    <div className={activeConvId ? 'overflow-hidden' : ''}>
      {!activeConvId ? (
        <ConversationListView
          conversations={conversations}
          activeConvId={activeConvId}
          filters={filters}
          platforms={platforms}
          syncing={syncing}
          onSelect={setActiveConvId}
          onFilterChange={handleFilterChange}
          onSync={handleSync}
        />
      ) : (
        <MessageView
          activeConv={activeConv!}
          messages={messages}
          userId={userId}
          hasOlderMessages={hasOlderMessages}
          onBack={() => setActiveConvId(null)}
          onMessageSent={handleMessageSent}
          onApproveMessage={handleApproveMessage}
          onRejectMessage={handleRejectMessage}
          onLoadOlder={handleLoadOlder}
        />
      )}

      {activeConvId && (
        <LinkClientModal
          open={linkModalOpen}
          onClose={() => setLinkModalOpen(false)}
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

      {client && (
        <BookingModal
          open={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          userId={userId}
          clientId={client.id}
          clientName={client.name}
          onSaved={handleBookingSaved}
        />
      )}
    </div>
  )
}

// ---- Sub-views (keep each render block small) ----

interface Filters {
  status: string
  priority: string
  type: string
  platform: string
  search: string
  category: string
}

interface ConversationListViewProps {
  conversations: ConversationData[]
  activeConvId: string | null
  filters: Filters
  platforms: { id: string; name: string; color: string }[]
  syncing: boolean
  onSelect: (id: string) => void
  onFilterChange: (key: string, value: string) => void
  onSync: () => void
}

function ConversationListView({
  conversations, activeConvId, filters, platforms, syncing,
  onSelect, onFilterChange, onSync,
}: ConversationListViewProps) {
  return (
    <>
      <PageHeader title="Inbox" subtitle="Conversations and leads">
        <div className="hidden md:flex items-center gap-4">
          <div className="relative hidden lg:block">
            <input
              className="bg-surface-container-low border-none rounded-full py-2 pl-4 pr-10 text-sm w-64 focus:ring-1 focus:ring-primary/30 transition-all outline-none font-body text-on-surface placeholder:text-on-surface-variant/50"
              placeholder="Search conversations..."
              value={filters.search}
              onChange={(e) => onFilterChange('search', e.target.value)}
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
          onSelect={onSelect}
          filters={filters}
          onFilterChange={onFilterChange}
          platforms={platforms}
          onSync={onSync}
          syncing={syncing}
        />
      </div>
    </>
  )
}

interface MessageViewProps {
  activeConv: ConversationData
  messages: Message[]
  userId: string
  hasOlderMessages: boolean
  onBack: () => void
  onMessageSent: () => void
  onApproveMessage: (id: string) => void
  onRejectMessage: (id: string) => void
  onLoadOlder: () => void
}

function MessageView({
  activeConv, messages, userId, hasOlderMessages,
  onBack, onMessageSent, onApproveMessage, onRejectMessage, onLoadOlder,
}: MessageViewProps) {
  return (
    <div className="flex flex-col h-[calc(100dvh-4rem)] md:h-[calc(100vh-6rem)]">
      {/* Fixed header */}
      <div className="shrink-0 flex items-center gap-3 px-4 md:px-6 h-16 bg-surface-container-low/50 backdrop-blur-xl border-b border-outline-variant/10">
        <button
          onClick={onBack}
          className="p-1.5 -ml-1.5 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-on-primary-container shrink-0"
          style={{ backgroundColor: activeConv.platform_color + '40' }}
        >
          {(activeConv.contact_name ?? '?')[0]?.toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-on-surface truncate">
            {activeConv.contact_name || activeConv.contact_handle || 'Unknown'}
          </p>
          <p className="text-[10px] text-on-surface-variant/50">
            {activeConv.platform_name}
          </p>
        </div>
      </div>

      {/* Scrollable messages + fixed input — MessageThread handles this */}
      <div className="flex-1 min-h-0">
        <MessageThread
          conversation={activeConv}
          messages={messages}
          userId={userId}
          onMessageSent={onMessageSent}
          onApproveMessage={onApproveMessage}
          onRejectMessage={onRejectMessage}
          hasOlderMessages={hasOlderMessages}
          onLoadOlder={onLoadOlder}
          hideHeader
        />
      </div>
    </div>
  )
}
