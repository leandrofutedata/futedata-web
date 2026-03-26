interface InsightBoxProps {
  insight: string
  label?: string
}

export function InsightBox({ insight, label = 'Análise IA' }: InsightBoxProps) {
  if (!insight) return null

  return (
    <div className="border-l-4 border-[var(--color-green-primary)] bg-white rounded-r-lg p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2">
        <span className="font-[family-name:var(--font-data)] text-[10px] uppercase tracking-wide text-[var(--color-green-primary)] font-medium bg-[var(--color-green-light)] px-2 py-0.5 rounded-full">
          {label}
        </span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed font-[family-name:var(--font-body)]">
        {insight}
      </p>
    </div>
  )
}

export function InsightBoxSkeleton() {
  return (
    <div className="border-l-4 border-gray-200 bg-white rounded-r-lg p-4 shadow-sm animate-pulse">
      <div className="flex items-center gap-2 mb-2">
        <div className="h-4 w-20 bg-gray-200 rounded-full" />
      </div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200 rounded w-full" />
        <div className="h-3 bg-gray-200 rounded w-5/6" />
        <div className="h-3 bg-gray-200 rounded w-4/6" />
      </div>
    </div>
  )
}
