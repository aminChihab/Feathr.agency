// src/components/dashboard/booking-modal.tsx
'use client'

import { useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface BookingModalProps {
  open: boolean
  onClose: () => void
  supabase: SupabaseClient<Database>
  userId: string
  clientId: string
  clientName: string
  onSaved: () => void
}

export function BookingModal({ open, onClose, supabase, userId, clientId, clientName, onSaved }: BookingModalProps) {
  const [date, setDate] = useState('')
  const [duration, setDuration] = useState('')
  const [notes, setNotes] = useState('')
  const [revenue, setRevenue] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    if (!date) return
    setSaving(true)

    const revenueCents = revenue ? Math.round(parseFloat(revenue) * 100) : 0

    // Create booking
    await supabase.from('bookings').insert({
      profile_id: userId,
      client_id: clientId,
      date: new Date(date).toISOString(),
      duration: duration || null,
      notes: notes || null,
      revenue_cents: revenueCents,
    })

    // Update client stats
    const { count } = await supabase
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .eq('client_id', clientId)

    await supabase
      .from('clients')
      .update({
        total_bookings: count ?? 1,
        last_booking_at: new Date(date).toISOString(),
      })
      .eq('id', clientId)

    setSaving(false)
    setDate('')
    setDuration('')
    setNotes('')
    setRevenue('')
    onSaved()
    onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-bg-surface border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-light">Add booking for {clientName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="bg-bg-base" />
          </div>
          <div className="space-y-2">
            <Label>Duration</Label>
            <Input value={duration} onChange={(e) => setDuration(e.target.value)} className="bg-bg-base" placeholder="e.g. 1 hour" />
          </div>
          <div className="space-y-2">
            <Label>Revenue</Label>
            <Input type="number" step="0.01" value={revenue} onChange={(e) => setRevenue(e.target.value)} className="bg-bg-base" placeholder="0.00" />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="bg-bg-base" placeholder="Optional notes..." />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={!date || saving} className="bg-accent text-white hover:bg-accent-hover">
              {saving ? 'Saving...' : 'Add booking'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
