export function formatDistance(meters: number): string {
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

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

