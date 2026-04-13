// src/components/inbox/conversation-list.tsx
'use client'

import { ConversationItem } from './conversation-item'
import { InboxFilters } from './inbox-filters'
import { RefreshCw } from 'lucide-react'

interface ConversationData {
  id: string
  contact_name: string | null
  contact_handle: string | null
  status: string
  priority: string
  type: string
  ai_summary: string | null
  last_message_at: string | null
  platform_account_id: string
  client_id: string | null
  platform_name: string
  platform_color: string
}

interface ConversationListProps {
  conversations: ConversationData[]
  activeId: string | null
  onSelect: (id: string) => void
  filters: {
    status: string
    priority: string
    type: string
    platform: string
    search: string
    category: string
  }
  onFilterChange: (key: string, value: string) => void
  platforms: { id: string; name: string; color: string }[]
  onSync: () => void
  syncing: boolean
}

export function ConversationList({
  conversations, activeId, onSelect, filters, onFilterChange, platforms, onSync, syncing,
}: ConversationListProps) {
  // Client-side filtering
  const filtered = conversations.filter((c) => {
    if (filters.category === 'leads' && c.client_id) return false
    if (filters.category === 'clients' && !c.client_id) return false
    if (filters.status !== 'all' && c.status !== filters.status) return false
    if (filters.priority !== 'all' && c.priority !== filters.priority) return false
    if (filters.type !== 'all' && c.type !== filters.type) return false
    if (filters.platform !== 'all' && c.platform_account_id !== filters.platform) return false
    if (filters.search) {
      const q = filters.search.toLowerCase()
      const name = (c.contact_name ?? '').toLowerCase()
      const handle = (c.contact_handle ?? '').toLowerCase()
      if (!name.includes(q) && !handle.includes(q)) return false
    }
    return true
  })

  return (
    <section className="w-80 flex flex-col bg-surface-container-lowest border-r border-outline-variant/10 overflow-hidden">
      {/* Tab filters + sync */}
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <InboxFilters
            category={filters.category}
            onCategoryChange={(v) => onFilterChange('category', v)}
          />
          <button
            onClick={onSync}
            disabled={syncing}
            className="p-1.5 text-on-surface-variant/40 hover:text-on-surface transition-colors"
            title="Sync"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Conversation items */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-on-surface-variant/40">No conversations found.</p>
        ) : (
          filtered.map((conv) => (
            <ConversationItem
              key={conv.id}
              conversation={conv}
              isActive={conv.id === activeId}
              isClient={!!conv.client_id}
              onClick={() => onSelect(conv.id)}
            />
          ))
        )}
      </div>
    </section>
  )
}
