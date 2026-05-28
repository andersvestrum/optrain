import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { readActivities, updateActivity } from '@/lib/storage'
import type { NormalizedActivity } from '@/types'

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

  // Derive average_speed when distance is updated but speed is not explicitly provided
  if (safe.distance != null && safe.average_speed == null) {
    const activities = readActivities(session.userId)
    const activity = activities.find((a) => String(a.id) === id)
    const movingTime = safe.moving_time ?? activity?.moving_time ?? 0
    if (movingTime > 0 && safe.distance > 0) {
      safe.average_speed = safe.distance / movingTime
    }
  }

  updateActivity(session.userId, Number(id), safe)
  return NextResponse.json({ ok: true })
}
