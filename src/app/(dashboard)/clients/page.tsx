// src/app/(dashboard)/clients/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ClientListItem } from '@/components/dashboard/client-list-item'
import { ClientModal } from '@/components/dashboard/client-modal'
import { UserPlus, Search } from 'lucide-react'

type Client = Database['public']['Tables']['clients']['Row']

export default function ClientsPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        await loadClients(user.id)
      }
      setLoading(false)
    }
    init()
  }, [])

  async function loadClients(uid: string) {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('profile_id', uid)
      .order('updated_at', { ascending: false })

    setClients(data ?? [])
  }

  const filtered = clients.filter((c) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      c.name.toLowerCase().includes(q) ||
      (c.tags ?? []).some(t => t.toLowerCase().includes(q))
    )
  })

  function handleEdit(client: Client) {
    setEditClient(client)
    setModalOpen(true)
  }

  function handleNew() {
    setEditClient(null)
    setModalOpen(true)
  }

  if (!userId) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-light">Clients</h1>
        <Button onClick={handleNew} className="bg-accent text-white hover:bg-accent-hover">
          <UserPlus className="h-4 w-4 mr-1.5" />
          New client
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients by name or tag..."
          className="bg-bg-surface pl-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-border bg-bg-surface p-12 text-center">
          <p className="text-text-muted">
            {search ? 'No clients match your search.' : 'No clients yet. Clients are created when bookings are confirmed.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((client) => (
            <ClientListItem key={client.id} client={client} onClick={() => handleEdit(client)} />
          ))}
        </div>
      )}

      <ClientModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditClient(null) }}
        supabase={supabase}
        userId={userId}
        editClient={editClient}
        onSaved={() => loadClients(userId!)}
      />
    </div>
  )
}
