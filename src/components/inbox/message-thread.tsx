// src/components/inbox/message-thread.tsx
'use client'

import { useEffect, useRef } from 'react'
import type { Database } from '@/types/database'
import { createClient } from '@/lib/supabase/client'
import { MessageBubble } from './message-bubble'
import { ReplyBox } from './reply-box'

type Message = Database['public']['Tables']['messages']['Row']
type Conversation = {
  id: string
  contact_name: string | null
  contact_handle: string | null
  status: string
  priority: string
  platform_name: string
  platform_color: string
}

interface MessageThreadProps {
  conversation: Conversation
  messages: Message[]
  userId: string
  onMessageSent: () => void
  onApproveMessage: (id: string) => void
  onRejectMessage: (id: string) => void
  hasOlderMessages?: boolean
  onLoadOlder?: () => void
  hideHeader?: boolean
}

export function MessageThread({
  conversation, messages, userId,
  onMessageSent, onApproveMessage, onRejectMessage,
  hasOlderMessages, onLoadOlder, hideHeader,
}: MessageThreadProps) {
  const supabase = createClient()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  async function handleSend(body: string) {
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      direction: 'outbound',
      body,
      ai_generated: false,
    })

    await supabase
      .from('conversations')
      .update({ last_message_at: new Date().toISOString(), status: 'active' })
      .eq('id', conversation.id)

    onMessageSent()
  }

  // Group messages by date for "Today" / date dividers
  function getDateLabel(dateStr: string): string {
    const d = new Date(dateStr)
    const today = new Date()
    if (d.toDateString() === today.toDateString()) return 'Today'
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Build date separators
  let lastDateLabel = ''

  return (
    <section className="h-full flex flex-col bg-surface">
      {/* Message History */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {hasOlderMessages && onLoadOlder && (
          <button
            onClick={onLoadOlder}
            className="w-full py-2 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
          >
            Load older messages
          </button>
        )}
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <span className="material-symbols-outlined text-[36px] text-on-surface-variant/20 mb-2">chat</span>
            <p className="text-sm text-on-surface-variant/40">No messages yet.</p>
          </div>
        ) : (
          messages.map((msg) => {
            const dateLabel = getDateLabel(msg.sent_at)
            const showDateDivider = dateLabel !== lastDateLabel
            lastDateLabel = dateLabel

            return (
              <div key={msg.id}>
                {showDateDivider && (
                  <div className="flex justify-center mb-6">
                    <span className="text-[10px] text-on-surface-variant/30 uppercase tracking-[0.2em] font-semibold">
                      {dateLabel}
                    </span>
                  </div>
                )}
                <MessageBubble
                  body={msg.body}
                  direction={msg.direction}
                  aiGenerated={msg.ai_generated}
                  aiApproved={msg.ai_approved}
                  sentAt={msg.sent_at}
                  onApprove={() => onApproveMessage(msg.id)}
                  onReject={() => onRejectMessage(msg.id)}
                />
              </div>
            )
          })
        )}
      </div>

      {/* Text Input Area */}
      <ReplyBox onSend={handleSend} />
    </section>
  )
}
