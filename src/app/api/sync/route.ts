import { NextResponse } from 'next/server'
import { getValidAccessToken, fetchAllNewActivities } from '@/lib/strava'
import { mergeActivities, readSyncState, writeSyncState } from '@/lib/storage'

export async function POST() {
  try {
    const { token, userId } = await getValidAccessToken()

    const syncState = readSyncState(userId)
    const after = syncState.last_synced_at ?? undefined

    const activities = await fetchAllNewActivities(token, after)
    const added = mergeActivities(userId, activities)

    const now = Math.floor(Date.now() / 1000)
    writeSyncState(userId, { last_synced_at: now })

    return NextResponse.json({ ok: true, synced: activities.length, added, lastSyncedAt: now })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    if (message === 'Not authenticated') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
