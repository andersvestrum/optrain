import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { readActivities } from '@/lib/storage'
import { HfInference } from '@huggingface/inference'
import { formatTime, formatDistance } from '@/lib/format'
import type { NormalizedActivity } from '@/types'

// ─── Which fields are genuinely missing from the activity ─────────────────────

interface MissingFields {
  distance: boolean
  moving_time: boolean
  elapsed_time: boolean
  average_heartrate: boolean
  max_heartrate: boolean
  average_cadence: boolean
  average_watts: boolean
}

function getMissingFields(activity: NormalizedActivity): MissingFields {
  return {
    distance:          (activity.distance ?? 0) < 100,
    moving_time:       (activity.moving_time ?? 0) === 0,
    elapsed_time:      (activity.elapsed_time ?? 0) === 0,
    average_heartrate: activity.average_heartrate == null,
    max_heartrate:     activity.max_heartrate == null,
    average_cadence:   activity.average_cadence == null,
    average_watts:     activity.average_watts == null,
  }
}

function hasMissingFields(missing: MissingFields): boolean {
  return Object.values(missing).some(Boolean)
}

// ─── Activity-type-specific context ──────────────────────────────────────────

const TYPE_CONTEXT: Record<string, string> = {
  Rowing: `Indoor rowing session (erg/ergometer, e.g. Concept2). Displays show: distance in metres, time as h:mm:ss, split as mm:ss /500m, stroke rate (spm), power (W).`,
  VirtualRow: `Indoor rowing erg session. Same display layout as Concept2 — distance in metres, time, split /500m, stroke rate, power.`,
  Ride: `Indoor cycling session (trainer, spin bike, Zwift, Wahoo, etc.). Displays show: distance in km (convert to metres), power (W), cadence (rpm), speed (km/h), heart rate (bpm).

Keiser M-series bikes (very common in gyms): the field labelled TRIP is the distance in km — convert to metres. CRITICAL: the Keiser display timer resets to 0:00 after every 60 minutes. The displayed time is UNRELIABLE — do not use it for any calculation or plausibility reasoning. For any speed or duration reasoning, use ONLY the moving_time from the "Already recorded by Strava" section above.`,

  VirtualRide: `Indoor cycling session. Same as above — distance in km (convert to metres), power (W), cadence (rpm), speed (km/h).

Keiser M-series bikes: TRIP = distance in km (convert to metres). The display timer resets every 60 minutes and is UNRELIABLE — never use it for any calculation. Use ONLY the moving_time from the "Already recorded by Strava" section for any reasoning about session duration or speed.`,
  Run: `Treadmill run. Displays show: distance in km or miles (1 mile = 1609.34 m), pace (min/km or min/mile → convert to sec/km), speed (km/h or mph), incline (%), heart rate (bpm).`,
  VirtualRun: `Treadmill run. Same as above — distance in km or miles, pace, speed, heart rate.`,
  Swim: `Pool swim. Look for: pool length (25 m or 50 m), lap count (distance = laps × pool length), or total distance in metres/yards (1 yd = 0.9144 m).`,
  WeightTraining: `Gym/weight training session. Look for workout duration (minutes or seconds) and any distance equivalent. Parse the title and description for clues (e.g. "45 min", "5 rounds").`,
}

// ─── Dynamic prompt builder ───────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a fitness data extraction assistant. Extract structured workout data from activity titles, descriptions, and photos of equipment displays. Return ONLY valid JSON matching the schema.

