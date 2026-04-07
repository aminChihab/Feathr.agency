// src/components/inbox/message-thread.tsx
'use client'

import { useEffect, useRef } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { MessageBubble } from './message-bubble'
import { ReplyBox } from './reply-box'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  onStatusChange: (status: string) => void
  onPriorityChange: (priority: string) => void
  onMessageSent: () => void
  onApproveMessage: (id: string) => void
  onRejectMessage: (id: string) => void
}

export function MessageThread({
  conversation, messages, supabase, userId,
  onStatusChange, onPriorityChange,
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
          <Select value={conversation.status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-7 w-28 bg-bg-base text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
              <SelectItem value="spam">Spam</SelectItem>
            </SelectContent>
          </Select>
          <Select value={conversation.priority} onValueChange={onPriorityChange}>
            <SelectTrigger className="h-7 w-24 bg-bg-base text-[10px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hot">Hot</SelectItem>
              <SelectItem value="warm">Warm</SelectItem>
              <SelectItem value="cold">Cold</SelectItem>
            </SelectContent>
          </Select>
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
