'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { PublicProfile } from '@/types'

export default function Navbar({ profile }: { profile: PublicProfile | null }) {
  const pathname = usePathname()
  const router = useRouter()

  const navLink = (href: string, label: string) => {
    const active = pathname === href
    return (
      <Link
        href={href}
        className={`text-sm transition-colors ${
          active ? 'text-orange-500 font-medium' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {label}
      </Link>
    )
  }

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/')
    router.refresh()
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/dashboard" className="text-xl font-bold text-gray-900 select-none">
            Op<span className="text-orange-500">Train</span>
          </Link>
          <div className="hidden sm:flex items-center gap-6">
            {navLink('/dashboard', 'Dashboard')}
            {navLink('/activities', 'Activities')}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {profile && (
            <div className="hidden sm:flex items-center gap-2">
              {profile.profile_medium && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profile.profile_medium}
                  alt={`${profile.firstname} ${profile.lastname}`}
                  className="w-8 h-8 rounded-full object-cover"
                />
              )}
              <span className="text-sm text-gray-700 font-medium">
                {profile.firstname} {profile.lastname}
              </span>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-gray-700 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  )
}
