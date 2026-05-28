import { redirect } from 'next/navigation'
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { readActivities } from '@/lib/storage'
import { HfInference } from '@huggingface/inference'
import type { NormalizedActivity } from '@/types'

// ─── Activity-type-specific prompts ──────────────────────────────────────────

const SYSTEM_PROMPT = `You are a fitness data extraction assistant. Extract structured workout data from activity titles, descriptions, and photos of equipment displays. Return ONLY valid JSON matching the schema. If a value cannot be confidently determined, omit it entirely — do not guess.`

function buildPrompt(activity: NormalizedActivity, hasPhotos: boolean): string {
  const typeInstructions: Record<string, string> = {
    Rowing: `This is an indoor rowing session (erg/ergometer, e.g. Concept2). Displays typically show:
- Distance in metres (e.g. "5000m", "5,000m")
- Time as h:mm:ss.t or mm:ss.t
- Split pace as mm:ss.t /500m
- Stroke rate in strokes/min (s/m or spm)
- Power in watts (W)
- Calories
Convert any split pace to seconds per 500m for average_split_500m.`,

    VirtualRow: `This is an indoor rowing erg session. Same as above.`,

    Ride: `This is an indoor cycling session (trainer, spin bike, Zwift, Wahoo, etc.). Displays typically show:
- Distance in km (sometimes miles — convert to metres)
- Average power in watts (W)
- Cadence in rpm
- Average speed in km/h
- Heart rate in bpm
- Calories`,

    VirtualRide: `This is an indoor cycling session. Same as above.`,

    Run: `This is a treadmill run. Displays typically show:
- Distance in km or miles (convert miles: 1 mile = 1609.34 m)
- Pace in min:sec per km or per mile (convert to seconds/km)
- Speed in km/h or mph
- Incline in %
- Heart rate in bpm
- Calories`,

    VirtualRun: `This is a treadmill run. Same as above.`,

    Swim: `This is a pool swim session. Look for:
- Pool length in metres (25m or 50m)
- Number of laps (total length = laps × pool length)
- Total distance in metres or yards (1 yard = 0.9144m)
- Total time
- Stroke type`,

    WeightTraining: `This is a gym/weight training session. Look for:
- Total active/workout time in minutes or seconds
- Calories burned
- Any distance equivalent
Also parse the title and description for sets/reps (e.g. "5x5 squats", "3 rounds")`,
  }

  const instruction = typeInstructions[activity.sport_type]
    ?? typeInstructions[activity.type]
    ?? `This is a ${activity.sport_type} session. Extract any performance metrics visible.`

  return `${instruction}

Activity title: "${activity.name}"
${activity.description ? `Description: "${activity.description}"` : ''}
${hasPhotos ? 'Photos of the session/equipment display are attached.' : 'No photos available.'}

Return a JSON object with only the fields you can confidently extract. All times in seconds, all distances in metres.

Schema (include only fields you found):
{
  "distance_m": number,           // total distance in metres
  "moving_time_s": number,        // active/moving time in seconds
  "elapsed_time_s": number,       // total elapsed time in seconds
  "average_heartrate": number,    // average heart rate in bpm
  "max_heartrate": number,        // max heart rate in bpm
  "average_cadence": number,      // cadence in rpm or spm
  "average_watts": number,        // average power in watts
  "calories": number,             // calories burned
  "notes": string                 // brief explanation of what you found and from where
}`
}

// ─── Additive-only filter ─────────────────────────────────────────────────────

interface RawExtraction {
  distance_m?: number
  moving_time_s?: number
  elapsed_time_s?: number
  average_heartrate?: number
  max_heartrate?: number
  average_cadence?: number
  average_watts?: number
  calories?: number
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
    case 'elapsed_time': {
      const h = Math.floor(value / 3600)
      const m = Math.floor((value % 3600) / 60)
      const s = value % 60
      return h > 0
        ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
        : `${m}:${String(s).padStart(2, '0')}`
    }
    case 'average_heartrate':
    case 'max_heartrate':
      return `${Math.round(value)} bpm`
    case 'average_cadence':
      return `${Math.round(value)} rpm`
    case 'average_watts':
      return `${Math.round(value)} W`
    case 'calories':
      return `${Math.round(value)} kcal`
    default:
      return String(value)
  }
}

function buildSuggestions(
  raw: RawExtraction,
  activity: NormalizedActivity,
  hasPhotos: boolean,
): Suggestion[] {
  const source: Suggestion['source'] = hasPhotos ? 'photo' : 'text'
  const suggestions: Suggestion[] = []

  const tryAdd = (
    field: keyof NormalizedActivity,
    label: string,
    rawValue: number | undefined,
    currentValue: number | null | undefined,
    addIf: boolean,
  ) => {
    if (rawValue == null || !addIf) return
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

  tryAdd('distance',          'Distance',       raw.distance_m,      activity.distance,          (activity.distance ?? 0) < 100 && (raw.distance_m ?? 0) > 0)
  tryAdd('moving_time',       'Moving time',    raw.moving_time_s,   activity.moving_time,        (activity.moving_time ?? 0) === 0 && (raw.moving_time_s ?? 0) > 0)
  tryAdd('elapsed_time',      'Elapsed time',   raw.elapsed_time_s,  activity.elapsed_time,       (activity.elapsed_time ?? 0) === 0 && (raw.elapsed_time_s ?? 0) > 0)
  tryAdd('average_heartrate', 'Avg heart rate', raw.average_heartrate, activity.average_heartrate, activity.average_heartrate == null && (raw.average_heartrate ?? 0) > 0)
  tryAdd('max_heartrate',     'Max heart rate', raw.max_heartrate,   activity.max_heartrate,      activity.max_heartrate == null && (raw.max_heartrate ?? 0) > 0)
  tryAdd('average_cadence',   'Avg cadence',    raw.average_cadence, activity.average_cadence,    activity.average_cadence == null && (raw.average_cadence ?? 0) > 0)
  tryAdd('average_watts',     'Avg power',      raw.average_watts,   activity.average_watts,      activity.average_watts == null && (raw.average_watts ?? 0) > 0)

  return suggestions
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

  const hfToken = process.env.HF_TOKEN
  if (!hfToken) {
    return NextResponse.json({ error: 'HF_TOKEN not configured' }, { status: 503 })
  }

  const hf = new HfInference(hfToken)
  const prompt = buildPrompt(activity, hasPhotos)

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
      max_tokens: 512,
    })

    const text = result.choices[0]?.message?.content ?? ''
    const jsonMatch = text.match(/\{[\s\S]*\}/)
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
        max_tokens: 512,
      })
      const text = fallback.choices[0]?.message?.content ?? ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) raw = JSON.parse(jsonMatch[0])
    } catch {
      // Both models failed — return empty suggestions
    }
  }

  const suggestions = buildSuggestions(raw, activity, hasPhotos)

  return NextResponse.json({
    suggestions,
    notes: raw.notes ?? '',
    model: modelUsed,
  })
}
