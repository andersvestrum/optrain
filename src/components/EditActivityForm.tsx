'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  activityId: number
  initialName: string
  initialDescription: string
  initialDistance: number  // metres
  movingTime: number       // seconds
  isRun: boolean
  defaultOpen?: boolean    // open the form immediately (e.g. for indoor activities with no distance)
}

function livePace(distanceM: number, movingTime: number): string {
  if (distanceM <= 0 || movingTime <= 0) return '—'
  const secPerKm = (movingTime / distanceM) * 1000
  const min = Math.floor(secPerKm / 60)
  const sec = Math.round(secPerKm % 60)
  return `${min}:${String(sec).padStart(2, '0')} /km`
}

function liveSpeed(distanceM: number, movingTime: number): string {
  if (distanceM <= 0 || movingTime <= 0) return '—'
  const kmh = (distanceM / 1000) / (movingTime / 3600)
  return `${kmh.toFixed(1)} km/h`
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export default function EditActivityForm({
  activityId,
  initialName,
  initialDescription,
  initialDistance,
  movingTime,
  isRun,
  defaultOpen = false,
}: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(defaultOpen)

  const [name, setName]               = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const [distanceKm, setDistanceKm]   = useState(
    initialDistance > 0 ? (initialDistance / 1000).toFixed(2) : ''
  )
  const [status, setStatus]           = useState<SaveStatus>('idle')
  const [stravaError, setStravaError] = useState<string | null>(null)

  const distanceM = parseFloat(distanceKm) * 1000 || 0
  const isDirty =
    name !== initialName ||
    description !== initialDescription ||
    Math.abs(distanceM - initialDistance) > 1

  function reset() {
    setName(initialName)
    setDescription(initialDescription)
    setDistanceKm(initialDistance > 0 ? (initialDistance / 1000).toFixed(2) : '')
    setStatus('idle')
    setStravaError(null)
  }

  async function save(pushToStrava: boolean) {
    setStatus('saving')
    setStravaError(null)

    const updates = {
      name,
      description,
      ...(distanceM > 0 ? { distance: distanceM } : {}),
    }

    const endpoint = pushToStrava
      ? `/api/activities/${activityId}/strava`
      : `/api/activities/${activityId}/patch`
    const method = pushToStrava ? 'PUT' : 'PATCH'

    try {
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      const data = await res.json().catch(() => ({}))

      if (pushToStrava && data.stravaError) {
        setStravaError(data.stravaError)
      }

      setStatus('saved')
      router.refresh()
    } catch {
      setStatus('error')
    }
  }

  // ── Collapsed state — just show the edit button ────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-orange-500 transition-colors mt-3"
        title="Edit activity"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M16.862 3.487a2.25 2.25 0 113.182 3.182L7.5 19.213l-4.5 1.5 1.5-4.5 12.362-12.226z" />
        </svg>
        Edit activity
      </button>
    )
  }

  // ── Saved confirmation ────────────────────────────────────────────────────
  if (status === 'saved') {
    return (
      <div className="mt-3 flex items-center gap-3 text-sm">
        <span className="flex items-center gap-1.5 text-green-600">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          Saved
        </span>
        {stravaError && (
          <span className="text-amber-600 text-xs">Strava sync failed: {stravaError}</span>
        )}
        <button
          onClick={() => { setStatus('idle'); setOpen(false) }}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Close
        </button>
      </div>
    )
  }

  // ── Edit form ─────────────────────────────────────────────────────────────
  return (
    <div className="mt-4 space-y-3 border-t border-gray-100 pt-4">
      {/* Title */}
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Title</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          placeholder="Add a description…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
        />
      </div>

      {/* Distance + live speed/pace */}
      <div className="flex items-end gap-4">
        <div className="w-40">
          <label className="block text-xs text-gray-400 uppercase tracking-wide mb-1">Distance (km)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={distanceKm}
            onChange={(e) => setDistanceKm(e.target.value)}
            placeholder="0.00"
            className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent"
          />
        </div>
        {movingTime > 0 && distanceM > 0 && (
          <div className="pb-2 text-sm text-gray-400">
            <span className="text-xs uppercase tracking-wide mr-1">
              {isRun ? 'Pace' : 'Speed'}
            </span>
            <span className="font-semibold text-gray-700 tabular-nums">
              {isRun ? livePace(distanceM, movingTime) : liveSpeed(distanceM, movingTime)}
            </span>
          </div>
        )}
      </div>

      {/* Error */}
      {status === 'error' && (
        <p className="text-xs text-red-500">Something went wrong. Please try again.</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        <button
          onClick={() => save(false)}
          disabled={status === 'saving' || !isDirty}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'saving' && <Spinner />}
          Save
        </button>
        <button
          onClick={() => save(true)}
          disabled={status === 'saving' || !isDirty}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:border-orange-300 hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {status === 'saving' && <Spinner />}
          Save & sync to Strava
        </button>
        <button
          onClick={() => { reset(); setOpen(false) }}
          disabled={status === 'saving'}
          className="px-3 py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}

function Spinner() {
  return (
    <svg className="w-3.5 h-3.5 animate-spin text-current" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
