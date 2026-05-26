import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { readActivities, readSyncState } from '@/lib/storage'
import type { WeeklyTotal } from '@/types'

function getWeekStart(dateStr: string): string {
  const date = new Date(dateStr)
  const day = date.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(date)
  monday.setUTCDate(date.getUTCDate() + diff)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().split('T')[0]
}

export async function GET() {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const activities = readActivities(session.userId)
  const syncState = readSyncState(session.userId)

  const totalDistance = activities.reduce((s, a) => s + a.distance, 0)
  const totalTime = activities.reduce((s, a) => s + a.moving_time, 0)
  const totalElevation = activities.reduce((s, a) => s + a.total_elevation_gain, 0)

  // Build last 12 ISO weeks
  const now = new Date()
  const weekMap = new Map<string, WeeklyTotal>()

  for (let i = 11; i >= 0; i--) {
    const d = new Date(now)
    d.setUTCDate(d.getUTCDate() - i * 7)
    const ws = getWeekStart(d.toISOString())
    const label = new Date(ws).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })
    weekMap.set(ws, { weekStart: ws, weekLabel: label, distance: 0, activities: 0, time: 0 })
  }

  for (const a of activities) {
    const ws = getWeekStart(a.start_date)
    const week = weekMap.get(ws)
    if (week) {
      week.distance += a.distance
      week.activities += 1
      week.time += a.moving_time
    }
  }

  return NextResponse.json({
    totalActivities: activities.length,
    totalDistance,
    totalTime,
    totalElevation,
    weeklyTotals: Array.from(weekMap.values()),
    lastSyncedAt: syncState.last_synced_at,
  })
}
