'use client'

import { useState } from 'react'
import { Send, Plus, Smile } from 'lucide-react'

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
    <div className="shrink-0 px-3 py-3 md:px-4 md:py-4">
      <div className="flex items-end gap-2 bg-surface-container-high/60 backdrop-blur-xl px-3 py-2 rounded-2xl border border-outline-variant/15 focus-within:border-primary/30 transition-all">
        <button className="p-1.5 text-on-surface-variant/40 hover:text-primary transition-colors shrink-0" type="button">
          <Plus size={20} />
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          rows={1}
          className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-sm py-1.5 resize-none min-h-[28px] max-h-28 placeholder:text-on-surface-variant/30 text-on-surface"
        />
        <button className="p-1.5 text-on-surface-variant/40 hover:text-primary transition-colors shrink-0" type="button">
          <Smile size={18} />
        </button>
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending || disabled}
          className="p-2 bg-primary text-on-primary rounded-xl transition-all active:scale-95 disabled:opacity-30 shrink-0"
          type="button"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  )
}
