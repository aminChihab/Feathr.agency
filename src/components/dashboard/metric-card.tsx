import type { ReactNode } from 'react'

interface MetricCardProps {
  label: string
  value: number
  icon: ReactNode
}

export function MetricCard({ label, value, icon }: MetricCardProps) {
  return (
    <div className="rounded-lg border border-border bg-bg-surface p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-text-secondary">{label}</p>
        <div className="text-text-muted">{icon}</div>
      </div>
      <p className="mt-2 text-3xl font-light">{value}</p>
    </div>
  )
}
