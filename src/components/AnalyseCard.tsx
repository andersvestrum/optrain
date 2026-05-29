'use client'

import { useEffect, useState } from 'react'
import type { Suggestion } from '@/app/api/activities/[id]/analyse/route'

interface Props {
  activityId: number
  photoUrls: string[]
}

type Status = 'loading' | 'done' | 'empty' | 'no-token' | 'error' | 'saving' | 'saved-local' | 'saved-strava'

const LOADING_LABELS: Record<string, string> = {
  Rowing:         'Reading Concept2 display…',
  VirtualRow:     'Reading Concept2 display…',
  Ride:           'Reading indoor cycling display…',
  VirtualRide:    'Reading indoor cycling display…',
  Run:            'Reading treadmill display…',
  VirtualRun:     'Reading treadmill display…',
  Swim:           'Analysing swim session…',
  WeightTraining: 'Analysing workout…',
  default:        'Analysing activity…',
}

function loadingLabel(sportType: string) {
  return LOADING_LABELS[sportType] ?? LOADING_LABELS.default
}

const CACHE_KEY = (id: number) => `analyse-${id}`

interface CachedResult {
  suggestions: Suggestion[]
  notes: string
  model: string
  status: 'saved-local' | 'saved-strava'
}

export default function AnalyseCard({
  activityId,
  photoUrls,
}: Props & { sportType: string }) {
  const [status, setStatus]           = useState<Status>('loading')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [dismissed, setDismissed]     = useState<Set<string>>(new Set())
  const [notes, setNotes]             = useState('')
  const [model, setModel]             = useState('')
  const [stravaError, setStravaError] = useState<string | null>(null)
  const sportType = (arguments[0] as Props & { sportType: string }).sportType

  useEffect(() => {
    // Restore from localStorage if a previous save exists for this activity
    try {
      const raw = localStorage.getItem(CACHE_KEY(activityId))
      if (raw) {
        const cached: CachedResult = JSON.parse(raw)
        setSuggestions(cached.suggestions)
        setNotes(cached.notes)
        setModel(cached.model)
        setStatus(cached.status)
        return
      }
    } catch {
      // Corrupt cache — ignore and re-run analysis
    }

    fetch(`/api/activities/${activityId}/analyse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrls }),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.error === 'HF_TOKEN not configured') {
          setStatus('no-token')
          return
        }
        if (!data.suggestions?.length) {
          setStatus('empty')
          setNotes(data.notes ?? '')
          return
        }
        setSuggestions(data.suggestions)
        setNotes(data.notes ?? '')
        setModel(data.model ?? '')
        setStatus('done')
      })
      .catch(() => setStatus('error'))
  }, [activityId, photoUrls])

  const activeSuggestions = suggestions.filter((s) => !dismissed.has(s.field))
  const isSaved = status === 'saved-local' || status === 'saved-strava'

  async function save(pushToStrava: boolean) {
    setStatus('saving')
    setStravaError(null)

    const updates = Object.fromEntries(
      activeSuggestions.map((s) => [s.field, s.rawValue])
    )

    const endpoint = pushToStrava
      ? `/api/activities/${activityId}/strava`
      : `/api/activities/${activityId}/patch`
    const method = pushToStrava ? 'PUT' : 'PATCH'

    const res = await fetch(endpoint, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    })
    const data = await res.json().catch(() => ({}))

    if (pushToStrava && data.stravaError) {
      setStravaError(data.stravaError)
    }

    const nextStatus = pushToStrava ? 'saved-strava' : 'saved-local'
    setStatus(nextStatus)

    // Persist result so the card survives a page reload
    try {
      const cached: CachedResult = { suggestions, notes, model, status: nextStatus }
      localStorage.setItem(CACHE_KEY(activityId), JSON.stringify(cached))
    } catch {
      // localStorage unavailable — non-fatal
    }
  }

  // ── Simple render states (no diff table) ──────────────────────────────────

  if (status === 'loading') {
    return (
      <div className="bg-white rounded-2xl border border-sky-200 shadow-sm p-5">
        <div className="flex items-center gap-3">
          <Spinner />
          <span className="text-sm text-gray-500">{loadingLabel(sportType)}</span>
        </div>
      </div>
    )
  }

  if (status === 'no-token') {
    return (
      <div className="bg-white rounded-2xl border border-amber-200 shadow-sm p-5 text-sm text-amber-700">
        AI analysis unavailable — add <code className="font-mono bg-amber-50 px-1 rounded">HF_TOKEN</code> to{' '}
        <code className="font-mono bg-amber-50 px-1 rounded">.env.local</code> to enable it.
        Get a free token at{' '}
        <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noreferrer" className="underline">
          huggingface.co/settings/tokens
        </a>.
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm p-5 text-sm text-red-500">
        Analysis failed. Check your HF_TOKEN and try again.
      </div>
    )
  }

  if (status === 'empty') {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 text-sm text-gray-400">
        Nothing could be extracted from the title, description, or photos.
        {notes && <p className="mt-1 italic">{notes}</p>}
      </div>
    )
  }

  // ── Main diff card — persists through saving and saved states ──────────────

  const borderColor = isSaved ? 'border-green-200' : 'border-sky-200'

  return (
    <div className={`bg-white rounded-2xl border ${borderColor} shadow-sm overflow-hidden`}>

      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-900">
            AI found {suggestions.length} field{suggestions.length !== 1 ? 's' : ''} to add
          </p>
          {model && (
            <p className="text-xs text-gray-400 mt-0.5">
              {photoUrls.length > 0 ? `Photo${photoUrls.length > 1 ? 's' : ''} + text` : 'Text only'}
              {' · '}
              {model.split('/').pop()}
            </p>
          )}
        </div>
        {notes && (
          <p className="text-xs text-gray-400 italic max-w-xs text-right hidden sm:block">{notes}</p>
        )}
      </div>

      {/* Diff table */}
      <div className="divide-y divide-gray-50">
        {suggestions.map((s) => {
          const isDismissed = dismissed.has(s.field)
          return (
            <div
              key={s.field}
              className={`flex items-center gap-4 px-6 py-3.5 transition-colors ${isDismissed ? 'opacity-40' : ''}`}
            >
              <span className="w-32 flex-shrink-0 text-sm text-gray-500">{s.label}</span>
              <span className="w-28 flex-shrink-0 text-sm text-gray-400 line-through tabular-nums">
                {s.currentValue}
              </span>
              <span className="text-gray-300 flex-shrink-0">→</span>
              <span className="flex-1 text-sm font-semibold text-orange-500 tabular-nums">
                {isDismissed ? <span className="line-through">{s.suggestedValue}</span> : s.suggestedValue}
              </span>
              <span className="hidden sm:inline text-xs text-gray-300 flex-shrink-0">{s.source}</span>
              {/* Only show dismiss/restore while not yet saved */}
              {!isSaved && (
                <button
                  onClick={() =>
                    setDismissed((prev) => {
                      const next = new Set(prev)
                      isDismissed ? next.delete(s.field) : next.add(s.field)
                      return next
                    })
                  }
                  className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded-full text-gray-300 hover:text-red-400 hover:bg-red-50 transition-colors text-xs leading-none"
                  title={isDismissed ? 'Restore' : 'Dismiss'}
                >
                  {isDismissed ? '+' : '×'}
                </button>
              )}
              {/* After saving, show a saved checkmark per row */}
              {isSaved && !isDismissed && (
                <svg className="flex-shrink-0 w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          )
        })}
      </div>

      {/* Actions footer */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center gap-3 flex-wrap">
        {/* Saved-local state: show confirmation + offer Strava upload */}
        {status === 'saved-local' && (
          <>
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Saved locally
            </span>
            <button
              onClick={() => save(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:border-orange-300 hover:text-orange-600 transition-colors"
            >
              Upload to Strava
            </button>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
            >
              Reload to see updated stats ↻
            </button>
            {stravaError && <StravaErrorNote message={stravaError} />}
          </>
        )}

        {/* Saved-strava state: show full confirmation */}
        {status === 'saved-strava' && (
          <>
            <span className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {stravaError ? 'Saved locally — see note below' : 'Saved & synced to Strava'}
            </span>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors ml-auto"
            >
              Reload to see updated stats ↻
            </button>
            {stravaError && <StravaErrorNote message={stravaError} />}
          </>
        )}

        {/* Default / saving state: show action buttons */}
        {(status === 'done' || status === 'saving') && (
          <>
            <button
              onClick={() => save(false)}
              disabled={status === 'saving' || activeSuggestions.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'saving' && <Spinner small />}
              Save locally
            </button>
            <button
              onClick={() => save(true)}
              disabled={status === 'saving' || activeSuggestions.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:border-orange-300 hover:text-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {status === 'saving' && <Spinner small />}
              Save & upload to Strava
            </button>
          </>
        )}
      </div>
    </div>
  )
}

function StravaErrorNote({ message }: { message: string }) {
  const isDeviceLock = message.includes('restricts distance')
  return (
    <p className={`w-full text-xs mt-1 leading-relaxed ${isDeviceLock ? 'text-amber-600' : 'text-red-500'}`}>
      {isDeviceLock ? '⚠️' : '✗'} {message}
    </p>
  )
}

function Spinner({ small }: { small?: boolean }) {
  const size = small ? 'w-3.5 h-3.5' : 'w-4 h-4'
  return (
    <svg className={`${size} animate-spin text-current`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
