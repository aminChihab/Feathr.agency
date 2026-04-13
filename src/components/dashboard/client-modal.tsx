// src/components/dashboard/client-modal.tsx
'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { BookingModal } from './booking-modal'
import { CalendarPlus } from 'lucide-react'

type Client = Database['public']['Tables']['clients']['Row']
type Booking = Database['public']['Tables']['bookings']['Row']

interface ClientModalProps {
  open: boolean
  onClose: () => void
  supabase: SupabaseClient<Database>
  userId: string
  editClient?: Client | null
  onSaved: () => void
}

export function ClientModal({ open, onClose, supabase, userId, editClient, onSaved }: ClientModalProps) {
  const [name, setName] = useState('')
  const [preferences, setPreferences] = useState('')
  const [tagsInput, setTagsInput] = useState('')
  const [isVip, setIsVip] = useState(false)
  const [saving, setSaving] = useState(false)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [bookingModalOpen, setBookingModalOpen] = useState(false)

  useEffect(() => {
    if (editClient) {
      setName(editClient.name)
      setPreferences(editClient.preferences ?? '')
      setTagsInput((editClient.tags ?? []).join(', '))
      setIsVip(editClient.is_vip)
      loadBookings(editClient.id)
    } else {
      setName('')
      setPreferences('')
      setTagsInput('')
      setIsVip(false)
      setBookings([])
    }
  }, [editClient, open])

  async function loadBookings(clientId: string) {
    const { data } = await supabase
      .from('bookings')
      .select('*')
      .eq('client_id', clientId)
      .order('date', { ascending: false })
    setBookings(data ?? [])
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)

    const tags = tagsInput.split(',').map(t => t.trim()).filter(Boolean)

    const data = {
      profile_id: userId,
      name: name.trim(),
      preferences: preferences.trim() || null,
      tags,
      is_vip: isVip,
    }

    if (editClient) {
      await supabase.from('clients').update(data).eq('id', editClient.id)
    } else {
      await supabase.from('clients').insert(data)
    }

    setSaving(false)
    onSaved()
    onClose()
  }

  async function handleDelete() {
    if (!editClient) return
    setSaving(true)

    // Unlink any conversations first
    await supabase
      .from('conversations')
      .update({ client_id: null })
      .eq('client_id', editClient.id)

    await supabase.from('clients').delete().eq('id', editClient.id)

    setSaving(false)
    onSaved()
    onClose()
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="bg-surface-container-high border-outline-variant/30 max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editClient ? 'Edit client' : 'New client'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-surface" placeholder="Client name or alias" />
            </div>
            <div className="space-y-2">
              <Label>Preferences</Label>
              <Textarea value={preferences} onChange={(e) => setPreferences(e.target.value)} rows={3} className="bg-surface" placeholder="Notes about this client..." />
            </div>
            <div className="space-y-2">
              <Label>Tags</Label>
              <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="bg-surface" placeholder="regular, polite, generous (comma-separated)" />
            </div>
            <label className="flex items-center gap-3 cursor-pointer">
              <Checkbox checked={isVip} onCheckedChange={(c) => setIsVip(c === true)} />
              <span className="text-sm">VIP client</span>
            </label>

            {editClient && (
              <>
                <div className="rounded-xl bg-surface p-3 space-y-1 text-xs text-on-surface-variant">
                  <p>Total bookings: <span className="text-on-surface">{editClient.total_bookings}</span></p>
                  {editClient.last_booking_at && (
                    <p>Last booking: <span className="text-on-surface">{new Date(editClient.last_booking_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Bookings</Label>
                    <Button variant="ghost" size="sm" onClick={() => setBookingModalOpen(true)} className="h-6 text-xs gap-1">
                      <CalendarPlus className="h-3 w-3" />
                      Add booking
                    </Button>
                  </div>
                  {bookings.length === 0 ? (
                    <p className="text-xs text-on-surface-variant/60">No bookings yet.</p>
                  ) : (
                    <div className="space-y-1 max-h-40 overflow-y-auto">
                      {bookings.map((b) => (
                        <div key={b.id} className="flex items-center justify-between rounded-xl bg-surface px-3 py-2 text-xs">
                          <div>
                            <span className="text-on-surface">
                              {new Date(b.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                            {b.duration && <span className="ml-2 text-on-surface-variant/60">{b.duration}</span>}
                          </div>
                          {b.revenue_cents > 0 && (
                            <span className="text-on-surface-variant">${(b.revenue_cents / 100).toFixed(2)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            <div className="flex justify-between pt-2">
              {editClient ? (
                <Button variant="ghost" onClick={handleDelete} disabled={saving} className="text-xs text-error hover:bg-error/10">
                  Delete client
                </Button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose}>Cancel</Button>
                <Button onClick={handleSave} disabled={!name.trim() || saving} className="gradient-cta text-white">
                  {saving ? 'Saving...' : editClient ? 'Save changes' : 'Create client'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {editClient && (
        <BookingModal
          open={bookingModalOpen}
          onClose={() => setBookingModalOpen(false)}
          supabase={supabase}
          userId={userId}
          clientId={editClient.id}
          clientName={editClient.name}
          onSaved={() => {
            loadBookings(editClient.id)
            onSaved()
          }}
        />
      )}
    </>
  )
}
