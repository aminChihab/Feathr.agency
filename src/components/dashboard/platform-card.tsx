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
  connected: 'text-status-scheduled',
  expired: 'text-status-draft',
  error: 'text-status-failed',
  disconnected: 'text-text-muted',
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
    <div className="flex items-center justify-between rounded-lg border border-border bg-bg-surface px-5 py-4">
      <div className="flex items-center gap-4">
        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: account.platform_color }} />
        <div>
          <p className="text-sm font-medium">{account.platform_name}</p>
          <p className="text-xs text-text-muted">
            {account.username ?? 'No username'} · Connected {connectedDate}
          </p>
        </div>
        <span className={`text-xs font-medium capitalize ${STATUS_COLORS[account.status] ?? 'text-text-muted'}`}>
          {account.status}
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Select
          value={account.schedule_json?.frequency ?? ''}
          onValueChange={(val) => onScheduleChange(account.id, val)}
        >
          <SelectTrigger className="w-36 bg-bg-base h-8 text-xs">
            <SelectValue placeholder="Schedule" />
          </SelectTrigger>
          <SelectContent>
            {FREQUENCY_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {account.status === 'connected' ? (
          <Button variant="ghost" size="sm" onClick={() => onDisconnect(account.id)} className="text-xs text-text-muted hover:text-status-failed">
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
