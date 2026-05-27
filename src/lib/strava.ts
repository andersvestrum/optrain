import { getSession } from './session'
import { readProfile, updateProfile } from './storage'
import type { NormalizedActivity, SplitMetric, Lap, BestEffort, ActivityStreams } from '@/types'

const STRAVA_API = 'https://www.strava.com/api/v3'

export async function getValidAccessToken(): Promise<{ token: string; userId: string }> {
  const session = await getSession()

  if (!session.userId || !session.accessToken) {
    throw new Error('Not authenticated')
  }

  const { userId } = session
  const now = Math.floor(Date.now() / 1000)

  // Return existing token if still valid (60s buffer)
  if (session.tokenExpiry && session.tokenExpiry > now + 60) {
    return { token: session.accessToken, userId }
  }

  const profile = readProfile(userId)
  if (!profile?.refreshToken) throw new Error('No refresh token available')

  const res = await fetch('https://www.strava.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: profile.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`)

  const data = await res.json()

  session.accessToken = data.access_token
  session.tokenExpiry = data.expires_at
  await session.save()

  updateProfile(userId, { refreshToken: data.refresh_token })

  return { token: data.access_token, userId }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizeActivity(raw: Record<string, any>): NormalizedActivity {
  return {
    id: raw.id,
    name: raw.name,
    type: raw.type,
    sport_type: raw.sport_type || raw.type,
    start_date: raw.start_date,
    start_date_local: raw.start_date_local,
    distance: raw.distance ?? 0,
    moving_time: raw.moving_time ?? 0,
    elapsed_time: raw.elapsed_time ?? 0,
    total_elevation_gain: raw.total_elevation_gain ?? 0,
    average_speed: raw.average_speed ?? 0,
    max_speed: raw.max_speed ?? 0,
    average_heartrate: raw.average_heartrate,
    max_heartrate: raw.max_heartrate,
    average_cadence: raw.average_cadence,
    average_watts: raw.average_watts,
    map_polyline: raw.map?.summary_polyline || undefined,
    splits_metric: raw.splits_metric as SplitMetric[] | undefined,
  }
}

async function fetchPage(
  token: string,
  page: number,
  after?: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<Record<string, any>[]> {
  const params = new URLSearchParams({ per_page: '200', page: String(page) })
  if (after !== undefined) params.set('after', String(after))

  const res = await fetch(`${STRAVA_API}/athlete/activities?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) throw new Error(`Strava API error: ${res.status}`)
  return res.json()
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchActivityDetail(token: string, id: number): Promise<Record<string, any>> {
  const res = await fetch(`${STRAVA_API}/activities/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) throw new Error(`Strava detail error: ${res.status}`)
  return res.json()
}

async function fetchStreams(token: string, id: number): Promise<ActivityStreams> {
  const keys = 'time,distance,heartrate,cadence,watts,velocity_smooth,altitude,latlng'
  const res = await fetch(`${STRAVA_API}/activities/${id}/streams?keys=${keys}&key_by_type=true`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!res.ok) return {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw: Record<string, { data: any[] }> = await res.json()

  // Downsample to ≤500 points to keep storage size reasonable
  const MAX = 500
  function ds<T>(arr: T[] | undefined): T[] | undefined {
    if (!arr || arr.length === 0) return undefined
    if (arr.length <= MAX) return arr
    const step = Math.ceil(arr.length / MAX)
    return arr.filter((_, i) => i % step === 0)
  }

  return {
    time: ds(raw.time?.data),
    distance: ds(raw.distance?.data),
    heartrate: ds(raw.heartrate?.data),
    cadence: ds(raw.cadence?.data),
    watts: ds(raw.watts?.data),
    velocity_smooth: ds(raw.velocity_smooth?.data),
    altitude: ds(raw.altitude?.data),
    latlng: ds(raw.latlng?.data),
  }
}

export async function enrichActivity(
  token: string,
  activity: NormalizedActivity
): Promise<NormalizedActivity> {
  const [detail, streams] = await Promise.all([
    fetchActivityDetail(token, activity.id),
    fetchStreams(token, activity.id),
  ])

  return {
    ...activity,
    description: (detail.description as string) || undefined,
    splits_metric: detail.splits_metric as SplitMetric[] | undefined,
    laps: (detail.laps as Lap[] | undefined)?.map((l) => ({
      id: l.id,
      name: l.name,
      elapsed_time: l.elapsed_time,
      moving_time: l.moving_time,
      distance: l.distance,
      total_elevation_gain: l.total_elevation_gain,
      average_speed: l.average_speed,
      max_speed: l.max_speed,
      average_heartrate: l.average_heartrate,
      max_heartrate: l.max_heartrate,
      average_cadence: l.average_cadence,
      average_watts: l.average_watts,
      lap_index: l.lap_index,
      split: l.split,
    })),
    best_efforts: (detail.best_efforts as BestEffort[] | undefined)?.map((b) => ({
      name: b.name,
      elapsed_time: b.elapsed_time,
      moving_time: b.moving_time,
      distance: b.distance,
      start_date: b.start_date,
      pr_rank: b.pr_rank,
    })),
    streams: Object.keys(streams).length > 0 ? streams : undefined,
    enriched: true,
  }
}

export async function fetchAllNewActivities(
  token: string,
  after?: number
): Promise<NormalizedActivity[]> {
  const results: NormalizedActivity[] = []
  let page = 1

  while (true) {
    const raw = await fetchPage(token, page, after)
    if (raw.length === 0) break
    results.push(...raw.map(normalizeActivity))
    if (raw.length < 200) break
    page++
  }

  return results
}
