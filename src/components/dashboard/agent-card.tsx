// src/components/dashboard/agent-card.tsx
import { cn } from '@/lib/utils'

interface AgentCardProps {
  name: string
  type: 'ai' | 'script'
  description: string | null
  status: string
  lastActivityAt: string | null
  lastActivityDescription: string | null
  icon?: string
  progress?: number
  currentTask?: string | null
}

const STATUS_CONFIG: Record<string, { dotColor: string; label: string; labelColor: string; bgClass: string; borderClass: string; pulse?: boolean }> = {
  active: { dotColor: 'bg-tertiary', label: 'Running', labelColor: 'text-tertiary', bgClass: 'bg-tertiary-container/10', borderClass: 'border-tertiary-container/20', pulse: true },
  idle: { dotColor: 'bg-on-surface-variant/40', label: 'Idle', labelColor: 'text-on-surface-variant/60', bgClass: 'bg-surface-container-highest', borderClass: 'border-transparent' },
  paused: { dotColor: 'bg-on-surface-variant/40', label: 'Paused', labelColor: 'text-on-surface-variant/60', bgClass: 'bg-surface-container-highest', borderClass: 'border-transparent' },
  error: { dotColor: 'bg-error', label: 'Error', labelColor: 'text-error', bgClass: 'bg-error-container/10', borderClass: 'border-error-container/20' },
}

const AGENT_ICONS: Record<string, string> = {
  'The Researcher': 'biotech',
  'The Strategist': 'insights',
  'The Architect': 'palette',
  'The Poster': 'send',
  'The Syncer': 'sync',
  'The Archivist': 'inventory_2',
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

export function AgentCard({ name, type, description, status, lastActivityAt, lastActivityDescription, icon, progress, currentTask }: AgentCardProps) {
  const config = STATUS_CONFIG[status] ?? STATUS_CONFIG.idle
  const materialIcon = icon ?? AGENT_ICONS[name] ?? (type === 'ai' ? 'smart_toy' : 'settings')

  // AI agents get the large editorial card
  if (type === 'ai') {
    return (
      <div className="group backdrop-blur-xl bg-[rgba(42,42,42,0.4)] border border-outline/10 rounded-xl p-6 transition-all duration-300 hover:bg-surface-container-high hover:-translate-y-1">
        {/* Top: icon + status */}
        <div className="flex justify-between items-start mb-6">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">{materialIcon}</span>
          </div>
          <div className={cn('flex items-center gap-2 px-3 py-1 rounded-full border', config.bgClass, config.borderClass)}>
            <span className={cn('w-2 h-2 rounded-full', config.dotColor, config.pulse && 'animate-pulse')} />
            <span className={cn('text-[10px] font-bold uppercase tracking-tighter', config.labelColor)}>{config.label}</span>
          </div>
        </div>

        {/* Name (serif) + description */}
        <h4 className="font-display text-2xl mb-2 text-on-surface">{name}</h4>
        <p className="text-on-surface-variant text-sm leading-relaxed mb-6">{description ?? 'No description available.'}</p>

        {/* Bottom section */}
        <div className="pt-6 border-t border-outline-variant/10">
          {status === 'active' && progress != null ? (
            <div className="space-y-3">
              <div className="flex justify-between text-[11px] uppercase tracking-wider text-on-surface-variant">
                <span>Current Task</span>
                <span className="text-primary">{progress}%</span>
              </div>
              <div className="h-1 bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-primary rounded-full" style={{ width: `${progress}%` }} />
              </div>
              {currentTask && (
                <p className="text-[10px] italic text-on-surface-variant/60">&ldquo;{currentTask}&rdquo;</p>
              )}
            </div>
          ) : status === 'error' ? (
            <div>
              <div className="flex items-start gap-2 text-error text-[11px]">
                <span className="material-symbols-outlined text-sm">warning</span>
                <span>{lastActivityDescription ?? 'An error occurred'}</span>
              </div>
              <button className="mt-3 w-full py-2 bg-error/10 hover:bg-error/20 text-error text-[10px] font-bold uppercase tracking-widest rounded transition-colors">
                Re-authenticate
              </button>
            </div>
          ) : (
            <div className="bg-surface-container-lowest/50 p-3 rounded-lg flex items-center gap-3">
              <span className="material-symbols-outlined text-sm text-on-surface-variant">history</span>
              <span className="text-[11px] text-on-surface-variant">
                {lastActivityAt
                  ? `Last active ${relativeTime(lastActivityAt)}${lastActivityDescription ? ` — ${lastActivityDescription}` : ''}`
                  : 'No activity yet'}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Script/automated agents get the compact row card
  return (
    <div className="flex items-center gap-6 p-6 rounded-xl bg-surface-container-low hover:bg-surface-container transition-colors group">
      <div className="w-10 h-10 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant group-hover:text-primary transition-colors">
        <span className="material-symbols-outlined">{materialIcon}</span>
      </div>
      <div className="flex-1">
        <h5 className="text-sm font-bold tracking-tight">{name}</h5>
        <p className="text-xs text-on-surface-variant">{description ?? 'No description available.'}</p>
      </div>
      <div className="text-right">
        <p className={cn('text-[10px] uppercase font-bold', status === 'active' ? 'text-tertiary' : 'text-on-surface-variant/40')}>
          {config.label}
        </p>
        {lastActivityDescription && (
          <p className="text-xs font-display italic text-on-surface-variant mt-1">{lastActivityDescription}</p>
        )}
      </div>
      <button className="w-8 h-8 rounded-full hover:bg-surface-bright flex items-center justify-center transition-colors">
        <span className="material-symbols-outlined text-sm">more_vert</span>
      </button>
    </div>
  )
}
