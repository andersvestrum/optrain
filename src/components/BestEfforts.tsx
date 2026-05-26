import type { BestEffort } from '@/types'
import { formatTime } from '@/lib/format'

const PR_STYLE: Record<number, { label: string; className: string }> = {
  1: { label: 'PR', className: 'bg-amber-50 text-amber-700 border-amber-200' },
  2: { label: '2nd', className: 'bg-gray-50 text-gray-600 border-gray-200' },
  3: { label: '3rd', className: 'bg-orange-50 text-orange-700 border-orange-200' },
}

export default function BestEfforts({ efforts }: { efforts: BestEffort[] }) {
  if (efforts.length === 0) return null

  const notable = efforts.filter((e) => e.pr_rank != null && e.pr_rank <= 3)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-4">Best Efforts</h2>

      {notable.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {notable.map((e) => (
            <div
              key={e.name}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-semibold tracking-wide ${PR_STYLE[e.pr_rank!].className}`}
            >
              <span>{PR_STYLE[e.pr_rank!].label}</span>
              <span className="font-normal text-gray-400">·</span>
              <span className="font-medium">{e.name}</span>
              <span className="tabular-nums">{formatTime(e.elapsed_time)}</span>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="pb-2 font-medium pr-4">Distance</th>
              <th className="pb-2 font-medium pr-4">Time</th>
              <th className="pb-2 font-medium">Rank</th>
            </tr>
          </thead>
          <tbody>
            {efforts.map((e) => (
              <tr key={e.name} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="py-2 font-medium text-gray-700 pr-4">{e.name}</td>
                <td className="py-2 text-gray-600 pr-4 tabular-nums">{formatTime(e.elapsed_time)}</td>
                <td className="py-2">
                  {e.pr_rank && PR_STYLE[e.pr_rank] ? (
                    <span
                      className={`text-xs px-2 py-0.5 rounded border font-semibold tracking-wide ${PR_STYLE[e.pr_rank].className}`}
                    >
                      {PR_STYLE[e.pr_rank].label}
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">–</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
