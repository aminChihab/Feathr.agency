// src/components/inbox/message-thread.tsx
'use client'

import { useEffect, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
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
  supabase: SupabaseClient<Database>
  userId: string
  onMessageSent: () => void
  onApproveMessage: (id: string) => void
  onRejectMessage: (id: string) => void
}

export function MessageThread({
  conversation, messages, supabase, userId,
  onMessageSent, onApproveMessage, onRejectMessage,
}: MessageThreadProps) {
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
    <section className="flex-1 flex flex-col bg-surface overflow-hidden">
      {/* Chat Header */}
      <header className="h-16 px-6 flex items-center justify-between border-b border-outline-variant/5 bg-surface-container-low/30">
        <div className="flex items-center gap-4">
          <div className="relative">
            {/* Avatar placeholder with platform color */}
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-on-primary-container"
              style={{ backgroundColor: conversation.platform_color + '40' }}
            >
              {(conversation.contact_name ?? '?')[0]?.toUpperCase()}
            </div>
            <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-tertiary-container border-2 border-surface" />
          </div>
          <div>
            <h3 className="text-sm font-bold tracking-tight">
              {conversation.contact_name ?? 'Unknown'}
              {conversation.contact_handle && (
                <span className="text-on-surface-variant/40 font-normal ml-1">{conversation.contact_handle}</span>
              )}
            </h3>
            <p className="text-[10px] text-on-surface-variant/60 flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px] text-tertiary">bolt</span>
              Active on {conversation.platform_name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full transition-colors">
            <span className="material-symbols-outlined">call</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full transition-colors">
            <span className="material-symbols-outlined">video_call</span>
          </button>
          <button className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high rounded-full transition-colors">
            <span className="material-symbols-outlined">more_vert</span>
          </button>
        </div>
      </header>

      {/* Message History */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-6">
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
