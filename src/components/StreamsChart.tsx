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
  x: number      // km when distance stream present; seconds when time-only
  hr?: number
  alt?: number
  speed?: number
  cadence?: number
  watts?: number
}

type XMode = 'distance' | 'time'

function buildPoints(streams: ActivityStreams): { points: ChartPoint[]; xMode: XMode } {
  const { distance, time, heartrate, altitude, velocity_smooth, cadence, watts } = streams

  // Prefer distance as X-axis (outdoor). Fall back to time (indoor/no GPS).
  const xs = distance ?? time
  const xMode: XMode = distance ? 'distance' : 'time'
  if (!xs || xs.length === 0) return { points: [], xMode }

  const points: ChartPoint[] = xs.map((val, i) => ({
    x: xMode === 'distance'
      ? Math.round((val / 1000) * 100) / 100   // metres → km, 2 dp
      : val,                                    // seconds as-is
    hr: heartrate?.[i] ?? undefined,
    alt: altitude?.[i] != null ? Math.round(altitude[i]) : undefined,
    // filter near-zero speed (< 2 km/h) to suppress stopped/paused spikes
    speed:
      velocity_smooth?.[i] != null && velocity_smooth[i] > 0.55
        ? Math.round(velocity_smooth[i] * 3.6 * 10) / 10
        : undefined,
    cadence: cadence?.[i] ?? undefined,
    watts: watts?.[i] ?? undefined,
  }))

  return { points, xMode }
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
  xMode: XMode
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
  xMode,
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

  const xTickFormatter = xMode === 'distance'
    ? (v: number) => `${v} km`
    : (v: number) => formatTime(v)

  const xTooltipFormatter = xMode === 'distance'
    ? (v: number) => `${v} km`
    : (v: number) => formatTime(v)

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
            dataKey="x"
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={xTickFormatter}
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
            labelFormatter={(v) => xTooltipFormatter(v as number)}
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

// Rowing cadence is strokes/min (spm); everything else is rpm
const ROWING_TYPES = new Set(['Rowing', 'Canoeing', 'Kayaking', 'StandUpPaddling'])

interface StreamsChartProps {
  streams: ActivityStreams
  activityType?: string
}

export default function StreamsChart({ streams, activityType }: StreamsChartProps) {
  const { points: data, xMode } = buildPoints(streams)
  if (data.length === 0) return null

  const cadenceUnit = ROWING_TYPES.has(activityType ?? '') ? 'spm' : 'rpm'

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 space-y-6">
      <h2 className="text-base font-semibold text-gray-900">Activity Streams</h2>

      <SubChart
        data={data}
        xMode={xMode}
        dataKey="hr"
        color="#f97316"
        label="Heart Rate"
        unit="bpm"
        domain={['auto', 'auto']}
      />
      <SubChart
        data={data}
        xMode={xMode}
        dataKey="speed"
        color="#3b82f6"
        label="Speed"
        unit="km/h"
        domain={[0, 'auto']}
        tooltipFormatter={(v) => `${paceLabel(v)}  (${v} km/h)`}
      />
      <SubChart
        data={data}
        xMode={xMode}
        dataKey="alt"
        color="#10b981"
        label="Altitude"
        unit="m"
        domain={['auto', 'auto']}
        tickFormatter={(v) => `${v}m`}
      />
      <SubChart
        data={data}
        xMode={xMode}
        dataKey="cadence"
        color="#8b5cf6"
        label={`Cadence (${cadenceUnit})`}
        unit={cadenceUnit}
        domain={['auto', 'auto']}
      />
      <SubChart
        data={data}
        xMode={xMode}
        dataKey="watts"
        color="#f59e0b"
        label="Power"
        unit="W"
        domain={[0, 'auto']}
      />
    </div>
  )
}
