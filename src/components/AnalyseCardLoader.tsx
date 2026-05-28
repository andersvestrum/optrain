'use client'

/**
 * Fetches activity photos first, then renders AnalyseCard with the URLs.
 * Keeps AnalyseCard's logic clean — it only needs the final URL list.
 */
import { useEffect, useState } from 'react'
import AnalyseCard from './AnalyseCard'

interface Props {
  activityId: number
  sportType: string
}

export default function AnalyseCardLoader({ activityId, sportType }: Props) {
  const [photoUrls, setPhotoUrls] = useState<string[] | null>(null)

  useEffect(() => {
    fetch(`/api/activities/${activityId}/photos`)
      .then((r) => r.json())
      .then((data) => {
        const urls: string[] = (data.photos ?? []).map(
          (p: { urls: Record<string, string> }) =>
            p.urls['2048'] ?? p.urls['600'] ?? Object.values(p.urls)[0]
        ).filter(Boolean)
        setPhotoUrls(urls)
      })
      .catch(() => setPhotoUrls([]))
  }, [activityId])

  // Wait until photos are resolved so the analyse request includes them
  if (photoUrls === null) return null

  return (
    <AnalyseCard
      activityId={activityId}
      photoUrls={photoUrls}
      sportType={sportType}
    />
  )
}
