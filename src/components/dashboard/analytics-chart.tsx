// src/components/dashboard/analytics-chart.tsx
'use client'

import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

interface ChartDataPoint {
  date: string
  [key: string]: string | number
}

interface AnalyticsChartProps {
  type: 'line' | 'bar'
  data: ChartDataPoint[]
  series: { key: string; color: string; name: string }[]
  height?: number
}

const customTooltipStyle = {
  backgroundColor: 'oklch(0.17 0.005 285)',
  border: '1px solid oklch(0.25 0.005 285)',
  borderRadius: '8px',
  padding: '8px 12px',
  fontSize: '12px',
  color: 'oklch(0.95 0 0)',
}

export function AnalyticsChart({ type, data, series, height = 300 }: AnalyticsChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border bg-bg-surface" style={{ height }}>
        <p className="text-sm text-text-muted">Not enough data yet. Check back after a few days.</p>
      </div>
    )
  }

  const Chart = type === 'line' ? LineChart : BarChart

  return (
    <div className="rounded-lg border border-border bg-bg-surface p-4">
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.25 0.005 285)" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'oklch(0.5 0 0)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'oklch(0.25 0.005 285)' }}
          />
          <YAxis
            tick={{ fill: 'oklch(0.5 0 0)', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: 'oklch(0.25 0.005 285)' }}
          />
          <Tooltip contentStyle={customTooltipStyle} />
          {series.map((s) =>
            type === 'line' ? (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
              />
            ) : (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                radius={[4, 4, 0, 0]}
              />
            )
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  )
}