Make your best effort — if you can make a reasonable estimate from partial information, include it. A value inferred from the title (e.g. "5k row" → 5000 m) is valid. Explain any uncertainty in the "notes" field. Only omit a field if you have absolutely no basis for any estimate.`

function buildPrompt(
  activity: NormalizedActivity,
  missing: MissingFields,
  hasPhotos: boolean,
): string {
  const context =
    TYPE_CONTEXT[activity.sport_type] ??
    TYPE_CONTEXT[activity.type] ??
    `${activity.sport_type} session. Extract any visible performance metrics.`

  // ── What Strava already has — shown as ground truth ──────────────────────
  const knownLines: string[] = []
  if (!missing.moving_time)
    knownLines.push(`Moving time: ${formatTime(activity.moving_time)} (recorded by device — authoritative, do not suggest changes)`)
  if (!missing.elapsed_time)
    knownLines.push(`Elapsed time: ${formatTime(activity.elapsed_time)} (recorded by device — authoritative, do not suggest changes)`)
  if (!missing.distance)
    knownLines.push(`Distance: ${formatDistance(activity.distance)} (already recorded — do not suggest changes)`)
  if (!missing.average_heartrate)
    knownLines.push(`Avg heart rate: ${Math.round(activity.average_heartrate!)} bpm (already recorded)`)
  if (!missing.max_heartrate)
    knownLines.push(`Max heart rate: ${Math.round(activity.max_heartrate!)} bpm (already recorded)`)
  if (!missing.average_cadence)
    knownLines.push(`Avg cadence: ${Math.round(activity.average_cadence!)} (already recorded)`)
  if (!missing.average_watts)
    knownLines.push(`Avg power: ${Math.round(activity.average_watts!)} W (already recorded)`)

  // ── Schema: only fields that are genuinely missing ────────────────────────
  const isCycling = ['Ride', 'VirtualRide'].includes(activity.sport_type)
  const schemaFields: string[] = []
  if (missing.distance) {
    if (isCycling) {
      schemaFields.push(`  "distance_km": number,          // distance exactly as shown on display in km (e.g. 58.3 for Keiser TRIP 58.3) — do NOT convert to metres, the server handles that`)
    } else {
      schemaFields.push(`  "distance_m": number,           // total distance in metres`)
    }
  }
  if (missing.moving_time)
    schemaFields.push(`  "moving_time_s": number,        // active/moving time in seconds`)
  if (missing.elapsed_time)
    schemaFields.push(`  "elapsed_time_s": number,       // total elapsed time in seconds`)
  if (missing.average_heartrate)
    schemaFields.push(`  "average_heartrate": number,    // average heart rate in bpm`)
  if (missing.max_heartrate)
    schemaFields.push(`  "max_heartrate": number,        // max heart rate in bpm`)
  if (missing.average_cadence)
    schemaFields.push(`  "average_cadence": number,      // cadence in rpm or spm`)
  if (missing.average_watts)
    schemaFields.push(`  "average_watts": number,        // average power in watts`)
  schemaFields.push(`  "notes": string                 // what you found, where, and any uncertainty`)

  return `${context}

Activity title: "${activity.name}"
${activity.description ? `Description: "${activity.description}"` : ''}
${hasPhotos ? 'Photos of the session/equipment display are attached.' : 'No photos available — rely on title and description.'}

${knownLines.length > 0
    ? `Already recorded by Strava (ground truth — focus only on the missing fields below):\n${knownLines.map((l) => `  • ${l}`).join('\n')}\n`
    : ''}
The following fields are missing and need to be extracted. All times in seconds, distances in metres. Best-effort estimates are welcome.

{
${schemaFields.join('\n')}
}`
}

// ─── Additive-only filter ─────────────────────────────────────────────────────

interface RawExtraction {
  distance_m?: number
  distance_km?: number   // cycling only — model outputs TRIP value in km as-is, server converts
  moving_time_s?: number
  elapsed_time_s?: number
  average_heartrate?: number
  max_heartrate?: number
  average_cadence?: number
  average_watts?: number
  notes?: string
}

export interface Suggestion {
  field: keyof NormalizedActivity
  label: string
  currentValue: string
  suggestedValue: string
  rawValue: number
  source: 'photo' | 'text' | 'derived'
}

function formatFieldValue(field: string, value: number): string {
  switch (field) {
    case 'distance':
      return value < 1000 ? `${value} m` : `${(value / 1000).toFixed(2)} km`
    case 'moving_time':
    case 'elapsed_time':
      return formatTime(value)
    case 'average_heartrate':
    case 'max_heartrate':
      return `${Math.round(value)} bpm`
    case 'average_cadence':
      return `${Math.round(value)} rpm`
    case 'average_watts':
      return `${Math.round(value)} W`
    default:
      return String(value)
  }
}

function buildSuggestions(
  raw: RawExtraction,
  activity: NormalizedActivity,
  missing: MissingFields,
  hasPhotos: boolean,
): Suggestion[] {
  const source: Suggestion['source'] = hasPhotos ? 'photo' : 'text'
  const suggestions: Suggestion[] = []

  const tryAdd = (
    field: keyof NormalizedActivity,
    label: string,
    rawValue: number | undefined,
    currentValue: number | null | undefined,
    isMissing: boolean,
  ) => {
    if (!isMissing || rawValue == null || rawValue <= 0) return
    suggestions.push({
      field,
      label,
      currentValue: currentValue != null && currentValue > 0
        ? formatFieldValue(field, currentValue)
        : '—',
      suggestedValue: formatFieldValue(field, Math.round(rawValue)),
      rawValue: Math.round(rawValue),
      source,
    })
  }

  tryAdd('distance',          'Distance',       raw.distance_m,        activity.distance,          missing.distance)
  tryAdd('moving_time',       'Moving time',    raw.moving_time_s,     activity.moving_time,        missing.moving_time)
  tryAdd('elapsed_time',      'Elapsed time',   raw.elapsed_time_s,    activity.elapsed_time,       missing.elapsed_time)
  tryAdd('average_heartrate', 'Avg heart rate', raw.average_heartrate, activity.average_heartrate,  missing.average_heartrate)
  tryAdd('max_heartrate',     'Max heart rate', raw.max_heartrate,     activity.max_heartrate,      missing.max_heartrate)
  tryAdd('average_cadence',   'Avg cadence',    raw.average_cadence,   activity.average_cadence,    missing.average_cadence)
  tryAdd('average_watts',     'Avg power',      raw.average_watts,     activity.average_watts,      missing.average_watts)

  return suggestions
}

