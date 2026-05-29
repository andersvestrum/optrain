import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { readActivities, updateActivity } from '@/lib/storage'
import { getValidAccessToken } from '@/lib/strava'
import type { NormalizedActivity } from '@/types'

const STRAVA_API = 'https://www.strava.com/api/v3'

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const activities = readActivities(session.userId)
  const activity = activities.find((a) => String(a.id) === id)
  if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updates: Partial<NormalizedActivity> = await req.json()

  // Save locally first — Strava push is best-effort
  const { id: _id, streams, laps, best_efforts, splits_metric, ...safe } = updates

  if (safe.distance != null && safe.distance > 0) {
    // Always recompute average_speed from the new distance + moving_time
    const movingTime = safe.moving_time ?? activity.moving_time
    if (movingTime > 0) {
      safe.average_speed = safe.distance / movingTime
    }

    // If the activity has no GPS data, promote sport_type to its indoor variant.
    // GPS absence — not distance — is the indoor signal.
    const INDOOR_PROMOTE: Record<string, string> = {
      Ride: 'VirtualRide', Run: 'VirtualRun', Rowing: 'VirtualRow',
    }
    const hasGPS = !!(activity.map_polyline || activity.streams?.latlng?.length)
    if (!hasGPS && INDOOR_PROMOTE[activity.sport_type]) {
      safe.sport_type = safe.sport_type ?? INDOOR_PROMOTE[activity.sport_type]
    }
  }

  updateActivity(session.userId, Number(id), safe)

  // Push the Strava-updatable subset
  const { token } = await getValidAccessToken()

  const stravaBody: Record<string, unknown> = {}
  if (updates.name != null)          stravaBody.name         = updates.name
  if (updates.description != null)   stravaBody.description  = updates.description
  if (updates.moving_time != null)   stravaBody.moving_time  = updates.moving_time
  if (updates.elapsed_time != null)  stravaBody.elapsed_time = updates.elapsed_time
  // Always push sport_type when we have it — updating to VirtualRide/VirtualRow
  // unlocks the distance field on Strava for device-synced indoor activities.
  if (safe.sport_type != null)       stravaBody.sport_type   = safe.sport_type
  if (updates.distance != null)      stravaBody.distance     = updates.distance

  let stravaError: string | null = null
  let distanceIgnored = false

  if (Object.keys(stravaBody).length > 0) {
    const res = await fetch(`${STRAVA_API}/activities/${id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(stravaBody),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '')
      stravaError = `Strava returned ${res.status}${text ? ': ' + text.slice(0, 120) : ''}`
    } else {
      // Strava may silently ignore the distance field for device-synced activities.
      // Detect this by comparing the returned distance with what we sent.
      const returned = await res.json().catch(() => ({}))
      if (
        stravaBody.distance != null &&
        returned.distance != null &&
        Math.abs(returned.distance - (stravaBody.distance as number)) > 1
      ) {
        distanceIgnored = true
        stravaError = `Distance not saved on Strava (it returned ${(returned.distance / 1000).toFixed(2)} km). Strava restricts distance edits for activities synced from devices like Garmin. Your local data is correct — edit the distance directly on strava.com if needed.`
      }
    }
  }

  return NextResponse.json({
    ok: true,
    stravaUpdated: stravaError === null,
    distanceIgnored,
    stravaError,
  })
}
