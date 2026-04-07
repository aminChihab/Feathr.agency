import { cn } from '@/lib/utils'

const STATUS_STYLES: Record<string, string> = {
  draft: 'bg-status-draft/15 text-status-draft',
  approved: 'bg-status-approved/15 text-status-approved',
  scheduled: 'bg-status-scheduled/15 text-status-scheduled',
  posted: 'bg-status-posted/15 text-status-posted',
  failed: 'bg-status-failed/15 text-status-failed',
}

interface StatusBadgeProps {
  status: string
  className?: string
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize',
        STATUS_STYLES[status] ?? 'bg-bg-elevated text-text-muted',
        className
      )}
    >
      {status}
    </span>
  )
}
