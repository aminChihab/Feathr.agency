// src/components/inbox/conversation-item.tsx
'use client'

import { Users } from 'lucide-react'
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
  isClient?: boolean
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

export function ConversationItem({ conversation, isActive, isClient, onClick }: ConversationItemProps) {
  const isNew = conversation.status === 'new'

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 border-b border-outline-variant/15 transition-colors',
        isActive ? 'bg-surface-container-low border-l-2 border-l-primary' : 'hover:bg-surface-container-lowest'
      )}
    >
      <div className="flex items-start gap-2">
        {conversation.priority !== 'cold' && (
          <div className={cn('h-1.5 w-1.5 rounded-full flex-shrink-0 mt-2', PRIORITY_COLORS[conversation.priority])} />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              {isClient && <Users className="h-3 w-3 flex-shrink-0 text-primary" />}
              <p className={cn('truncate text-sm font-body text-on-surface', isNew ? 'font-semibold' : 'font-medium')}>
                {conversation.contact_name ?? conversation.contact_handle ?? 'Unknown'}
              </p>
            </div>
            <span className="text-[10px] text-on-surface-variant/60 flex-shrink-0">
              {conversation.last_message_at ? relativeTime(conversation.last_message_at) : ''}
            </span>
          </div>
          {conversation.contact_handle && conversation.contact_name && (
            <p className="truncate text-xs text-on-surface-variant/60">{conversation.contact_handle}</p>
          )}
          <div className="flex items-center justify-between mt-0.5">
            {conversation.ai_summary ? (
              <p className="truncate text-xs text-on-surface-variant flex-1">{conversation.ai_summary}</p>
            ) : (
              <div />
            )}
            <span
              className="text-[10px] font-medium flex-shrink-0 ml-2"
              style={{ color: conversation.platform_color }}
            >
              {conversation.platform_name}
            </span>
          </div>
        </div>
      </div>
    </button>
  )
}
