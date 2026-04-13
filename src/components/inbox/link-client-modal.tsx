// src/components/inbox/link-client-modal.tsx
'use client'

import { useEffect, useState } from 'react'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Crown, Plus, Search } from 'lucide-react'

type Client = Database['public']['Tables']['clients']['Row']

interface LinkClientModalProps {
  open: boolean
  onClose: () => void
  supabase: SupabaseClient<Database>
  userId: string
  conversationId: string
  contactName: string | null
  contactHandle: string | null
  onLinked: (client: Client) => void
}

export function LinkClientModal({
  open, onClose, supabase, userId, conversationId, contactName, contactHandle, onLinked,
}: LinkClientModalProps) {
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    async function load() {
      const { data } = await supabase
        .from('clients')
        .select('*')
        .eq('profile_id', userId)
        .order('name')
      setClients(data ?? [])
      setLoading(false)
    }
    setShowCreate(false)
    setNewName(contactName ?? contactHandle ?? '')
    setSearch('')
    load()
  }, [open])

  async function linkClient(clientId: string) {
    setSaving(true)
    await supabase
      .from('conversations')
      .update({ client_id: clientId })
      .eq('id', conversationId)

    const linked = clients.find(c => c.id === clientId)
    if (linked) onLinked(linked)
    setSaving(false)
    onClose()
  }

  async function createAndLink() {
    if (!newName.trim()) return
    setSaving(true)

    const { data: newClient } = await supabase
      .from('clients')
      .insert({
        profile_id: userId,
        name: newName.trim(),
        platforms: contactHandle ? [{ platform: 'unknown', handle: contactHandle }] : [],
      })
      .select()
      .single()

    if (newClient) {
      await supabase
        .from('conversations')
        .update({ client_id: newClient.id })
        .eq('id', conversationId)

      onLinked(newClient)
    }

    setSaving(false)
    onClose()
  }

  const filtered = clients.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="bg-surface-container-low border-outline-variant/15 max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-light">
            {showCreate ? 'Create new client' : 'Link to client'}
          </DialogTitle>
        </DialogHeader>

        {showCreate ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client name</Label>
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="bg-surface-container-lowest"
                placeholder="Name or alias"
              />
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setShowCreate(false)}>Back</Button>
              <Button onClick={createAndLink} disabled={!newName.trim() || saving} className="bg-primary text-on-primary hover:bg-primary/80">
                {saving ? 'Creating...' : 'Create & link'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant/60" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search clients..."
                className="bg-surface-container-lowest pl-9 h-8 text-xs"
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-1">
              {loading ? (
                <p className="text-center text-xs text-on-surface-variant/60 py-4">Loading...</p>
              ) : filtered.length === 0 ? (
                <p className="text-center text-xs text-on-surface-variant/60 py-4">
                  {search ? 'No clients found.' : 'No clients yet.'}
                </p>
              ) : (
                filtered.map((client) => (
                  <button
                    key={client.id}
                    onClick={() => linkClient(client.id)}
                    disabled={saving}
                    className="w-full flex items-center justify-between rounded-lg border border-outline-variant/15 px-3 py-2 text-left transition-colors hover:bg-surface-container-high"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{client.name}</span>
                      {client.is_vip && <Crown className="h-3 w-3 text-status-draft" />}
                    </div>
                    <span className="text-[10px] text-on-surface-variant/60">{client.total_bookings} bookings</span>
                  </button>
                ))
              )}
            </div>

            <Button variant="outline" onClick={() => setShowCreate(true)} className="w-full text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" />
              Create new client
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
