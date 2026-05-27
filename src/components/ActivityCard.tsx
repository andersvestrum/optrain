import Link from 'next/link'
import type { NormalizedActivity } from '@/types'
import { formatDistance, formatTime, formatPace, formatShortDate, formatSportType, effectiveSportType } from '@/lib/format'
import SportIcon from './ActivityIcon'

// Sport types that are definitively indoors — shown with an "Indoor" badge
const INDOOR_SPORT_TYPES = new Set([
  'VirtualRun',
  'VirtualRide',
  'VirtualRow',
  'WeightTraining',
  'Crossfit',
  'Workout',
  'Elliptical',
  'StairStepper',
  'HighIntensityIntervalTraining',
  'Yoga',
  'Pilates',
  'Gymnastics',
  'JumpRope',
  'Boxing',
  'MartialArts',
  'Wrestling',
])

export default function ActivityCard({ activity }: { activity: NormalizedActivity }) {
  const sportType = effectiveSportType(activity.sport_type, activity.distance)
  const isRun = ['Run', 'TrailRun', 'VirtualRun'].includes(sportType)
  const isIndoor = INDOOR_SPORT_TYPES.has(sportType)

  return (
    <Link
      href={`/activities/${activity.id}`}
      className="flex items-center gap-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-orange-200 transition-all p-4 group"
    >
      {/* Icon — blue tint for indoor, gray for outdoor */}
      <span
        className={`flex-shrink-0 transition-colors ${
          isIndoor
            ? 'text-sky-400 group-hover:text-sky-500'
            : 'text-gray-400 group-hover:text-orange-500'
        }`}
      >
        <SportIcon type={sportType} size={20} />
      </span>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
          {activity.name}
        </p>
        <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
          {formatSportType(sportType)}
          {isIndoor && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-sky-50 text-sky-500 border border-sky-100 font-medium leading-none">
              Indoor
            </span>
          )}
          <span>·</span>
          <span>{formatShortDate(activity.start_date_local ?? activity.start_date)}</span>
        </p>
      </div>

      <div className="flex items-center gap-5 flex-shrink-0 text-sm">
        <div className="text-right">
          <p className="font-semibold text-gray-900 tabular-nums">
            {formatDistance(activity.distance)}
          </p>
          <p className="text-xs text-gray-400">Distance</p>
        </div>
        <div className="hidden sm:block text-right">
          <p className="font-semibold text-gray-900 tabular-nums">
            {formatTime(activity.moving_time)}
          </p>
          <p className="text-xs text-gray-400">Time</p>
        </div>
        {isRun && activity.distance > 0 && (
          <div className="hidden sm:block text-right">
            <p className="font-semibold text-gray-900 tabular-nums">
              {formatPace(activity.moving_time, activity.distance)}
            </p>
            <p className="text-xs text-gray-400">Pace</p>
          </div>
        )}
        {activity.average_heartrate != null && (
          <div className="hidden md:block text-right">
            <p className="font-semibold text-gray-900 tabular-nums">
              {Math.round(activity.average_heartrate)} bpm
            </p>
            <p className="text-xs text-gray-400">Avg HR</p>
          </div>
        )}
      </div>

      <svg
        className="w-4 h-4 text-gray-300 flex-shrink-0 group-hover:text-orange-400 transition-colors"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </Link>
  )
}
