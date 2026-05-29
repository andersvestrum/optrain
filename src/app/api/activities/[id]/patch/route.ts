import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { readActivities, updateActivity } from '@/lib/storage'
import type { NormalizedActivity } from '@/types'

// Sport types that should be stored as their indoor (Virtual*) variant
// when the activity has no GPS data.
const INDOOR_PROMOTE: Record<string, string> = {
  Ride:   'VirtualRide',
  Run:    'VirtualRun',
  Rowing: 'VirtualRow',
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const updates: Partial<NormalizedActivity> = await req.json()

  // Never allow overwriting identity or enrichment-pipeline fields via this route
  const { id: _id, streams, laps, best_efforts, splits_metric, ...safe } = updates

  if (safe.distance != null && safe.distance > 0) {
    const activities = readActivities(session.userId)
    const activity = activities.find((a) => String(a.id) === id)

    if (activity) {
      // Always recompute average_speed from the new distance + moving_time
      const movingTime = safe.moving_time ?? activity.moving_time
      if (movingTime > 0) {
        safe.average_speed = safe.distance / movingTime
      }

      // If the activity has no GPS data and the sport type has an indoor variant,
      // promote sport_type (e.g. Ride → VirtualRide) so it is stored correctly.
      // GPS absence — not distance — is the indoor signal; distance changes after
      // AI analysis fills it in.
      const hasGPS = !!(activity.map_polyline || activity.streams?.latlng?.length)
      if (!hasGPS && INDOOR_PROMOTE[activity.sport_type]) {
        safe.sport_type = safe.sport_type ?? INDOOR_PROMOTE[activity.sport_type]
      }
    }
  }

  updateActivity(session.userId, Number(id), safe)
  return NextResponse.json({ ok: true })
}
