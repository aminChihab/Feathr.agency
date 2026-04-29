// src/components/inbox/reply-box.tsx
'use client'

import { useState } from 'react'

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
    <div className="shrink-0 px-3 py-3 md:px-6 md:py-4 bg-surface-container-low/30 backdrop-blur-xl border-t border-outline-variant/10 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
      <div className="flex items-end gap-3 bg-surface-container-highest/50 p-2 rounded-2xl border border-outline-variant/10 focus-within:border-primary/30 transition-all">
        <button className="p-2 text-on-surface-variant hover:text-primary transition-colors" type="button">
          <span className="material-symbols-outlined">add_circle</span>
        </button>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          disabled={disabled}
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm py-2 resize-none h-10 max-h-32 custom-scrollbar placeholder:text-on-surface-variant/30 text-on-surface"
        />
        <div className="flex items-center gap-1 pr-2 pb-1">
          <button className="p-2 text-on-surface-variant hover:text-primary transition-colors" type="button">
            <span className="material-symbols-outlined">mood</span>
          </button>
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending || disabled}
            className="p-2.5 bg-primary text-on-primary-container rounded-xl shadow-lg shadow-primary/10 transition-transform active:scale-95 disabled:opacity-40"
            type="button"
          >
            <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
          </button>
        </div>
      </div>
    </div>
  )
}
