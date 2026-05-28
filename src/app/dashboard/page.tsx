import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { readActivities, readProfile, readSyncState } from '@/lib/storage'
import Navbar from '@/components/Navbar'
import StatCard from '@/components/StatCard'
import SyncButton from '@/components/SyncButton'
import ActivityCard from '@/components/ActivityCard'
import WeeklyChart from '@/components/WeeklyChart'
import DashboardFilter from '@/components/DashboardFilter'
import type { FilterOption } from '@/components/DashboardFilter'
import { formatDistance, formatHours, formatElevation, formatSportType } from '@/lib/format'
import type { NormalizedActivity, PublicProfile } from '@/types'

// ─── Filter group definitions ─────────────────────────────────────────────────

const FILTER_GROUPS: Record<string, { label: string; iconType: string; types: string[] }> = {
  run:  { label: 'Run',    iconType: 'Run',          types: ['Run', 'TrailRun', 'VirtualRun'] },
  ride: { label: 'Ride',   iconType: 'Ride',         types: ['Ride', 'VirtualRide', 'MountainBikeRide', 'GravelRide', 'EBikeRide', 'Handcycle', 'Velomobile'] },
  row:  { label: 'Row',    iconType: 'Rowing',       types: ['Rowing', 'VirtualRow'] },
  swim: { label: 'Swim',   iconType: 'Swim',         types: ['Swim', 'OpenWaterSwim'] },
  gym:  { label: 'Gym',    iconType: 'WeightTraining', types: ['WeightTraining', 'Crossfit', 'Workout', 'Elliptical', 'StairStepper', 'HighIntensityIntervalTraining', 'Yoga', 'Pilates', 'Gymnastics', 'JumpRope'] },
  walk: { label: 'Walk',   iconType: 'Walk',         types: ['Walk', 'Hike'] },
  ski:  { label: 'Ski',    iconType: 'AlpineSki',    types: ['AlpineSki', 'BackcountrySki', 'NordicSki', 'Snowboard', 'Snowshoe', 'IceSkate', 'WinterSports'] },
  water:{ label: 'Water',  iconType: 'Kayaking',     types: ['Kayaking', 'Canoeing', 'StandUpPaddling', 'Surfing', 'Windsurf', 'Kitesurf', 'Waterpolo'] },
}

// Groups where the chart should show session count instead of distance km
const SESSION_COUNT_GROUPS = new Set(['gym'])

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setUTCDate(date.getUTCDate() + diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

function buildChartData(
  activities: NormalizedActivity[],
  mode: 'distance' | 'sessions'
): Array<{ week: string; value: number }> {
  const now = new Date()
  const weekMap = new Map<string, { label: string; value: number }>()

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i * 7)
    const ws = getWeekStart(d.toISOString())
    const label = new Date(ws).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    weekMap.set(ws, { label, value: 0 })
  }

  for (const a of activities) {
    const ws = getWeekStart(a.start_date)
    const week = weekMap.get(ws)
    if (!week) continue
    week.value += mode === 'distance'
      ? Math.round((a.distance / 1000) * 10) / 10
      : 1
  }

  return Array.from(weekMap.values()).map((w) => ({ week: w.label, value: w.value }))
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>
}) {
  const session = await getSession()
  if (!session.userId) redirect('/')

  const allActivities = readActivities(session.userId)
  const profile = readProfile(session.userId)
  const syncState = readSyncState(session.userId)

  const { filter } = await searchParams
  const activeFilter = filter && FILTER_GROUPS[filter] ? filter : 'all'

  // Apply filter
  const filtered = activeFilter === 'all'
    ? allActivities
    : allActivities.filter((a) =>
        FILTER_GROUPS[activeFilter].types.includes(a.sport_type) ||
        FILTER_GROUPS[activeFilter].types.includes(a.type)
      )

  // Stats on filtered set
  const totalDistance  = filtered.reduce((s, a) => s + a.distance, 0)
  const totalTime      = filtered.reduce((s, a) => s + a.moving_time, 0)
  const totalElevation = filtered.reduce((s, a) => s + a.total_elevation_gain, 0)

  // Chart
  const chartMode: 'distance' | 'sessions' =
    activeFilter !== 'all' && SESSION_COUNT_GROUPS.has(activeFilter) ? 'sessions' : 'distance'
  const chartData = buildChartData(filtered, chartMode)

  const chartTitle = activeFilter === 'all'
    ? 'Weekly distance (km) — last 12 weeks'
    : chartMode === 'distance'
      ? `Weekly distance (km) · ${FILTER_GROUPS[activeFilter].label} · last 12 weeks`
      : `Weekly sessions · ${FILTER_GROUPS[activeFilter].label} · last 12 weeks`

  // Build filter chip options — only include groups that have ≥1 activity
  const groupCounts = Object.entries(FILTER_GROUPS).reduce<Record<string, number>>(
    (acc, [key, group]) => {
      acc[key] = allActivities.filter(
        (a) => group.types.includes(a.sport_type) || group.types.includes(a.type)
      ).length
      return acc
    },
    {}
  )

  const filterOptions: FilterOption[] = [
    { key: 'all', label: 'All', count: allActivities.length, iconType: '' },
    ...Object.entries(FILTER_GROUPS)
      .filter(([key]) => groupCounts[key] > 0)
      .map(([key, group]) => ({
        key,
        label: group.label,
        count: groupCounts[key],
        iconType: group.iconType,
      })),
  ]

  const lastSynced = syncState.last_synced_at
    ? new Date(syncState.last_synced_at * 1000).toLocaleString('en-GB', {
        day: 'numeric', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: false,
      })
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
        <div className="flex items-start justify-between mb-6 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {profile ? `Welcome back, ${profile.firstname}!` : 'Dashboard'}
            </h1>
            <p className="text-sm text-gray-500 mt-1">Last synced: {lastSynced}</p>
          </div>
          <SyncButton />
        </div>

        {/* Filter chips */}
        <div className="mb-6">
          <DashboardFilter options={filterOptions} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Activities" value={String(filtered.length)} />
          <StatCard label="Distance" value={formatDistance(totalDistance)} />
          <StatCard label="Time" value={formatHours(totalTime)} />
          <StatCard label="Elevation" value={formatElevation(totalElevation)} />
        </div>

        {/* Weekly Chart */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{chartTitle}</h2>
          <WeeklyChart data={chartData} mode={chartMode} />
        </div>

        {/* Recent Activities */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">
              Recent
              {activeFilter !== 'all' && (
                <span className="ml-1.5 text-orange-500">
                  {FILTER_GROUPS[activeFilter].label}
                </span>
              )}
            </h2>
            <a
              href="/activities"
              className="text-sm text-orange-500 hover:text-orange-600 font-medium"
            >
              View all →
            </a>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
              <p className="text-gray-500 text-sm">
                {allActivities.length === 0
                  ? 'No activities yet. Sync your Strava data to get started.'
                  : `No ${FILTER_GROUPS[activeFilter]?.label ?? ''} activities found.`}
              </p>
              {allActivities.length === 0 && (
                <div className="mt-6">
                  <SyncButton />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.slice(0, 5).map((activity) => (
                <ActivityCard key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
