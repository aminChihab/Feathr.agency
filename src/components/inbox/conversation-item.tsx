// src/components/inbox/conversation-item.tsx
'use client'

import { cn } from '@/lib/utils'

interface ConversationItemProps {
  conversation: {
    id: string
    contact_name: string | null
    contact_handle: string | null
    status: string
    priority: string
    ai_summary: string | null
    last_message_at: string | null
    last_message_preview?: string
    platform_name: string
    platform_color: string
  }
  isActive: boolean
  onClick: () => void
}

const PRIORITY_COLORS: Record<string, string> = {
  hot: 'bg-priority-hot',
  warm: 'bg-priority-warm',
  cold: 'bg-priority-cold',
}

function relativeTime(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const diff = now - then
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function ConversationItem({ conversation, isActive, onClick }: ConversationItemProps) {
  const isNew = conversation.status === 'new'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-border transition-colors',
        isActive ? 'bg-bg-elevated' : 'hover:bg-bg-surface'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex flex-col items-center gap-1 pt-1">
          <div
            className="h-2.5 w-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: conversation.platform_color }}
          />
          {conversation.priority !== 'cold' && (
            <div className={cn('h-1.5 w-1.5 rounded-full', PRIORITY_COLORS[conversation.priority])} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className={cn('truncate text-sm', isNew ? 'font-semibold' : 'font-normal')}>
              {conversation.contact_name ?? conversation.contact_handle ?? 'Unknown'}
            </p>
            <span className="text-[10px] text-text-muted flex-shrink-0">
              {conversation.last_message_at ? relativeTime(conversation.last_message_at) : ''}
            </span>
          </div>
          {conversation.contact_handle && conversation.contact_name && (
            <p className="truncate text-xs text-text-muted">{conversation.contact_handle}</p>
          )}
          {conversation.ai_summary && (
            <p className="mt-0.5 truncate text-xs text-text-muted">{conversation.ai_summary}</p>
          )}
        </div>
      </div>
    </button>
  )
}
