import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { updateActivity } from '@/lib/storage'
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

  updateActivity(session.userId, Number(id), safe)
  return NextResponse.json({ ok: true })
}
