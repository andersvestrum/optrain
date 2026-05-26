'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function SyncButton() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const router = useRouter()

  const handleSync = async () => {
    setStatus('loading')
    setMessage('')
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Sync failed')

      const n = data.added as number
      setStatus('done')
      setMessage(`+${n} ${n === 1 ? 'activity' : 'activities'}`)
      router.refresh()
      setTimeout(() => setStatus('idle'), 4000)
    } catch (err) {
      setStatus('error')
      setMessage(err instanceof Error ? err.message : 'Sync failed')
      setTimeout(() => setStatus('idle'), 5000)
    }
  }

  return (
    <div className="flex items-center gap-3 flex-shrink-0">
      {message && (
        <span
          className={`text-sm font-medium ${
            status === 'error' ? 'text-red-500' : 'text-green-600'
          }`}
        >
          {status === 'done' ? `✓ Synced ${message}` : message}
        </span>
      )}
      <button
        onClick={handleSync}
        disabled={status === 'loading'}
        className="inline-flex items-center gap-2 bg-orange-500 hover:bg-orange-600 disabled:opacity-60 disabled:cursor-not-allowed text-white font-medium text-sm py-2 px-4 rounded-lg transition-colors select-none"
      >
        {status === 'loading' ? (
          <>
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            Syncing…
          </>
        ) : (
          'Sync Now'
        )}
      </button>
    </div>
  )
}
