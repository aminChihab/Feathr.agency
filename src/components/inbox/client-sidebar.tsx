// src/components/inbox/client-sidebar.tsx
'use client'

import type { Database } from '@/types/database'
import { Crown } from 'lucide-react'

type Client = Database['public']['Tables']['clients']['Row']

interface ClientSidebarProps {
  client: Client | null
}

export function ClientSidebar({ client }: ClientSidebarProps) {
  return (
    <div className="w-[260px] border-l border-border p-4 space-y-4">
      <h3 className="text-xs font-medium uppercase tracking-wider text-text-muted">Client info</h3>

      {!client ? (
        <p className="text-xs text-text-muted">
          No client linked. Client linking will be available in CRM.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium">{client.name}</p>
            {client.is_vip && <Crown className="h-3.5 w-3.5 text-status-draft" />}
          </div>
          <div className="space-y-2 text-xs text-text-secondary">
            <div className="flex justify-between">
              <span>Bookings</span>
              <span className="text-text-primary">{client.total_bookings}</span>
            </div>
            {client.last_booking_at && (
              <div className="flex justify-between">
                <span>Last booking</span>
                <span className="text-text-primary">
                  {new Date(client.last_booking_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                </span>
              </div>
            )}
            {client.preferences && (
              <div>
                <span className="text-text-muted">Preferences</span>
                <p className="mt-1 text-text-primary">{client.preferences}</p>
              </div>
            )}
            {client.tags && client.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-1">
                {client.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-bg-elevated px-2 py-0.5 text-[10px]">
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
