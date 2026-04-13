// src/components/inbox/message-bubble.tsx
'use client'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Bot } from 'lucide-react'

interface MessageBubbleProps {
  body: string
  direction: 'inbound' | 'outbound'
  aiGenerated: boolean
  aiApproved: boolean | null
  sentAt: string
  onApprove?: () => void
  onReject?: () => void
}

export function MessageBubble({
  body,
  direction,
  aiGenerated,
  aiApproved,
  sentAt,
  onApprove,
  onReject,
}: MessageBubbleProps) {
  const isInbound = direction === 'inbound'
  const isPendingApproval = aiGenerated && aiApproved === null

  return (
    <div className={cn('flex', isInbound ? 'justify-start' : 'justify-end')}>
      <div className="max-w-[70%] space-y-1">
        <div
          className={cn(
            'px-4 py-2.5 text-sm text-on-surface',
            isInbound ? 'bg-surface-container-high rounded-2xl rounded-tl-sm' : 'bg-primary/15 rounded-2xl rounded-tr-sm',
            isPendingApproval && 'ring-2 ring-status-draft/50'
          )}
        >
          {aiGenerated && (
            <div className="mb-1 flex items-center gap-1">
              <Bot className="h-3 w-3 text-on-surface-variant/60" />
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/60">AI</span>
            </div>
          )}
          <p className="whitespace-pre-wrap">{body}</p>
        </div>

        <div className={cn('flex items-center gap-2', isInbound ? 'justify-start' : 'justify-end')}>
          <span className="text-[10px] text-on-surface-variant/60">
            {new Date(sentAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        {isPendingApproval && (
          <div className="flex gap-2">
            <Button size="sm" onClick={onApprove} className="h-7 bg-primary text-on-primary hover:bg-primary/80 text-xs">
              Approve
            </Button>
            <Button size="sm" variant="ghost" onClick={onReject} className="h-7 text-xs text-status-failed">
              Reject
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
