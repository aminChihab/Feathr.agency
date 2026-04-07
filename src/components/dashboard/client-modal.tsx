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

type Client = Database['public']['Tables']['clients']['Row']

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

  useEffect(() => {
    if (editClient) {
      setName(editClient.name)
      setPreferences(editClient.preferences ?? '')
      setTagsInput((editClient.tags ?? []).join(', '))
      setIsVip(editClient.is_vip)
    } else {
      setName('')
      setPreferences('')
      setTagsInput('')
      setIsVip(false)
    }
  }, [editClient, open])

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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-bg-surface border-border max-w-md">
        <DialogHeader>
          <DialogTitle className="font-light">{editClient ? 'Edit client' : 'New client'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="bg-bg-base" placeholder="Client name or alias" />
          </div>
          <div className="space-y-2">
            <Label>Preferences</Label>
            <Textarea value={preferences} onChange={(e) => setPreferences(e.target.value)} rows={3} className="bg-bg-base" placeholder="Notes about this client..." />
          </div>
          <div className="space-y-2">
            <Label>Tags</Label>
            <Input value={tagsInput} onChange={(e) => setTagsInput(e.target.value)} className="bg-bg-base" placeholder="regular, polite, generous (comma-separated)" />
          </div>
          <label className="flex items-center gap-3 cursor-pointer">
            <Checkbox checked={isVip} onCheckedChange={(c) => setIsVip(c === true)} />
            <span className="text-sm">VIP client</span>
          </label>

          {editClient && (
            <div className="rounded-lg bg-bg-base p-3 space-y-1 text-xs text-text-muted">
              <p>Total bookings: <span className="text-text-primary">{editClient.total_bookings}</span></p>
              {editClient.last_booking_at && (
                <p>Last booking: <span className="text-text-primary">{new Date(editClient.last_booking_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span></p>
              )}
            </div>
          )}

          <div className="flex justify-between pt-2">
            {editClient ? (
              <Button variant="ghost" onClick={handleDelete} disabled={saving} className="text-xs text-status-failed hover:text-status-failed">
                Delete client
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button onClick={handleSave} disabled={!name.trim() || saving} className="bg-accent text-white hover:bg-accent-hover">
                {saving ? 'Saving...' : editClient ? 'Save changes' : 'Create client'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
