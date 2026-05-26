import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { readActivities } from '@/lib/storage'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session.userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const activity = readActivities(session.userId).find((a) => String(a.id) === id)

  if (!activity) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(activity)
}
