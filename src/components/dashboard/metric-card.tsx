import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: number
  icon: ReactNode
  statusLabel?: string
  statusColor?: string
}

export function MetricCard({ label, value, icon, statusLabel, statusColor = 'text-on-surface-variant' }: MetricCardProps) {
  return (
    <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant/5 group hover:bg-surface-container transition-all">
      <div className="flex justify-between items-start mb-4">
        <div className={statusColor}>{icon}</div>
        {statusLabel && (
          <span className={`text-[10px] font-body uppercase tracking-widest ${statusColor}`}>
            {statusLabel}
          </span>
        )}
      </div>
      <div className="font-display text-4xl mb-1">{String(value).padStart(2, '0')}</div>
      <div className="text-on-surface-variant text-sm font-body">{label}</div>
    </div>
  )
}
