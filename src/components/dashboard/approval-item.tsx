'use client'

import { Button } from '@/components/ui/button'
import { StatusBadge } from './status-badge'
import { Check, X } from 'lucide-react'

interface ApprovalItemProps {
  id: string
  caption: string | null
  scheduledAt: string | null
  platformName: string
  platformColor: string
  onApprove: (id: string) => void
  onReject: (id: string) => void
}

export function ApprovalItem({
  id, caption, scheduledAt, platformName, platformColor, onApprove, onReject,
}: ApprovalItemProps) {
  const time = scheduledAt
    ? new Date(scheduledAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Not scheduled'

  return (
    <div className="flex items-center justify-between rounded-lg border border-outline-variant/15 bg-surface-container-low px-4 py-3">
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <span className="text-[10px] font-medium flex-shrink-0" style={{ color: platformColor }}>
          {platformName}
        </span>
        <p className="truncate text-sm">{caption || 'No caption'}</p>
        <span className="text-[10px] text-on-surface-variant/60 flex-shrink-0">{time}</span>
      </div>
      <div className="flex items-center gap-1 flex-shrink-0 ml-4">
        <StatusBadge status="draft" />
        <Button size="icon" variant="ghost" onClick={() => onApprove(id)} className="h-7 w-7 text-status-scheduled hover:text-status-scheduled">
          <Check className="h-4 w-4" />
        </Button>
        <Button size="icon" variant="ghost" onClick={() => onReject(id)} className="h-7 w-7 text-status-failed hover:text-status-failed">
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
