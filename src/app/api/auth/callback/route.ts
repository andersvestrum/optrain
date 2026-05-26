import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { writeProfile } from '@/lib/storage'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error || !code) {
    return NextResponse.redirect(new URL('/?error=access_denied', request.url))
  }

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!res.ok) {
    return NextResponse.redirect(new URL('/?error=token_exchange_failed', request.url))
  }

  const data = await res.json()
  const { athlete, access_token, refresh_token, expires_at } = data

  const session = await getSession()
  session.userId = String(athlete.id)
  session.accessToken = access_token
  session.tokenExpiry = expires_at
  await session.save()

  writeProfile(String(athlete.id), {
    id: String(athlete.id),
    firstname: athlete.firstname ?? '',
    lastname: athlete.lastname ?? '',
    profile: athlete.profile ?? '',
    profile_medium: athlete.profile_medium ?? '',
    city: athlete.city ?? '',
    state: athlete.state ?? '',
    country: athlete.country ?? '',
    refreshToken: refresh_token,
  })

  return NextResponse.redirect(new URL('/dashboard', request.url))
}
