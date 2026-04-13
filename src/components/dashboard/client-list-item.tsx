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
  const diffMs = now - then
  const hours = Math.floor(diffMs / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function ClientListItem({ client, onClick }: ClientListItemProps) {
  const initials = client.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <tr
      onClick={onClick}
      className="hover:bg-surface-container-high/50 transition-colors group cursor-pointer"
    >
      {/* Client Identity */}
      <td className="px-8 py-5">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-sm font-medium text-on-surface-variant grayscale group-hover:grayscale-0 transition-all duration-300">
              {initials}
            </div>
            {client.is_vip && (
              <span className="absolute -top-1 -right-1 bg-background p-0.5 rounded-full">
                <span className="material-symbols-outlined text-primary text-[14px]" style={{ fontVariationSettings: "'FILL' 1" }}>crown</span>
              </span>
            )}
          </div>
          <div>
            <div className="text-sm font-semibold text-on-surface">{client.name}</div>
            <div className="text-[11px] text-on-surface-variant">
              {(client.platforms as { platform: string; handle: string }[] | null)?.[0]?.handle ?? 'No platform linked'}
            </div>
          </div>
        </div>
      </td>

      {/* Segment Tags */}
      <td className="px-8 py-5">
        <div className="flex gap-2">
          {client.is_vip && (
            <span className="px-2 py-0.5 rounded bg-primary/10 text-[10px] text-primary border border-primary/20">VIP</span>
          )}
          {(client.tags ?? []).slice(0, 2).map((tag) => (
            <span key={tag} className="px-2 py-0.5 rounded bg-surface-container-highest text-[10px] text-on-surface-variant border border-outline-variant/20">
              {tag}
            </span>
          ))}
        </div>
      </td>

      {/* Total Spend */}
      <td className="px-8 py-5">
        <div className="text-sm font-medium">
          {client.total_bookings > 0 ? `${client.total_bookings} sessions` : '--'}
        </div>
      </td>

      {/* Bookings */}
      <td className="px-8 py-5 text-center font-display text-lg">{client.total_bookings}</td>

      {/* Last Contact */}
      <td className="px-8 py-5 text-xs text-on-surface-variant">
        {client.last_booking_at ? relativeDate(client.last_booking_at) : 'Never'}
      </td>

      {/* Actions */}
      <td className="px-8 py-5 text-right">
        <button
          className="p-2 hover:bg-surface-container-highest rounded-lg transition-colors"
          onClick={(e) => { e.stopPropagation(); onClick() }}
        >
          <span className="material-symbols-outlined text-sm">more_horiz</span>
        </button>
      </td>
    </tr>
  )
}
