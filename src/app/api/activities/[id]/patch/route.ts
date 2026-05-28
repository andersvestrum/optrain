import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { readActivities, updateActivity } from '@/lib/storage'
import type { NormalizedActivity } from '@/types'

// Sport types that should be promoted to their indoor variant when a real
// distance is first set (i.e. the activity was a 0-distance indoor session).
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

      // Preserve the indoor type: if this was a 0-distance activity inferred
      // as indoor, promote sport_type so the Indoor badge persists after save
      if (activity.distance < 100 && INDOOR_PROMOTE[activity.sport_type]) {
        safe.sport_type = safe.sport_type ?? INDOOR_PROMOTE[activity.sport_type]
      }
    }
  }

  updateActivity(session.userId, Number(id), safe)
  return NextResponse.json({ ok: true })
}
