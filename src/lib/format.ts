export function formatDistance(meters: number): string {
  if (!meters || meters < 1) return '—'
  const km = meters / 1000
  if (km >= 100) return `${km.toFixed(0)} km`
  if (km >= 10) return `${km.toFixed(1)} km`
  return `${km.toFixed(2)} km`
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function formatHours(seconds: number): string {
  const h = seconds / 3600
  if (h >= 100) return `${h.toFixed(0)}h`
  if (h >= 10) return `${h.toFixed(1)}h`
  return `${h.toFixed(2)}h`
}

export function formatPace(seconds: number, meters: number): string {
  if (meters === 0) return '–'
  const secPerKm = (seconds / meters) * 1000
  const min = Math.floor(secPerKm / 60)
  const sec = Math.round(secPerKm % 60)
  return `${min}:${String(sec).padStart(2, '0')} /km`
}

export function formatSpeed(mps: number): string {
  return `${(mps * 3.6).toFixed(1)} km/h`
}

export function formatElevation(meters: number): string {
  return `${Math.round(meters)} m`
}

const SPORT_TYPE_LABELS: Record<string, string> = {
  // Running
  Run: 'Run',
  TrailRun: 'Trail Run',
  VirtualRun: 'Run',

  // Walking
  Walk: 'Walk',
  Hike: 'Hike',

  // Cycling
  Ride: 'Ride',
  VirtualRide: 'Ride',
  MountainBikeRide: 'MTB',
  GravelRide: 'Gravel Ride',
  EBikeRide: 'E-Bike',
  Handcycle: 'Handcycle',
  Velomobile: 'Velomobile',

  // Swimming
  Swim: 'Swim',
  OpenWaterSwim: 'Open Water Swim',

  // Rowing & water
  Rowing: 'Row',
  VirtualRow: 'Row',
  Kayaking: 'Kayak',
  Canoeing: 'Canoe',
  StandUpPaddling: 'SUP',
  Surfing: 'Surf',
  Windsurf: 'Windsurf',
  Kitesurf: 'Kitesurf',
  Waterpolo: 'Water Polo',

  // Strength & gym
  WeightTraining: 'Weights',
  Crossfit: 'CrossFit',
  Workout: 'Workout',
  Elliptical: 'Elliptical',
  StairStepper: 'Stair Stepper',
  HighIntensityIntervalTraining: 'HIIT',

  // Mind & body
  Yoga: 'Yoga',
  Pilates: 'Pilates',
  Gymnastics: 'Gymnastics',
  JumpRope: 'Jump Rope',

  // Winter
  AlpineSki: 'Alpine Ski',
  BackcountrySki: 'Backcountry Ski',
  NordicSki: 'Nordic Ski',
  Snowboard: 'Snowboard',
  Snowshoe: 'Snowshoe',
  IceSkate: 'Ice Skate',
  WinterSports: 'Winter Sports',

  // Climbing
  RockClimbing: 'Rock Climb',
  Mountaineering: 'Mountaineering',

  // Ball sports
  Soccer: 'Soccer',
  Football: 'Football',
  Basketball: 'Basketball',
  Volleyball: 'Volleyball',
  Tennis: 'Tennis',
  TableTennis: 'Table Tennis',
  Squash: 'Squash',
  Badminton: 'Badminton',
  Pickleball: 'Pickleball',
  Golf: 'Golf',
  DiscGolf: 'Disc Golf',
  Cricket: 'Cricket',
  Rugby: 'Rugby',
  Bowling: 'Bowling',
  Baseball: 'Baseball',
  Softball: 'Softball',
  Handball: 'Handball',

  // Combat
  Boxing: 'Boxing',
  MartialArts: 'Martial Arts',
  Wrestling: 'Wrestling',

  // Other
  Motorbike: 'Motorbike',
  Skateboarding: 'Skateboard',
  Archery: 'Archery',
  Jetski: 'Jet Ski',
}

/** Converts raw Strava sport_type to a human-readable label. */
export function formatSportType(sportType: string): string {
  return SPORT_TYPE_LABELS[sportType] ?? sportType
}

/**
 * Sports that have both an outdoor and indoor variant.
 * When distance < 100 m we infer the indoor variant.
 */
const INDOOR_INFER: Record<string, string> = {
  Ride:   'VirtualRide',
  Run:    'VirtualRun',
  Rowing: 'VirtualRow',
}

/**
 * Returns the effective sport_type for display purposes.
 * Promotes e.g. "Ride" → "VirtualRide" when distance is ~0,
 * so zero-distance activities get the indoor icon and badge automatically.
 */
export function effectiveSportType(sportType: string, distance: number): string {
  if (distance < 100 && INDOOR_INFER[sportType]) {
    return INDOOR_INFER[sportType]
  }
  return sportType
}

/**
 * Extract HH:MM from an ISO datetime string as a 12-hour clock string.
 * Works correctly with Strava's start_date_local, where the time digits
 * represent the athlete's local time regardless of the Z suffix.
 * Falls back to empty string if the format is unexpected.
 */
function extractLocalTime(dateStr: string): string {
  const match = dateStr.match(/T(\d{2}:\d{2})/)
  if (!match) return ''
  return match[1]
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
  const time = extractLocalTime(dateStr)
  return time ? `${date} at ${time}` : date
}

export function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const time = extractLocalTime(dateStr)
  return time ? `${date} · ${time}` : date
}

