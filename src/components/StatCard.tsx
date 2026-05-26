interface StatCardProps {
  label: string
  value: string
}

export default function StatCard({ label, value }: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
      <p className="text-2xl font-bold text-gray-900 mb-0.5 tabular-nums">{value}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}
