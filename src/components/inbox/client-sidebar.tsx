// src/components/inbox/client-sidebar.tsx
'use client'

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
}

export function ClientSidebar({ client, conversation, onLinkClient, onUnlinkClient, onAddBooking }: ClientSidebarProps) {
  const displayName = client?.name ?? conversation?.contact_name ?? 'Unknown'
  const initials = displayName[0]?.toUpperCase() ?? '?'

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
            <p className="text-xs text-on-surface-variant/60 italic mt-1">
              {conversation.contact_handle}
            </p>
          )}
        </div>

        {/* CRM Link Status */}
        {client ? (
          <div className="bg-surface-container-high/40 rounded-2xl p-4 border border-outline-variant/10">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">Client Status</span>
              <span className="w-2 h-2 rounded-full bg-primary" />
            </div>
            <div className="space-y-4">
              {client.total_bookings > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant">Total Bookings</span>
                  <span className="text-xs font-display text-on-surface">{client.total_bookings}</span>
                </div>
              )}
              {client.last_booking_at && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant">Last Booking</span>
                  <span className="text-xs font-display text-on-surface">
                    {new Date(client.last_booking_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </span>
                </div>
              )}
              {client.is_vip && (
                <div className="flex justify-between items-center">
                  <span className="text-xs text-on-surface-variant">Status</span>
                  <span className="text-xs font-semibold text-primary">VIP Client</span>
                </div>
              )}

              {/* Tags */}
              {client.tags && client.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {client.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-surface-container-highest px-2 py-0.5 text-[10px] text-on-surface-variant">
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Preferences */}
              {client.preferences && (
                <div className="pt-1">
                  <span className="text-[10px] text-on-surface-variant/60 block mb-1">Preferences</span>
                  <p className="text-xs text-on-surface leading-relaxed">{client.preferences}</p>
                </div>
              )}

              {onAddBooking && (
                <button
                  onClick={onAddBooking}
                  className="w-full mt-2 py-2 border border-outline-variant/20 text-xs font-bold rounded-lg hover:bg-surface-container-highest transition-colors text-on-surface"
                >
                  Add Booking
                </button>
              )}

              <button
                onClick={onUnlinkClient}
                className="w-full py-2 text-xs text-on-surface-variant/40 hover:text-error transition-colors"
              >
                Unlink Client
              </button>
            </div>
          </div>
        ) : (
          /* No client linked - Quick Insights placeholder + link button */
          <>
            <div className="space-y-6">
              <div className="space-y-3">
                <h5 className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/40">Quick Insights</h5>
                <div className="flex items-start gap-3 p-3 bg-surface-container-low rounded-xl">
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  <div>
                    <p className="text-[11px] font-medium leading-tight">No client linked</p>
                    <p className="text-[10px] text-on-surface-variant/60 mt-0.5">Link this conversation to a client to see insights.</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Link to Client Action */}
        {!client && (
          <div className="pt-4 mt-auto border-t border-outline-variant/10">
            <button
              onClick={onLinkClient}
              className="w-full flex items-center justify-center gap-2 py-3 bg-surface-container-highest text-on-surface text-xs font-bold rounded-xl hover:bg-surface-bright transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">link</span>
              Link to Client
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
