// src/components/inbox/reply-box.tsx
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

interface ReplyBoxProps {
  onSend: (body: string) => Promise<void>
  disabled?: boolean
}

export function ReplyBox({ onSend, disabled }: ReplyBoxProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  async function handleSend() {
    if (!text.trim() || sending) return
    setSending(true)
    await onSend(text.trim())
    setText('')
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-outline-variant/15 p-4 bg-surface-container-low/20">
      <div className="flex gap-2 bg-surface-container-high/50 p-2 rounded-2xl border border-outline-variant/10 focus-within:border-primary/30 transition-all">
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={2}
          disabled={disabled}
          className="bg-transparent text-on-surface placeholder:text-on-surface-variant/50 resize-none border-none focus:ring-0"
        />
        <Button
          onClick={handleSend}
          disabled={!text.trim() || sending || disabled}
          size="icon"
          className="h-auto bg-primary text-on-primary-container rounded-full shadow-lg shadow-primary/10 hover:bg-primary/80"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
