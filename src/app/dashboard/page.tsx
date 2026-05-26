import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { readActivities, readProfile, readSyncState } from '@/lib/storage'
import Navbar from '@/components/Navbar'
import StatCard from '@/components/StatCard'
import SyncButton from '@/components/SyncButton'
import ActivityCard from '@/components/ActivityCard'
import WeeklyChart from '@/components/WeeklyChart'
import { formatDistance, formatHours, formatElevation } from '@/lib/format'
import type { PublicProfile } from '@/types'

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setUTCDate(date.getUTCDate() + diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

export default async function DashboardPage() {
  const session = await getSession()
  if (!session.userId) redirect('/')

  const activities = readActivities(session.userId)
  const profile = readProfile(session.userId)
  const syncState = readSyncState(session.userId)

  const totalDistance = activities.reduce((s, a) => s + a.distance, 0)
  const totalTime = activities.reduce((s, a) => s + a.moving_time, 0)
  const totalElevation = activities.reduce((s, a) => s + a.total_elevation_gain, 0)

  // Last 12 ISO weeks for the chart
  const now = new Date()
  const weekMap = new Map<string, { label: string; distance: number }>()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i * 7)
    const ws = getWeekStart(d.toISOString())
    const label = new Date(ws).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    weekMap.set(ws, { label, distance: 0 })
  }
  for (const a of activities) {
    const ws = getWeekStart(a.start_date)
    const week = weekMap.get(ws)
    if (week) week.distance += a.distance
  }
  const chartData = Array.from(weekMap.values()).map((w) => ({
    week: w.label,
    distance: Math.round((w.distance / 1000) * 10) / 10,
  }))

  const lastSynced = syncState.last_synced_at
    ? new Date(syncState.last_synced_at * 1000).toLocaleString()
    : 'Never'

  const publicProfile: PublicProfile | null = profile
    ? {
        id: profile.id,
        firstname: profile.firstname,
        lastname: profile.lastname,
        profile_medium: profile.profile_medium,
      }
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar profile={publicProfile} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {profile ? `Welcome back, ${profile.firstname}!` : 'Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Last synced: {lastSynced}</p>
          </div>
          <SyncButton />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Workouts" value={String(activities.length)} />
          <StatCard label="Distance" value={formatDistance(totalDistance)} />
          <StatCard label="Time" value={formatHours(totalTime)} />
          <StatCard label="Elevation" value={formatElevation(totalElevation)} />
        </div>

        {/* Weekly Chart */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4">
            Weekly Distance (km) — last 12 weeks
          </h2>
          <WeeklyChart data={chartData} />
        </div>

        {/* Recent Activities */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Recent Activities</h2>
            <a
              href="/activities"
              className="text-sm text-orange-500 hover:text-orange-600 font-medium"
            >
              View all →
            </a>
          </div>

          {activities.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
              <p className="text-gray-500 mb-6 text-sm">
                No activities yet. Connect and sync your Strava data to get started.
              </p>
              <SyncButton />
            </div>
          ) : (
            <div className="space-y-3">
              {activities.slice(0, 5).map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
