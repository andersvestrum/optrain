import fs from 'fs'
import path from 'path'
import type { UserProfile, NormalizedActivity, SyncState } from '@/types'

const DATA_DIR = path.join(process.cwd(), 'data', 'users')

function getUserDir(userId: string): string {
  return path.join(DATA_DIR, userId)
}

function ensureUserDir(userId: string): void {
  fs.mkdirSync(getUserDir(userId), { recursive: true })
}

function readJSON<T>(filePath: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
  } catch {
    return fallback
  }
}

function writeJSON(filePath: string, data: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

export function readProfile(userId: string): UserProfile | null {
  return readJSON(path.join(getUserDir(userId), 'profile.json'), null)
}

export function writeProfile(userId: string, profile: UserProfile): void {
  ensureUserDir(userId)
  writeJSON(path.join(getUserDir(userId), 'profile.json'), profile)
}

export function updateProfile(userId: string, updates: Partial<UserProfile>): void {
  const profile = readProfile(userId)
  if (profile) writeProfile(userId, { ...profile, ...updates })
}

export function readActivities(userId: string): NormalizedActivity[] {
  return readJSON(path.join(getUserDir(userId), 'activities.json'), [])
}

export function writeActivities(userId: string, activities: NormalizedActivity[]): void {
  ensureUserDir(userId)
  writeJSON(path.join(getUserDir(userId), 'activities.json'), activities)
}

export function mergeActivities(userId: string, incoming: NormalizedActivity[]): number {
  const existing = readActivities(userId)
  const existingIds = new Set(existing.map((a) => a.id))
  const toAdd = incoming.filter((a) => !existingIds.has(a.id))

  if (toAdd.length === 0) return 0

  const merged = [...existing, ...toAdd].sort(
    (a, b) => new Date(b.start_date).getTime() - new Date(a.start_date).getTime()
  )
  writeActivities(userId, merged)
  return toAdd.length
}

export function updateActivity(
  userId: string,
  activityId: number,
  updates: Partial<NormalizedActivity>
): void {
  const activities = readActivities(userId)
  const idx = activities.findIndex((a) => a.id === activityId)
  if (idx !== -1) {
    activities[idx] = { ...activities[idx], ...updates }
    writeActivities(userId, activities)
  }
}

export function readSyncState(userId: string): SyncState {
  return readJSON(path.join(getUserDir(userId), 'sync_state.json'), { last_synced_at: null })
}

export function writeSyncState(userId: string, state: SyncState): void {
  ensureUserDir(userId)
  writeJSON(path.join(getUserDir(userId), 'sync_state.json'), state)
}
