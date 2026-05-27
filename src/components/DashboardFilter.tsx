'use client'

import Link from 'next/link'
import { Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import SportIcon from './ActivityIcon'

export interface FilterOption {
  key: string       // URL param value, or 'all'
  label: string
  count: number
  iconType: string  // sport_type string fed into SportIcon; '' for All
}

function Chips({ options }: { options: FilterOption[] }) {
  const params = useSearchParams()
  const active = params.get('filter') ?? 'all'

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = opt.key === active
        const href = opt.key === 'all' ? '/dashboard' : `/dashboard?filter=${opt.key}`
        return (
          <Link
            key={opt.key}
            href={href}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? 'bg-orange-500 text-white shadow-sm'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-orange-300 hover:text-orange-600'
            }`}
          >
            {opt.iconType && (
              <SportIcon
                type={opt.iconType}
                size={14}
                color={isActive ? 'white' : 'currentColor'}
              />
            )}
            {opt.label}
            <span className={`text-xs tabular-nums ${isActive ? 'text-orange-100' : 'text-gray-400'}`}>
              {opt.count}
            </span>
          </Link>
        )
      })}
    </div>
  )
}

export default function DashboardFilter({ options }: { options: FilterOption[] }) {
  return (
    <Suspense
      fallback={
        <div className="flex flex-wrap gap-2">
          {options.map((opt) => (
            <div
              key={opt.key}
              className="h-8 px-3 rounded-full bg-gray-100 animate-pulse"
              style={{ width: `${opt.label.length * 9 + 40}px` }}
            />
          ))}
        </div>
      }
    >
      <Chips options={options} />
    </Suspense>
  )
}
