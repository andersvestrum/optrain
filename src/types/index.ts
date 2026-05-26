export interface SessionData {
  userId?: string
  accessToken?: string
  tokenExpiry?: number
}

export interface UserProfile {
  id: string
  firstname: string
  lastname: string
  profile: string
  profile_medium: string
  city: string
  state: string
  country: string
  refreshToken: string
}

export interface PublicProfile {
  id: string
  firstname: string
  lastname: string
  profile_medium: string
}

export interface NormalizedActivity {
  id: number
  name: string
  type: string
  sport_type: string
  start_date: string
  distance: number
  moving_time: number
  elapsed_time: number
  total_elevation_gain: number
  average_speed: number
  max_speed: number
  average_heartrate?: number
  max_heartrate?: number
  average_cadence?: number
  average_watts?: number
  map_polyline?: string
  description?: string
  // Populated on first detail-page view
  enriched?: boolean
  splits_metric?: SplitMetric[]
  laps?: Lap[]
  best_efforts?: BestEffort[]
  streams?: ActivityStreams
}

export interface SplitMetric {
  distance: number
  elapsed_time: number
  elevation_difference: number
  moving_time: number
  split: number
  average_speed: number
  average_heartrate?: number
  pace_zone?: number
}

export interface Lap {
  id: number
  name: string
  elapsed_time: number
  moving_time: number
  distance: number
  total_elevation_gain: number
  average_speed: number
  max_speed: number
  average_heartrate?: number
  max_heartrate?: number
  average_cadence?: number
  average_watts?: number
  lap_index: number
  split: number
}

export interface BestEffort {
  name: string
  elapsed_time: number
  moving_time: number
  distance: number
  start_date: string
  pr_rank?: number | null  // 1=gold PR, 2=silver, 3=bronze, null=not a PR
}

// Downsampled to ≤500 points before storage
export interface ActivityStreams {
  time?: number[]
  distance?: number[]       // meters cumulative
  heartrate?: number[]      // bpm
  cadence?: number[]        // rpm
  watts?: number[]
  velocity_smooth?: number[] // m/s
  altitude?: number[]       // meters
  latlng?: [number, number][]
}

export interface SyncState {
  last_synced_at: number | null
}

export interface WeeklyTotal {
  weekStart: string
  weekLabel: string
  distance: number
  activities: number
  time: number
}

export interface Summary {
  totalActivities: number
  totalDistance: number
  totalTime: number
  totalElevation: number
  weeklyTotals: WeeklyTotal[]
  lastSyncedAt: number | null
}
