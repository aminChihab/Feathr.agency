// src/components/dashboard/platform-card.tsx
'use client'

import { PlatformIcon } from '@/components/ui/platform-icon'
import { MoreVertical } from 'lucide-react'

interface PlatformCardProps {
  account: {
    id: string
    username: string | null
    status: string
    connected_at: string
    schedule_json: any
    platform_id: string
    platform_name: string
    platform_color: string
    platform_slug: string
    auth_type: string
  }
  onDisconnect: (id: string) => void
  onReconnect: (account: PlatformCardProps['account']) => void
  onScheduleChange: (id: string, frequency: string) => void
}

const STATUS_DOT: Record<string, string> = {
  connected: 'bg-[#a8d1a8]',
  expired: 'bg-error',
  error: 'bg-error',
  disconnected: 'bg-on-surface-variant/40',
}

const STATUS_TEXT: Record<string, string> = {
  connected: 'text-[#a8d1a8]',
  expired: 'text-error',
  error: 'text-error',
  disconnected: 'text-on-surface-variant/60',
}

const FREQUENCY_OPTIONS = [
  { value: '1x_daily', label: '1x per day' },
  { value: '2x_daily', label: '2x per day' },
  { value: '3x_daily', label: '3x per day' },
  { value: 'continuous', label: 'Continuous' },
  { value: 'daily_digest', label: 'Daily Digest' },
  { value: 'manual', label: 'Manual' },
  { value: 'immediate', label: 'Immediate' },
  { value: 'on_trigger', label: 'On Trigger' },
]

export function PlatformCard({ account, onDisconnect, onReconnect, onScheduleChange }: PlatformCardProps) {
  return (
    <div className="group flex items-center justify-between p-4 bg-surface-container hover:bg-surface-bright transition-all duration-300 rounded-lg">
      {/* Left: icon + name */}
      <div className="flex items-center gap-4">
        <PlatformIcon slug={account.platform_slug} size={20} />
        <div>
          <h4 className="text-on-surface font-semibold text-sm">{account.platform_name}</h4>
          <p className="text-on-surface-variant text-xs">{account.username ?? 'No username'}</p>
        </div>
      </div>

      {/* Right: status, frequency, actions */}
      <div className="flex items-center gap-12">
        <div className="hidden sm:block">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Status</p>
          <div className="flex items-center gap-1.5">
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[account.status] ?? 'bg-on-surface-variant/40'}`} />
            <span className={`text-xs capitalize ${STATUS_TEXT[account.status] ?? 'text-on-surface-variant/60'}`}>
              {account.status}
            </span>
          </div>
        </div>

        <div className="hidden sm:block">
          <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-1">Frequency</p>
          <select
            className="bg-transparent border-none text-xs p-0 focus:ring-0 text-on-surface cursor-pointer font-medium"
            value={account.schedule_json?.frequency ?? '2x_daily'}
            onChange={(e) => onScheduleChange(account.id, e.target.value)}
          >
            {FREQUENCY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4">
          {account.status === 'connected' ? (
            <button
              onClick={() => onDisconnect(account.id)}
              className="text-on-surface-variant hover:text-error text-[11px] transition-colors"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => onReconnect(account)}
              className="text-on-surface-variant hover:text-primary text-[11px] transition-colors"
            >
              Reconnect
            </button>
          )}
          <MoreVertical className="h-4 w-4 text-on-surface-variant/40 cursor-pointer" />
        </div>
      </div>
    </div>
  )
}
