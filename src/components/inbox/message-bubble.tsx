// src/components/inbox/message-bubble.tsx
'use client'

import { cn } from '@/lib/utils'

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
  const time = new Date(sentAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  if (isInbound) {
    return (
      <div className="flex flex-col items-start max-w-[80%]">
        <div className={cn(
          'bg-surface-container-high px-4 py-3 rounded-2xl rounded-tl-none text-sm leading-relaxed text-on-surface shadow-sm',
          isPendingApproval && 'ring-2 ring-status-draft/50'
        )}>
          {aiGenerated && (
            <div className="mb-1 flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-on-surface-variant/60">smart_toy</span>
              <span className="text-[10px] uppercase tracking-wider text-on-surface-variant/60">AI</span>
            </div>
          )}
          <p className="whitespace-pre-wrap">{body}</p>
        </div>
        <span className="text-[10px] text-on-surface-variant/40 mt-1 ml-1">{time}</span>

        {isPendingApproval && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={onApprove}
              className="px-3 py-1.5 bg-primary text-on-primary-container text-xs font-bold rounded-lg shadow-sm transition-transform active:scale-95"
            >
              Approve
            </button>
            <button
              onClick={onReject}
              className="px-3 py-1.5 text-xs font-bold text-error hover:bg-error-container/30 rounded-lg transition-colors"
            >
              Reject
            </button>
          </div>
        )}
      </div>
    )
  }

  // Outbound message
  return (
    <div className="flex flex-col items-end ml-auto max-w-[80%]">
      <div className={cn(
        'bg-gradient-to-br from-primary/80 to-primary-container text-on-primary-container px-4 py-3 rounded-2xl rounded-tr-none text-sm leading-relaxed font-medium',
        isPendingApproval && 'ring-2 ring-status-draft/50'
      )}>
        {aiGenerated && (
          <div className="mb-1 flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-on-primary-container/60">smart_toy</span>
            <span className="text-[10px] uppercase tracking-wider text-on-primary-container/60">AI Draft</span>
          </div>
        )}
        <p className="whitespace-pre-wrap">{body}</p>
      </div>
      <div className="flex items-center gap-1 mt-1 mr-1">
        <span className="text-[10px] text-on-surface-variant/40">{time}</span>
        <span
          className="material-symbols-outlined text-[12px] text-primary"
          style={{ fontVariationSettings: "'FILL' 1" }}
        >
          done_all
        </span>
      </div>

      {isPendingApproval && (
        <div className="flex gap-2 mt-2">
          <button
            onClick={onApprove}
            className="px-3 py-1.5 bg-primary text-on-primary-container text-xs font-bold rounded-lg shadow-sm transition-transform active:scale-95"
          >
            Approve
          </button>
          <button
            onClick={onReject}
            className="px-3 py-1.5 text-xs font-bold text-error hover:bg-error-container/30 rounded-lg transition-colors"
          >
            Reject
          </button>
        </div>
      )}
    </div>
  )
}
