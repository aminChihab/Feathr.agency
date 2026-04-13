// src/components/dashboard/client-list-item.tsx
'use client'

import type { Database } from '@/types/database'

type Client = Database['public']['Tables']['clients']['Row']

interface ClientListItemProps {
  client: Client
  onClick: () => void
}

function relativeDate(dateStr: string): string {
  const now = Date.now()
  const then = new Date(dateStr).getTime()
  const days = Math.floor((now - then) / 86400000)
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

export function ClientListItem({ client, onClick }: ClientListItemProps) {
  const platforms = (client.platforms as { platform: string; handle: string }[]) ?? []

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between bg-surface-container-low rounded-xl px-5 py-4 text-left transition-colors hover:bg-surface-container-high"
    >
      <div className="flex items-center gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-on-surface font-medium">{client.name}</p>
            {client.is_vip && (
              <span className="bg-primary/15 text-primary text-xs rounded-full px-2 py-0.5">VIP</span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            {client.tags && client.tags.length > 0 && (
              <div className="flex gap-1">
                {client.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="bg-surface-container-highest text-on-surface-variant text-xs rounded-full px-2 py-0.5">
                    {tag}
                  </span>
                ))}
                {client.tags.length > 3 && (
                  <span className="text-xs text-on-surface-variant/60">+{client.tags.length - 3}</span>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-6 text-on-surface-variant text-sm">
        <div className="text-right">
          <p className="text-on-surface">{client.total_bookings}</p>
          <p>bookings</p>
        </div>
        {client.last_booking_at && (
          <div className="text-right">
            <p className="text-on-surface">{relativeDate(client.last_booking_at)}</p>
            <p>last booking</p>
          </div>
        )}
      </div>
    </button>
  )
}
