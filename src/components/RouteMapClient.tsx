'use client'

import dynamic from 'next/dynamic'
import type { ComponentProps } from 'react'

const RouteMap = dynamic(() => import('./RouteMap'), {
  ssr: false,
  loading: () => (
    <div className="h-[320px] rounded-xl bg-gray-100 animate-pulse" />
  ),
})

type RouteMapProps = ComponentProps<typeof RouteMap>

export default function RouteMapClient(props: RouteMapProps) {
  return <RouteMap {...props} />
}
