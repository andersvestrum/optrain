'use client'

import { useEffect, useState } from 'react'

interface StravaPhoto {
  unique_id: string
  urls: Record<string, string>
  caption?: string
  location?: [number, number]
}

export default function ActivityPhotos({ activityId }: { activityId: number }) {
  const [photos, setPhotos] = useState<StravaPhoto[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    fetch(`/api/activities/${activityId}/photos`)
      .then((r) => r.json())
      .then((data) => {
        setPhotos(data.photos ?? [])
        setLoaded(true)
      })
      .catch(() => setLoaded(true))
  }, [activityId])

  if (!loaded || photos.length === 0) return null

  const url = (photo: StravaPhoto) =>
    photo.urls['2048'] ?? photo.urls['600'] ?? Object.values(photo.urls)[0]

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Photos
        <span className="ml-2 text-xs font-normal text-gray-400">({photos.length})</span>
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {photos.map((photo) => (
          <a
            key={photo.unique_id}
            href={url(photo)}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden rounded-xl border border-gray-100 hover:opacity-90 transition-opacity"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url(photo)}
              alt={photo.caption ?? 'Activity photo'}
              className="w-full h-44 object-cover"
            />
            {photo.caption && (
              <p className="text-xs text-gray-500 px-2 py-1.5 truncate">{photo.caption}</p>
            )}
          </a>
        ))}
      </div>
    </div>
  )
}
