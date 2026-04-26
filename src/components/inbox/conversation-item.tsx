// src/components/inbox/conversation-item.tsx
'use client'

import { cn } from '@/lib/utils'
import { PlatformIcon } from '@/components/ui/platform-icon'

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

const PRIORITY_BADGE: Record<string, { bg: string; text: string; label: string }> = {
  hot: { bg: 'bg-error-container', text: 'text-error', label: 'Hot' },
  warm: { bg: 'bg-tertiary-container', text: 'text-on-tertiary-container', label: 'Warm' },
  cold: { bg: 'bg-surface-container-highest', text: 'text-on-surface-variant/60', label: 'Cold' },
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
  const badge = PRIORITY_BADGE[conversation.priority] ?? PRIORITY_BADGE.cold
  // Derive slug from platform name for icon lookup
  const platformSlug = conversation.platform_name.toLowerCase().replace(/[\s\/]/g, '').replace('business', '')

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-4 md:px-6 cursor-pointer transition-all border-l-2 rounded-r-xl',
        isActive
          ? 'bg-surface-container-high/40 border-l-primary'
          : 'border-l-transparent hover:bg-surface-container-low'
      )}
    >
      <div className="flex items-center gap-4">
        {/* Platform icon */}
        <div className="shrink-0">
          <PlatformIcon slug={platformSlug} size={14} />
        </div>

        {/* Name + preview */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            {isNew && <span className="w-2 h-2 rounded-full bg-primary animate-pulse flex-shrink-0" />}
            <span className={cn(
              'text-sm font-medium',
              isActive ? 'text-on-surface' : 'text-on-surface/80'
            )}>
              {conversation.contact_handle
                ? `@${conversation.contact_handle.replace(/^@/, '')}`
                : conversation.contact_name ?? 'Unknown'}
            </span>
            <span className={cn(
              'text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter shrink-0',
              badge.bg, badge.text
            )}>
              {badge.label}
            </span>
          </div>
          <p className={cn(
            'text-sm line-clamp-1 mt-0.5',
            isActive ? 'text-on-surface-variant' : 'text-on-surface-variant/50'
          )}>
            {conversation.ai_summary ?? 'No messages yet'}
          </p>
        </div>

        {/* Platform + time */}
        <div className="shrink-0 text-right">
          <span className="text-xs text-on-surface-variant/40">
            {conversation.last_message_at ? relativeTime(conversation.last_message_at) : ''}
          </span>
          <p className="text-[10px] text-on-surface-variant/30 mt-0.5">{conversation.platform_name}</p>
        </div>
      </div>
    </button>
  )
}
