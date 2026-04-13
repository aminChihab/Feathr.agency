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
  backgroundColor: '#2A2A2A',
  border: 'none',
  borderRadius: '12px',
  padding: '8px 12px',
  fontSize: '12px',
  color: '#E5E2E1',
}

export function AnalyticsChart({ type, data, series, height = 300 }: AnalyticsChartProps) {
  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center bg-surface-container-low rounded-xl" style={{ height }}>
        <p className="text-sm text-on-surface-variant/60">Not enough data yet. Check back after a few days.</p>
      </div>
    )
  }

  const Chart = type === 'line' ? LineChart : BarChart

  return (
    <div className="bg-surface-container-low rounded-xl p-4">
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
          <XAxis
            dataKey="date"
            tick={{ fill: '#D5C2C5', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#2A2A2A' }}
          />
          <YAxis
            tick={{ fill: '#D5C2C5', fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: '#2A2A2A' }}
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
