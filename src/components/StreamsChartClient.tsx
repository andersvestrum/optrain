'use client'

import dynamic from 'next/dynamic'
import type { ActivityStreams } from '@/types'

const StreamsChart = dynamic(() => import('./StreamsChart'), { ssr: false })

export default function StreamsChartClient({ streams }: { streams: ActivityStreams }) {
  return <StreamsChart streams={streams} />
}
