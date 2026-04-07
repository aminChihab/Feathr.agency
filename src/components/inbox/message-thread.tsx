// src/components/inbox/message-thread.tsx
'use client'

import { useEffect, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { MessageBubble } from './message-bubble'
import { ReplyBox } from './reply-box'
import { cn } from '@/lib/utils'
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

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-6 py-3">
        <div className="flex items-center gap-3">
          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: conversation.platform_color }} />
          <div>
            <p className="text-sm font-medium">{conversation.contact_name ?? 'Unknown'}</p>
            {conversation.contact_handle && (
              <p className="text-xs text-text-muted">{conversation.contact_handle}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn(
            'rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize',
            conversation.status === 'qualified' ? 'bg-status-scheduled/15 text-status-scheduled' :
            conversation.status === 'active' ? 'bg-status-approved/15 text-status-approved' :
            conversation.status === 'new' ? 'bg-status-draft/15 text-status-draft' :
            conversation.status === 'archived' ? 'bg-bg-elevated text-text-muted' :
            'bg-status-failed/15 text-status-failed'
          )}>
            {conversation.status}
          </span>
          <span className={cn(
            'rounded-full px-2.5 py-0.5 text-[10px] font-medium capitalize',
            conversation.priority === 'hot' ? 'bg-priority-hot/15 text-priority-hot' :
            conversation.priority === 'warm' ? 'bg-priority-warm/15 text-priority-warm' :
            'bg-bg-elevated text-text-muted'
          )}>
            {conversation.priority}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <p className="text-center text-sm text-text-muted py-12">No messages yet.</p>
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              body={msg.body}
              direction={msg.direction}
              aiGenerated={msg.ai_generated}
              aiApproved={msg.ai_approved}
              sentAt={msg.sent_at}
              onApprove={() => onApproveMessage(msg.id)}
              onReject={() => onRejectMessage(msg.id)}
            />
          ))
        )}
      </div>

      {/* Reply */}
      <ReplyBox onSend={handleSend} />
    </div>
  )
}
