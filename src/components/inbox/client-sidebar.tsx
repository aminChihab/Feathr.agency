// src/components/inbox/client-sidebar.tsx
'use client'

import { useState } from 'react'
import type { Database } from '@/types/database'

type Client = Database['public']['Tables']['clients']['Row']

interface ClientSidebarProps {
  client: Client | null
  conversation: {
    contact_name: string | null
    contact_handle: string | null
    platform_name: string
  } | null
  onLinkClient: () => void
  onUnlinkClient: () => void
  onAddBooking?: () => void
  onCreateClient?: () => void
  onUpdateClient?: (updates: Partial<Client>) => void
  bookings?: Array<{ id: string; date: string; revenue_cents: number; notes: string | null }>
}

export function ClientSidebar({
  client,
  conversation,
  onLinkClient,
  onUnlinkClient,
  onAddBooking,
  onCreateClient,
  onUpdateClient,
  bookings,
}: ClientSidebarProps) {
  const displayName = client?.name ?? conversation?.contact_name ?? 'Unknown'
  const initials = displayName[0]?.toUpperCase() ?? '?'

  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editPreferences, setEditPreferences] = useState('')
  const [editTags, setEditTags] = useState('')
  const [editVip, setEditVip] = useState(false)
  const [historyExpanded, setHistoryExpanded] = useState(false)

  function enterEditMode() {
    if (!client) return
    setEditName(client.name)
    setEditPreferences(client.preferences ?? '')
    setEditTags((client.tags ?? []).join(', '))
    setEditVip(client.is_vip)
    setEditing(true)
  }

  function handleSave() {
    if (!onUpdateClient) return
    onUpdateClient({
      name: editName,
      preferences: editPreferences || null,
      tags: editTags ? editTags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      is_vip: editVip,
    })
    setEditing(false)
  }

  function handleCancel() {
    setEditing(false)
  }

  function handleToggleVip() {
    if (!client || !onUpdateClient) return
    onUpdateClient({ is_vip: !client.is_vip })
  }

  return (
    <section className="w-80 flex flex-col bg-surface-container-lowest border-l border-outline-variant/10 overflow-y-auto custom-scrollbar">
      <div className="p-8 space-y-8">
        {/* Profile Card */}
        <div className="text-center">
          <div className="w-24 h-24 rounded-2xl mx-auto mb-4 border border-outline-variant/20 shadow-xl bg-surface-container-high flex items-center justify-center">
            <span className="text-3xl font-display italic text-on-surface-variant/60">{initials}</span>
          </div>
          <h4 className="font-display text-2xl text-on-surface">{displayName}</h4>
          {conversation?.contact_handle && (
            <p className="text-xs text-on-surface-variant/60 italic mt-1 font-body">
              {conversation.contact_handle}
            </p>
          )}
        </div>

        {/* CRM Link Status */}
        {client ? (
          <div className="bg-surface-container-high/40 rounded-2xl p-4 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">Client Status</span>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                {!editing && onUpdateClient && (
                  <button
                    onClick={enterEditMode}
                    className="text-[10px] font-bold uppercase tracking-widest text-primary hover:text-primary/80 transition-colors font-body"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>

            {editing ? (
              /* Edit Mode */
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-on-surface-variant/40 font-bold block mb-1">Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border-b-2 border-surface-variant bg-transparent focus:border-primary outline-none text-sm text-on-surface py-1 font-body transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-on-surface-variant/40 font-bold block mb-1">Preferences</label>
                  <textarea
                    value={editPreferences}
                    onChange={(e) => setEditPreferences(e.target.value)}
                    rows={3}
                    className="w-full border-b-2 border-surface-variant bg-transparent focus:border-primary outline-none text-sm text-on-surface py-1 font-body transition-colors resize-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-on-surface-variant/40 font-bold block mb-1">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    className="w-full border-b-2 border-surface-variant bg-transparent focus:border-primary outline-none text-sm text-on-surface py-1 font-body transition-colors"
                    placeholder="e.g. loyal, frequent, new"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="edit-vip"
                    checked={editVip}
                    onChange={(e) => setEditVip(e.target.checked)}
                    className="accent-primary"
                  />
                  <label htmlFor="edit-vip" className="text-xs text-on-surface font-body">VIP Client</label>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleSave}
                    className="flex-1 py-2 gradient-cta text-xs font-bold rounded-lg transition-opacity hover:opacity-90 font-body"
                  >
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    className="flex-1 py-2 border border-outline-variant/20 text-xs font-bold rounded-lg hover:bg-surface-container-highest transition-colors text-on-surface font-body"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="space-y-4">
                {client.total_bookings > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-on-surface-variant font-body">Total Bookings</span>
                    <span className="text-xs font-display text-on-surface">{client.total_bookings}</span>
                  </div>
                )}
                {client.last_booking_at && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-on-surface-variant font-body">Last Booking</span>
                    <span className="text-xs font-display text-on-surface">
                      {new Date(client.last_booking_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                )}
                {client.is_vip && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-on-surface-variant font-body">Status</span>
                    <span className="text-xs font-semibold text-primary font-body">VIP Client</span>
                  </div>
                )}

                {/* Tags */}
                {client.tags && client.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {client.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-surface-container-highest px-2 py-0.5 text-[10px] text-on-surface-variant font-body">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Preferences */}
                {client.preferences && (
                  <div className="pt-1">
                    <span className="text-[10px] text-on-surface-variant/60 block mb-1 font-body">Preferences</span>
                    <p className="text-xs text-on-surface leading-relaxed font-body">{client.preferences}</p>
                  </div>
                )}

                {/* Recent Bookings */}
                {bookings && bookings.length > 0 && (
                  <div className="pt-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 block mb-2">Recent Bookings</span>
                    <div className="space-y-2">
                      {bookings.slice(0, 3).map((booking) => (
                        <div key={booking.id} className="flex justify-between items-center">
                          <span className="text-xs text-on-surface-variant font-body">
                            {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </span>
                          <span className="text-xs font-display text-on-surface">
                            ${(booking.revenue_cents / 100).toFixed(0)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <div className="pt-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40 block mb-2">Quick Actions</span>
                  <div className="space-y-2">
                    {onAddBooking && (
                      <button
                        onClick={onAddBooking}
                        className="w-full py-2 border border-outline-variant/20 text-xs font-bold rounded-lg hover:bg-surface-container-highest transition-colors text-on-surface font-body"
                      >
                        Add Booking
                      </button>
                    )}

                    {onUpdateClient && (
                      <button
                        onClick={handleToggleVip}
                        className="w-full py-2 border border-outline-variant/20 text-xs font-bold rounded-lg hover:bg-surface-container-highest transition-colors text-on-surface font-body"
                      >
                        {client.is_vip ? 'Remove VIP' : 'Mark as VIP'}
                      </button>
                    )}

                    {bookings && bookings.length > 3 && (
                      <button
                        onClick={() => setHistoryExpanded(!historyExpanded)}
                        className="w-full py-2 text-xs text-on-surface-variant/60 hover:text-on-surface transition-colors font-body"
                      >
                        {historyExpanded ? 'Hide History' : 'View All History'}
                      </button>
                    )}

                    {historyExpanded && bookings && bookings.length > 3 && (
                      <div className="space-y-2 pt-1">
                        {bookings.slice(3).map((booking) => (
                          <div key={booking.id} className="flex justify-between items-center">
                            <span className="text-xs text-on-surface-variant font-body">
                              {new Date(booking.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                            <span className="text-xs font-display text-on-surface">
                              ${(booking.revenue_cents / 100).toFixed(0)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={onUnlinkClient}
                  className="w-full py-2 text-xs text-on-surface-variant/40 hover:text-error transition-colors font-body"
                >
                  Unlink Client
                </button>
              </div>
            )}
          </div>
        ) : (
          /* No client linked - Quick Insights placeholder + link/create buttons */
          <>
            <div className="space-y-6">
              <div className="space-y-3">
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">Quick Insights</h5>
                <div className="flex items-start gap-3 p-3 bg-surface-container-low rounded-xl">
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  <div>
                    <p className="text-[11px] font-medium leading-tight font-body">No client linked</p>
                    <p className="text-[10px] text-on-surface-variant/60 mt-0.5 font-body">Link this conversation to a client to see insights.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Link / Create Client Actions */}
        {!client && (
          <div className="pt-4 mt-auto border-t border-outline-variant/10 space-y-2">
            <button
              onClick={onLinkClient}
              className="w-full flex items-center justify-center gap-2 py-3 bg-surface-container-highest text-on-surface text-xs font-bold rounded-xl hover:bg-surface-bright transition-colors font-body"
            >
              <span className="material-symbols-outlined text-[18px]">link</span>
              Link to Client
            </button>
            {onCreateClient && (
              <button
                onClick={onCreateClient}
                className="w-full flex items-center justify-center gap-2 py-3 gradient-cta text-xs font-bold rounded-xl transition-opacity hover:opacity-90 font-body"
              >
                <span className="material-symbols-outlined text-[18px]">person_add</span>
                Create New Client
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
