export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6 animate-pulse">
      {/* Hero skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-100 rounded-xl h-48" />
        <div className="bg-gray-100 rounded-xl h-48" />
        <div className="bg-gray-100 rounded-xl h-48" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="h-6 bg-gray-100 rounded w-64" />
        </div>
        <div className="p-4 space-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-10 bg-gray-50 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
