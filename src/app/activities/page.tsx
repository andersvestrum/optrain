import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { readActivities, readProfile } from '@/lib/storage'
import Navbar from '@/components/Navbar'
import ActivityCard from '@/components/ActivityCard'
import SyncButton from '@/components/SyncButton'
import type { PublicProfile } from '@/types'

export default async function ActivitiesPage() {
  const session = await getSession()
  if (!session.userId) redirect('/')

  const activities = readActivities(session.userId)
  const profile = readProfile(session.userId)

  const publicProfile: PublicProfile | null = profile
    ? {
        id: profile.id,
        firstname: profile.firstname,
        lastname: profile.lastname,
        profile_medium: profile.profile_medium,
      }
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar profile={publicProfile} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">All Activities</h1>
            <p className="text-sm text-gray-500 mt-1">
              {activities.length} {activities.length === 1 ? 'activity' : 'activities'}
            </p>
          </div>
          <SyncButton />
        </div>

        {activities.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
            <p className="text-gray-500 mb-6 text-sm">
              No activities yet. Sync your Strava data to get started.
            </p>
            <SyncButton />
          </div>
        ) : (
          <div className="space-y-3">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
