import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/session'
import { readActivities, readProfile, updateActivity } from '@/lib/storage'
import { getValidAccessToken, enrichActivity } from '@/lib/strava'
import Navbar from '@/components/Navbar'
import BestEfforts from '@/components/BestEfforts'
import SportIcon from '@/components/ActivityIcon'
import StreamsChartClient from '@/components/StreamsChartClient'
import RouteMapClient from '@/components/RouteMapClient'
import ActivityPhotos from '@/components/ActivityPhotos'
import {
  formatDistance,
  formatTime,
  formatPace,
  formatSpeed,
  formatElevation,
  formatDate,
  formatSportType,
  effectiveSportType,
} from '@/lib/format'
import type { PublicProfile } from '@/types'

export default async function ActivityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const session = await getSession()
  if (!session.userId) redirect('/')

  const { id } = await params
  const activities = readActivities(session.userId)
  let activity = activities.find((a) => String(a.id) === id)
  if (!activity) notFound()

  // Auto-enrich on first visit: fetch full detail + streams from Strava
  if (!activity.enriched) {
    try {
      const { token } = await getValidAccessToken()
      const enriched = await enrichActivity(token, activity)
      updateActivity(session.userId, activity.id, enriched)
      activity = enriched
    } catch {
      // Silently fall through — show summary data we already have
    }
  }

  const profile = readProfile(session.userId)
  const publicProfile: PublicProfile | null = profile
    ? {
        id: profile.id,
        firstname: profile.firstname,
        lastname: profile.lastname,
        profile_medium: profile.profile_medium,
      }
    : null

  const sportType = effectiveSportType(activity.sport_type, activity.distance)
  const isRun = ['Run', 'TrailRun', 'VirtualRun'].includes(sportType)

  const INDOOR_SPORT_TYPES = new Set([
    'VirtualRun', 'VirtualRide', 'VirtualRow',
    'WeightTraining', 'Crossfit', 'Workout', 'Elliptical', 'StairStepper',
    'HighIntensityIntervalTraining', 'Yoga', 'Pilates', 'Gymnastics', 'JumpRope',
    'Boxing', 'MartialArts', 'Wrestling',
  ])
  const isIndoor = INDOOR_SPORT_TYPES.has(sportType)

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar profile={publicProfile} />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
        <Link
          href="/activities"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back to Activities
        </Link>

        {/* Header */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <span className={`mt-1 ${isIndoor ? 'text-sky-400' : 'text-gray-400'}`}>
              <SportIcon type={sportType} size={28} />
            </span>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{activity.name}</h1>
              <p className="text-gray-500 mt-1 text-sm flex items-center gap-1.5 flex-wrap">
                <span>{formatSportType(sportType)}</span>
                {isIndoor && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-sky-50 text-sky-500 border border-sky-100 text-xs font-medium leading-none">
                    Indoor
                  </span>
                )}
                <span>·</span>
                <span>{formatDate(activity.start_date_local ?? activity.start_date)}</span>
              </p>
              {activity.description && (
                <p className="text-gray-600 text-sm mt-2 whitespace-pre-line">
                  {activity.description}
                </p>
              )}
            </div>
            {!activity.enriched && (
              <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-3 py-1">
                Summary only
              </span>
            )}
          </div>
        </div>

        {/* Route map */}
        {(activity.streams?.latlng || activity.map_polyline) && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <RouteMapClient
              latlng={activity.streams?.latlng}
              polyline={activity.map_polyline}
            />
          </div>
        )}

        {/* Key stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <StatBox label="Distance" value={formatDistance(activity.distance)} />
          <StatBox label="Moving Time" value={formatTime(activity.moving_time)} />
          <StatBox
            label={isRun ? 'Avg Pace' : 'Avg Speed'}
            value={
              isRun
                ? formatPace(activity.moving_time, activity.distance)
                : formatSpeed(activity.average_speed)
            }
          />
          <StatBox label="Elevation Gain" value={formatElevation(activity.total_elevation_gain)} />
          {activity.average_heartrate != null && (
            <StatBox label="Avg Heart Rate" value={`${Math.round(activity.average_heartrate)} bpm`} />
          )}
          {activity.max_heartrate != null && (
            <StatBox label="Max Heart Rate" value={`${Math.round(activity.max_heartrate)} bpm`} />
          )}
          {activity.average_cadence != null && (
            <StatBox label="Avg Cadence" value={`${Math.round(activity.average_cadence)} rpm`} />
          )}
          {activity.average_watts != null && (
            <StatBox label="Avg Power" value={`${Math.round(activity.average_watts)} W`} />
          )}
          <StatBox label="Elapsed Time" value={formatTime(activity.elapsed_time)} />
        </div>

        {/* Best Efforts / PRs */}
        {activity.best_efforts && activity.best_efforts.length > 0 && (
          <BestEfforts efforts={activity.best_efforts} />
        )}

        {/* Photos */}
        <ActivityPhotos activityId={activity.id} />

        {/* Streams charts */}
        {activity.streams && <StreamsChartClient streams={activity.streams} activityType={activity.type} />}

        {/* Splits */}
        {activity.splits_metric && activity.splits_metric.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">Splits (per km)</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="pb-3 font-medium pr-4">km</th>
                    <th className="pb-3 font-medium pr-4">Distance</th>
                    <th className="pb-3 font-medium pr-4">Time</th>
                    <th className="pb-3 font-medium pr-4">Pace</th>
                    <th className="pb-3 font-medium pr-4">Elev</th>
                    {activity.splits_metric[0]?.average_heartrate != null && (
                      <th className="pb-3 font-medium">Avg HR</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activity.splits_metric.map((split) => (
                    <tr key={split.split} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 font-semibold text-gray-700 pr-4">{split.split}</td>
                      <td className="py-2.5 text-gray-600 pr-4 tabular-nums">
                        {formatDistance(split.distance)}
                      </td>
                      <td className="py-2.5 text-gray-600 pr-4 tabular-nums">
                        {formatTime(split.moving_time)}
                      </td>
                      <td className="py-2.5 text-gray-600 pr-4 tabular-nums font-medium">
                        {formatPace(split.moving_time, split.distance)}
                      </td>
                      <td className="py-2.5 text-gray-600 pr-4 tabular-nums">
                        {split.elevation_difference > 0 ? '+' : ''}
                        {Math.round(split.elevation_difference)} m
                      </td>
                      {split.average_heartrate != null && (
                        <td className="py-2.5 text-gray-600 tabular-nums">
                          {Math.round(split.average_heartrate)} bpm
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Laps */}
        {activity.laps && activity.laps.length > 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-900 mb-4">
              Laps
              <span className="ml-2 text-xs font-normal text-gray-400">
                ({activity.laps.length} laps)
              </span>
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-400 border-b border-gray-100">
                    <th className="pb-3 font-medium pr-4">Lap</th>
                    <th className="pb-3 font-medium pr-4">Distance</th>
                    <th className="pb-3 font-medium pr-4">Time</th>
                    <th className="pb-3 font-medium pr-4">{isRun ? 'Pace' : 'Speed'}</th>
                    <th className="pb-3 font-medium pr-4">Elev</th>
                    {activity.laps[0]?.average_heartrate != null && (
                      <th className="pb-3 font-medium pr-4">Avg HR</th>
                    )}
                    {activity.laps[0]?.average_watts != null && (
                      <th className="pb-3 font-medium">Avg W</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {activity.laps.map((lap) => (
                    <tr key={lap.lap_index} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2.5 font-semibold text-gray-700 pr-4">{lap.lap_index}</td>
                      <td className="py-2.5 text-gray-600 pr-4 tabular-nums">
                        {formatDistance(lap.distance)}
                      </td>
                      <td className="py-2.5 text-gray-600 pr-4 tabular-nums">
                        {formatTime(lap.moving_time)}
                      </td>
                      <td className="py-2.5 text-gray-600 pr-4 tabular-nums font-medium">
                        {isRun
                          ? formatPace(lap.moving_time, lap.distance)
                          : formatSpeed(lap.average_speed)}
                      </td>
                      <td className="py-2.5 text-gray-600 pr-4 tabular-nums">
                        +{formatElevation(lap.total_elevation_gain)}
                      </td>
                      {lap.average_heartrate != null && (
                        <td className="py-2.5 text-gray-600 pr-4 tabular-nums">
                          {Math.round(lap.average_heartrate)} bpm
                        </td>
                      )}
                      {lap.average_watts != null && (
                        <td className="py-2.5 text-gray-600 tabular-nums">
                          {Math.round(lap.average_watts)} W
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900 tabular-nums">{value}</p>
    </div>
  )
}
