// src/components/inbox/conversation-list.tsx
'use client'

import { ConversationItem } from './conversation-item'
import { InboxFilters } from './inbox-filters'
import { Button } from '@/components/ui/button'
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
    <div className="flex h-full w-80 flex-col border-r border-border">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-medium">Conversations</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onSync}
          disabled={syncing}
          className="h-7 text-xs"
        >
          <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncing ? 'animate-spin' : ''}`} />
          Sync
        </Button>
      </div>

      <InboxFilters
        {...filters}
        platforms={platforms}
        onStatusChange={(v) => onFilterChange('status', v)}
        onPriorityChange={(v) => onFilterChange('priority', v)}
        onTypeChange={(v) => onFilterChange('type', v)}
        onPlatformChange={(v) => onFilterChange('platform', v)}
        onSearchChange={(v) => onFilterChange('search', v)}
        onCategoryChange={(v) => onFilterChange('category', v)}
      />

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="p-4 text-center text-xs text-text-muted">No conversations found.</p>
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
    </div>
  )
}
