import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { readActivities } from '@/lib/storage'

export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200)
  const offset = parseInt(searchParams.get('offset') ?? '0')
  const type = searchParams.get('type')

  let activities = readActivities(session.userId)

  if (type) {
    activities = activities.filter((a) => a.type === type || a.sport_type === type)
  }

  return NextResponse.json({
    activities: activities.slice(offset, offset + limit),
    total: activities.length,
    offset,
    limit,
  })
}