// ─── Server-side sanity checks ────────────────────────────────────────────────

/**
 * Validates extracted distance against the known moving_time.
 * Catches decimal misreads (e.g. 5.83 km instead of 58.3 km) by checking
 * whether the implied average speed is physically plausible for the sport.
 * Discards distance_m if it falls outside the valid range.
 */
function sanitiseExtraction(raw: RawExtraction, activity: NormalizedActivity): void {
  if (!raw.distance_m || raw.distance_m <= 0) return
  const movingTime = activity.moving_time
  if (movingTime <= 0) return // can't validate without time

  const impliedSpeedKmh = (raw.distance_m / 1000) / (movingTime / 3600)
  const sport = activity.sport_type

  const ranges: Record<string, [number, number]> = {
    Ride:         [8,  65],
    VirtualRide:  [8,  65],
    Run:          [4,  30],
    VirtualRun:   [4,  30],
    Rowing:       [3,  30],  // rowing equivalent km/h
    VirtualRow:   [3,  30],
    Swim:         [0.5, 8],
    OpenWaterSwim:[0.5, 8],
  }

  const range = ranges[sport]
  if (!range) return

  const [min, max] = range
  if (impliedSpeedKmh < min || impliedSpeedKmh > max) {
    // Physically impossible — almost certainly a decimal misread
    raw.distance_m = undefined
  }
}

// ─── JSON extraction helpers ──────────────────────────────────────────────────

/**
 * Qwen3 (and other chain-of-thought models) wrap internal reasoning in
 * <think>...</think> tags before the final answer. The greedy JSON regex
 * would otherwise span from the first { inside <think> to the last } in
 * the final answer, producing broken input for JSON.parse(). Strip the
 * thinking block first so only the final answer remains.
 */
function stripThinkTags(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session.userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const activities = readActivities(session.userId)
  const activity = activities.find((a) => String(a.id) === id)
  if (!activity) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json().catch(() => ({}))
  const photoUrls: string[] = body.photoUrls ?? []
  const hasPhotos = photoUrls.length > 0

  // Determine what is genuinely missing before calling the model
  const missing = getMissingFields(activity)

  // Early exit — nothing to extract
  if (!hasMissingFields(missing)) {
    return NextResponse.json({
      suggestions: [],
      notes: 'All fields are already recorded by Strava.',
      model: '',
    })
  }

  const hfToken = process.env.HF_TOKEN
  if (!hfToken) {
    return NextResponse.json({ error: 'HF_TOKEN not configured' }, { status: 503 })
  }

  const hf = new HfInference(hfToken)
  const prompt = buildPrompt(activity, missing, hasPhotos)

  // Build the message content — text prompt + up to 3 photos
  type ContentPart =
    | { type: 'text'; text: string }
    | { type: 'image_url'; image_url: { url: string } }

  const content: ContentPart[] = []
  for (const url of photoUrls.slice(0, 3)) {
    content.push({ type: 'image_url', image_url: { url } })
  }
  content.push({ type: 'text', text: prompt })

  let raw: RawExtraction = {}
  let modelUsed = 'Qwen/Qwen3-VL-8B-Instruct'

  try {
    const result = await hf.chatCompletion({
      model: modelUsed,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: content as never },
      ],
      max_tokens: 1024,
    })

    const text = result.choices[0]?.message?.content ?? ''
    const jsonMatch = stripThinkTags(text).match(/\{[\s\S]*\}/)
    if (jsonMatch) raw = JSON.parse(jsonMatch[0])
  } catch {
    // Fallback to DeepSeek-OCR (text only)
    try {
      modelUsed = 'deepseek-ai/DeepSeek-OCR'
      const fallback = await hf.chatCompletion({
        model: modelUsed,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: prompt },
        ],
        max_tokens: 1024,
      })
      const text = fallback.choices[0]?.message?.content ?? ''
      const jsonMatch = stripThinkTags(text).match(/\{[\s\S]*\}/)
      if (jsonMatch) raw = JSON.parse(jsonMatch[0])
    } catch {
      // Both models failed — return empty suggestions
    }
  }

  // Normalise distance_km → distance_m for cycling activities
  if (raw.distance_km && raw.distance_km > 0 && !raw.distance_m) {
    raw.distance_m = raw.distance_km * 1000
  }

  sanitiseExtraction(raw, activity)
  const suggestions = buildSuggestions(raw, activity, missing, hasPhotos)

  return NextResponse.json({
    suggestions,
    notes: raw.notes ?? '',
    model: modelUsed,
  })
}
