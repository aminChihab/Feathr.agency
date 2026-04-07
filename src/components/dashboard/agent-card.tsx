import { Bot, Cog } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AgentCardProps {
  name: string
  type: 'ai' | 'script'
  description: string | null
  status: string
  lastActivityAt: string | null
  lastActivityDescription: string | null
}

const STATUS_CONFIG: Record<string, { color: string; label: string; pulse?: boolean }> = {
  active: { color: 'bg-status-scheduled', label: 'Active', pulse: true },
  idle: { color: 'bg-text-muted', label: 'Idle' },
  paused: { color: 'bg-status-draft', label: 'Paused' },
  error: { color: 'bg-status-failed', label: 'Error' },
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function AgentCard({ name, type, description, status, lastActivityAt, lastActivityDescription }: AgentCardProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-5 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {type === 'ai' ? (
            <Bot className="h-5 w-5 text-accent" />
          ) : (
            <Cog className="h-5 w-5 text-text-muted" />
          )}
          <div>
            <p className="text-sm font-medium">{name}</p>
            <span className="text-[10px] uppercase tracking-wider text-text-muted">
              {type === 'ai' ? 'AI Assistant' : 'Automated'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 rounded-full', config.color, config.pulse && 'animate-pulse')} />
          <span className="text-xs text-text-muted">{config.label}</span>
        </div>
      </div>

      {description && (
        <p className="text-xs text-text-secondary">{description}</p>
      )}

      {lastActivityAt && (
        <div className="text-[10px] text-text-muted">
          <span>{relativeTime(lastActivityAt)}</span>
          {lastActivityDescription && <span> — {lastActivityDescription}</span>}
        </div>
      )}

      {!lastActivityAt && (
        <p className="text-[10px] text-text-muted">No activity yet</p>
      )}
    </div>
  )
}
