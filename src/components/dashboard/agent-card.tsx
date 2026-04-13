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
  active: { color: 'bg-tertiary', label: 'Active', pulse: true },
  idle: { color: 'bg-on-surface-variant/40', label: 'Idle' },
  paused: { color: 'bg-status-draft', label: 'Paused' },
  error: { color: 'bg-error', label: 'Error' },
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
    <div className="bg-surface-container-low rounded-xl p-8 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {type === 'ai' ? (
            <Bot className="h-5 w-5 text-primary" />
          ) : (
            <Cog className="h-5 w-5 text-on-surface-variant/60" />
          )}
          <div>
            <p className="font-display text-xl">{name}</p>
            <span className="text-[10px] uppercase tracking-widest text-on-surface-variant/60">
              {type === 'ai' ? 'AI Assistant' : 'Automated'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={cn('h-2 w-2 rounded-full', config.color, config.pulse && 'animate-pulse')} />
          <span className="bg-surface-container-highest text-on-surface-variant text-xs rounded-full px-2 py-0.5">{config.label}</span>
        </div>
      </div>

      {description && (
        <p className="text-on-surface-variant text-sm">{description}</p>
      )}

      {lastActivityAt && (
        <div className="text-[10px] text-on-surface-variant/60">
          <span>{relativeTime(lastActivityAt)}</span>
          {lastActivityDescription && <span> — {lastActivityDescription}</span>}
        </div>
      )}

      {!lastActivityAt && (
        <p className="text-on-surface-variant/50 text-xs">No activity yet</p>
      )}
    </div>
  )
}
