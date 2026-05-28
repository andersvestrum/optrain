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
  updateActivity(session.userId, Number(id), safe)

  // Push the Strava-updatable subset
  const { token } = await getValidAccessToken()

  const stravaBody: Record<string, unknown> = {}
  if (updates.distance != null)      stravaBody.distance     = updates.distance
  if (updates.moving_time != null)   stravaBody.moving_time  = updates.moving_time
  if (updates.elapsed_time != null)  stravaBody.elapsed_time = updates.elapsed_time
  if (updates.description != null)   stravaBody.description  = updates.description

  let stravaError: string | null = null

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
    }
  }

  return NextResponse.json({
    ok: true,
    stravaUpdated: stravaError === null,
    stravaError,
  })
}
