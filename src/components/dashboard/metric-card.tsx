import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: number
  icon: ReactNode
  statusLabel?: string
}

export function MetricCard({ label, value, icon, statusLabel }: MetricCardProps) {
  return (
    <div className="bg-surface-container-low rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        {statusLabel && (
          <span className="text-[10px] uppercase tracking-widest text-on-surface-variant/60 font-body">
            {statusLabel}
          </span>
        )}
        <div className="text-on-surface-variant/30 ml-auto">{icon}</div>
      </div>
      <p className="font-display text-4xl text-on-surface">{value}</p>
      <p className="text-sm text-on-surface-variant font-body mt-1">{label}</p>
    </div>
  )
}
