'use client'

import dynamic from 'next/dynamic'
import type { ActivityStreams } from '@/types'

const StreamsChart = dynamic(() => import('./StreamsChart'), { ssr: false })

interface Props {
  streams: ActivityStreams
  activityType?: string
}

export default function StreamsChartClient({ streams, activityType }: Props) {
  return <StreamsChart streams={streams} activityType={activityType} />
}
