// src/app/(dashboard)/clients/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database'
import { ClientListItem } from '@/components/dashboard/client-list-item'
import { ClientModal } from '@/components/dashboard/client-modal'

type Client = Database['public']['Tables']['clients']['Row']

type FilterTab = 'all' | 'recent' | 'unreached'

export default function ClientsPage() {
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [clients, setClients] = useState<Client[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editClient, setEditClient] = useState<Client | null>(null)
  const [activeTab, setActiveTab] = useState<FilterTab>('all')

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
    // Search filter
    if (search) {
      const q = search.toLowerCase()
      const matchesSearch = c.name.toLowerCase().includes(q) ||
        (c.tags ?? []).some(t => t.toLowerCase().includes(q))
      if (!matchesSearch) return false
    }

    // Tab filter
    if (activeTab === 'recent') {
      if (!c.last_booking_at) return false
      const daysSince = (Date.now() - new Date(c.last_booking_at).getTime()) / 86400000
      return daysSince <= 30
    }
    if (activeTab === 'unreached') {
      return !c.last_booking_at || (Date.now() - new Date(c.last_booking_at).getTime()) / 86400000 > 60
    }
    return true
  })

  const totalAudience = clients.length
  const vipCount = clients.filter(c => c.is_vip).length
  const vipRetention = totalAudience > 0 ? Math.round((vipCount / totalAudience) * 100) : 0

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
    <>
      <header className="sticky top-0 z-40 bg-[#131313]/80 backdrop-blur-xl flex justify-between items-center h-20 px-10 shadow-2xl shadow-black/40">
        <h2 className="font-display text-3xl font-light text-primary">Clients</h2>
        <div className="flex items-center gap-8">
          <div className="relative hidden lg:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-lg">search</span>
            <input
              className="bg-surface-container-low border-none rounded-full py-2 pl-10 pr-4 text-sm w-64 focus:ring-1 focus:ring-primary/30 transition-all outline-none font-body text-on-surface placeholder:text-on-surface-variant/50"
              placeholder="Search clients..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleNew}
              className="bg-gradient-to-br from-primary to-primary-container text-on-primary font-semibold px-5 py-2.5 rounded-lg text-sm shadow-lg shadow-primary/10 hover:opacity-90 transition-opacity font-body"
            >
              New Client
            </button>
          </div>
        </div>
      </header>

      <div className="p-10 space-y-6">
      {/* Quick Stats Bento Section */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="md:col-span-1 bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
          <p className="text-on-surface-variant text-xs uppercase tracking-widest mb-1">Total Audience</p>
          <h3 className="font-display text-4xl text-primary">{totalAudience.toLocaleString()}</h3>
          <div className="mt-4 flex items-center gap-1 text-tertiary text-xs">
            <span className="material-symbols-outlined text-xs">trending_up</span>
            <span>+12% this month</span>
          </div>
        </div>
        <div className="md:col-span-1 bg-surface-container-low p-6 rounded-xl border border-outline-variant/10">
          <p className="text-on-surface-variant text-xs uppercase tracking-widest mb-1">VIP Retention</p>
          <h3 className="font-display text-4xl text-primary">{vipRetention}%</h3>
          <div className="mt-4 flex items-center gap-1 text-on-surface-variant text-xs">
            <span className="material-symbols-outlined text-xs">crown</span>
            <span>High loyalty index</span>
          </div>
        </div>
        <div className="md:col-span-2 bg-surface-container-high p-6 rounded-xl border border-outline-variant/15 flex items-center justify-between">
          <div>
            <p className="text-on-surface-variant text-xs uppercase tracking-widest mb-1">Engagement Trend</p>
            <h3 className="font-display text-2xl text-on-surface">Client Growth Cycle</h3>
            <p className="text-on-surface-variant text-sm mt-2 max-w-xs">Your campaign engagement is peaking with the &ldquo;Luxury&rdquo; segment.</p>
          </div>
          <div className="h-16 w-32 flex items-end gap-1">
            <div className="w-3 bg-primary/20 h-1/2 rounded-t-sm" />
            <div className="w-3 bg-primary/40 h-3/4 rounded-t-sm" />
            <div className="w-3 bg-primary/60 h-2/3 rounded-t-sm" />
            <div className="w-3 bg-primary h-full rounded-t-sm" />
            <div className="w-3 bg-primary/80 h-4/5 rounded-t-sm" />
          </div>
        </div>
      </section>

      {/* Main Client List Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant/10 mb-8">
          {/* Filter tabs */}
          <div className="px-8 py-6 border-b border-outline-variant/10 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('all')}
                className={`text-xs font-semibold pb-1 ${activeTab === 'all' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface transition-colors'}`}
              >
                All Clients
              </button>
              <button
                onClick={() => setActiveTab('recent')}
                className={`text-xs font-medium pb-1 ${activeTab === 'recent' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface transition-colors'}`}
              >
                Recently Active
              </button>
              <button
                onClick={() => setActiveTab('unreached')}
                className={`text-xs font-medium pb-1 ${activeTab === 'unreached' ? 'text-primary border-b-2 border-primary' : 'text-on-surface-variant hover:text-on-surface transition-colors'}`}
              >
                Unreached
              </button>
            </div>
            <button className="text-on-surface-variant hover:text-on-surface transition-colors">
              <span className="material-symbols-outlined text-sm">filter_list</span>
            </button>
          </div>

          {/* Table */}
          {filtered.length === 0 ? (
            <div className="px-8 py-12 text-center text-on-surface-variant">
              <p>{search ? 'No clients match your search.' : 'No clients yet. Clients are created when bookings are confirmed.'}</p>
            </div>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-widest text-on-surface-variant/60 border-b border-outline-variant/5">
                  <th className="px-8 py-4 font-medium">Client Identity</th>
                  <th className="px-8 py-4 font-medium">Segment Tags</th>
                  <th className="px-8 py-4 font-medium">Total Spend</th>
                  <th className="px-8 py-4 font-medium text-center">Bookings</th>
                  <th className="px-8 py-4 font-medium">Last Interaction</th>
                  <th className="px-8 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {filtered.map((client) => (
                  <ClientListItem key={client.id} client={client} onClick={() => handleEdit(client)} />
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination footer */}
          <div className="px-8 py-4 border-t border-outline-variant/10 flex justify-between items-center bg-surface-container-low/30">
            <p className="text-[10px] text-on-surface-variant">
              Showing {filtered.length} of {totalAudience} active clients
            </p>
            <div className="flex gap-2">
              <button className="p-1 hover:text-primary transition-colors disabled:opacity-30" disabled>
                <span className="material-symbols-outlined text-lg">chevron_left</span>
              </button>
              <button className="p-1 hover:text-primary transition-colors">
                <span className="material-symbols-outlined text-lg">chevron_right</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Asymmetrical Contextual Cards */}
      <section className="flex flex-col md:flex-row gap-6">
        <div className="flex-1 bg-gradient-to-br from-surface-container-high to-surface-container-low p-8 rounded-xl border border-outline-variant/10">
          <h4 className="font-display text-2xl text-on-surface mb-4">Client Insights</h4>
          <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
            {vipCount > 0
              ? `You have ${vipCount} VIP client${vipCount !== 1 ? 's' : ''} contributing the most this quarter. Consider an exclusive atelier preview to maintain engagement velocity.`
              : 'Start tagging your top clients as VIP to unlock personalized insights and campaign suggestions.'}
          </p>
          <div className="flex items-center gap-4">
            <span className="text-xs text-primary font-medium cursor-pointer">Generate VIP Campaign</span>
          </div>
        </div>
        <div className="w-full md:w-80 bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/10 flex flex-col justify-between">
          <div>
            <span className="material-symbols-outlined text-primary mb-4" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            <h4 className="font-display text-xl text-on-surface mb-2">Smart Groups</h4>
            <p className="text-xs text-on-surface-variant">
              Feathr AI has identified {clients.filter(c => !c.last_booking_at || (Date.now() - new Date(c.last_booking_at).getTime()) / 86400000 > 30).length} clients at risk of churn based on 30-day inactivity.
            </p>
          </div>
          <button className="mt-6 w-full py-2 border border-outline-variant/30 text-xs font-semibold rounded-lg hover:bg-surface-container-high transition-colors">
            Review Group
          </button>
        </div>
      </section>

      <ClientModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditClient(null) }}
        userId={userId}
        editClient={editClient}
        onSaved={() => loadClients(userId!)}
      />
      </div>
    </>
  )
}
