import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { getSession } from '@/lib/session'

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const session = await getSession()
  if (session.userId) redirect('/dashboard')

  const { error } = await searchParams

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-10">
          <h1 className="text-5xl font-bold text-gray-900 mb-3">
            Op<span className="text-orange-500">Train</span>
          </h1>
          <p className="text-gray-500 text-lg">Your personal Strava training dashboard</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 mb-6">
          <ul className="space-y-3 mb-8 text-left text-sm text-gray-600">
            {[
              'Sync all your Strava activities incrementally',
              'Weekly distance trends and aggregate stats',
              'Detailed workout breakdowns with splits',
              'Data stored locally — no cloud required',
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <Check size={14} className="text-orange-500 mt-0.5 flex-shrink-0" strokeWidth={2.5} />
                {item}
              </li>
            ))}
          </ul>

          {error && (
            <div className="mb-5 text-sm text-red-600 bg-red-50 rounded-xl p-3">
              {error === 'access_denied'
                ? 'Strava access was denied. Please try again.'
                : 'Authentication failed. Please try again.'}
            </div>
          )}

          <Link
            href="/api/auth/strava"
            className="flex items-center justify-center gap-3 w-full bg-[#FC4C02] hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-xl transition-colors"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
              <path d="M15.387 17.944l-2.089-4.116h-3.065L15.387 24l5.15-10.172h-3.066m-7.008-5.599l2.836 5.598h4.172L10.463 0l-7 13.828h4.169" />
            </svg>
            Connect with Strava
          </Link>
        </div>

        <p className="text-xs text-gray-400">
          Requires a free Strava account · Activities stored on your local machine
        </p>
      </div>
    </main>
  )
}
