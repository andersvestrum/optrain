import { NextRequest, NextResponse } from 'next/server'
import { getValidAccessToken } from '@/lib/strava'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { token } = await getValidAccessToken()
    const { id } = await params

    const res = await fetch(
      `https://www.strava.com/api/v3/activities/${id}/photos?size=2048&photo_sources=true`,
      { headers: { Authorization: `Bearer ${token}` } }
    )

    if (!res.ok) return NextResponse.json({ photos: [] })

    const photos = await res.json()
    return NextResponse.json({ photos: Array.isArray(photos) ? photos : [] })
  } catch {
    return NextResponse.json({ photos: [] })
  }
}
