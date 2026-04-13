// src/components/dashboard/platform-card.tsx
'use client'

import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

const STATUS_COLORS: Record<string, string> = {
  connected: 'text-tertiary',
  expired: 'text-error',
  error: 'text-error',
  disconnected: 'text-on-surface-variant/60',
}

const FREQUENCY_OPTIONS = [
  { value: 'daily', label: 'Daily' },
  { value: '2x_daily', label: '2x per day' },
  { value: '3x_weekly', label: '3x per week' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
]

export function PlatformCard({ account, onDisconnect, onReconnect, onScheduleChange }: PlatformCardProps) {
  const connectedDate = new Date(account.connected_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  })

  return (
    <div className="group flex items-center justify-between bg-surface-container-low rounded-xl p-5 hover:bg-surface-container transition-all duration-300">
      <div className="flex items-center gap-4">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: account.platform_color }} />
        <div>
          <p className="text-sm font-semibold text-on-surface">{account.platform_name}</p>
          <p className="text-xs text-on-surface-variant/60">
            {account.username ?? 'No username'} · Connected {connectedDate}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`h-1.5 w-1.5 rounded-full ${account.status === 'connected' ? 'bg-tertiary' : account.status === 'expired' || account.status === 'error' ? 'bg-error' : 'bg-on-surface-variant/40'}`} />
          <span className={`text-xs font-medium capitalize ${STATUS_COLORS[account.status] ?? 'text-on-surface-variant/60'}`}>
            {account.status}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={account.schedule_json?.frequency ?? ''}
          onValueChange={(val) => onScheduleChange(account.id, val)}
        >
          <SelectTrigger className="w-36 bg-surface-container-high h-8 text-xs border-none">
            <SelectValue placeholder="Schedule" />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {account.status === 'connected' ? (
          <Button variant="ghost" size="sm" onClick={() => onDisconnect(account.id)} className="text-sm text-on-surface-variant hover:text-error transition-colors">
            Disconnect
          </Button>
        ) : (
          <Button variant="outline" size="sm" onClick={() => onReconnect(account)} className="text-xs">
            Reconnect
          </Button>
        )}
      </div>
    </div>
  )
}
