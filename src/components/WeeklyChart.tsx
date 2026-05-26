'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface WeeklyChartProps {
  data: Array<{ week: string; distance: number }>
}

export default function WeeklyChart({ data }: WeeklyChartProps) {
  if (data.every((d) => d.distance === 0)) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
        No activity data yet — sync to populate the chart.
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
        <XAxis
          dataKey="week"
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#9ca3af' }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          formatter={(value: number) => [`${value} km`, 'Distance']}
          contentStyle={{
            borderRadius: '10px',
            border: '1px solid #e5e7eb',
            fontSize: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}
          cursor={{ fill: '#fff7ed' }}
        />
        <Bar dataKey="distance" fill="#f97316" radius={[4, 4, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ResponsiveContainer>
  )
}
