'use client'

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import type { ActivityStreams } from '@/types'
import { formatTime } from '@/lib/format'

interface ChartPoint {
  dist: number
  hr?: number
  alt?: number
  speed?: number
  cadence?: number
  watts?: number
}

function buildPoints(streams: ActivityStreams): ChartPoint[] {
  const { distance, heartrate, altitude, velocity_smooth, cadence, watts } = streams
  if (!distance) return []

  return distance.map((d, i) => ({
    dist: Math.round((d / 1000) * 100) / 100,
    hr: heartrate?.[i] ?? undefined,
    alt: altitude?.[i] != null ? Math.round(altitude[i]) : undefined,
    // cap wild pace spikes (< 2 km/h = almost stopped)
    speed:
      velocity_smooth?.[i] && velocity_smooth[i] > 0.55
        ? Math.round(velocity_smooth[i] * 3.6 * 10) / 10
        : undefined,
    cadence: cadence?.[i] ?? undefined,
    watts: watts?.[i] ?? undefined,
  }))
}

function paceLabel(speedKmh: number): string {
  if (!speedKmh || speedKmh <= 0) return '–'
  const secPerKm = 3600 / speedKmh
  return formatTime(Math.round(secPerKm)) + ' /km'
}

const TOOLTIP_STYLE = {
  borderRadius: '8px',
  border: '1px solid #e5e7eb',
  fontSize: '12px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
}

interface SubChartProps {
  data: ChartPoint[]
  dataKey: keyof ChartPoint
  color: string
  label: string
  unit: string
  domain?: [number | string, number | string]
  tickFormatter?: (v: number) => string
  tooltipFormatter?: (v: number) => string
}

function SubChart({
  data,
  dataKey,
  color,
  label,
  unit,
  domain,
  tickFormatter,
  tooltipFormatter,
}: SubChartProps) {
  const hasData = data.some((p) => p[dataKey] != null)
  if (!hasData) return null

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <ResponsiveContainer width="100%" height={140}>
        <AreaChart data={data} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id={`grad-${dataKey as string}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={color} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
          <XAxis
            dataKey="dist"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `${v} km`}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            domain={domain}
            tickFormatter={tickFormatter}
            width={40}
          />
          <Tooltip
            formatter={(v: number) =>
              tooltipFormatter ? [tooltipFormatter(v), label] : [`${v} ${unit}`, label]
            }
            labelFormatter={(v) => `${v} km`}
            contentStyle={TOOLTIP_STYLE}
          />
          <Area
            type="monotone"
            dataKey={dataKey as string}
            stroke={color}
            strokeWidth={1.5}
            fill={`url(#grad-${dataKey as string})`}
            dot={false}
            connectNulls={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function StreamsChart({ streams }: { streams: ActivityStreams }) {
  const data = buildPoints(streams)
  if (data.length === 0) return null

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
      <h2 className="text-base font-semibold text-gray-900">Activity Streams</h2>

      <SubChart
        data={data}
        dataKey="hr"
        color="#f97316"
        label="Heart Rate"
        unit="bpm"
        domain={['auto', 'auto']}
      />
      <SubChart
        data={data}
        dataKey="speed"
        color="#3b82f6"
        label="Speed"
        unit="km/h"
        domain={[0, 'auto']}
        tooltipFormatter={(v) => `${paceLabel(v)}  (${v} km/h)`}
      />
      <SubChart
        data={data}
        dataKey="alt"
        color="#10b981"
        label="Altitude"
        unit="m"
        domain={['auto', 'auto']}
        tickFormatter={(v) => `${v}m`}
      />
      <SubChart
        data={data}
        dataKey="cadence"
        color="#8b5cf6"
        label="Cadence"
        unit="rpm"
        domain={['auto', 'auto']}
      />
      <SubChart
        data={data}
        dataKey="watts"
        color="#f59e0b"
        label="Power"
        unit="W"
        domain={[0, 'auto']}
      />
    </div>
  )
}
