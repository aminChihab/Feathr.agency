// src/components/inbox/lead-modal.tsx
'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface LeadModalProps {
  open: boolean
  onClose: () => void
  supabase: SupabaseClient<Database>
  userId: string
  conversationId: string
  onCreated: () => void
}

export function LeadModal({ open, onClose, supabase, userId, conversationId, onCreated }: LeadModalProps) {
  const [score, setScore] = useState(50)
  const [requestedDate, setRequestedDate] = useState('')
  const [requestedDuration, setRequestedDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)

    await supabase.from('leads').insert({
      profile_id: userId,
      conversation_id: conversationId,
      score,
      requested_date: requestedDate ? new Date(requestedDate).toISOString() : null,
      requested_duration: requestedDuration || null,
      notes: notes || null,
      status: 'new',
    })

    await supabase
      .from('conversations')
      .update({ type: 'booking' })
      .eq('id', conversationId)

    setSaving(false)
    onCreated()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface-container-low border-outline-variant/15 max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-light">Mark as lead</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Score (1-100)</Label>
            <Input
              type="number"
              min={1}
              max={100}
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="bg-surface-container-lowest"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Requested date</Label>
            <Input
              type="date"
              value={requestedDate}
              onChange={(e) => setRequestedDate(e.target.value)}
              className="bg-surface-container-lowest"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Duration</Label>
            <Input
              value={requestedDuration}
              onChange={(e) => setRequestedDuration(e.target.value)}
              placeholder="e.g. 1 hour"
              className="bg-surface-container-lowest"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Notes</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="bg-surface-container-lowest"
              placeholder="Additional details..."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-primary text-on-primary hover:bg-primary/80">
              {saving ? 'Saving...' : 'Create lead'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
