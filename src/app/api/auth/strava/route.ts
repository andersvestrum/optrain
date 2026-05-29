import { NextResponse } from 'next/server'

export async function GET() {
  const clientId = process.env.STRAVA_CLIENT_ID
  const redirectUri =
    process.env.STRAVA_REDIRECT_URI ?? 'http://localhost:3000/api/auth/callback'

  const params = new URLSearchParams({
    client_id: clientId!,
    redirect_uri: redirectUri,
    response_type: 'code',
    approval_prompt: 'auto',
    scope: 'activity:read_all,activity:write,read',
  })

  return NextResponse.redirect(`https://www.strava.com/oauth/authorize?${params}`)
}
