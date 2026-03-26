"use client"

import { InsightBox } from "./InsightBox"

interface RankingEntry {
  team: string
  value: number
  label: string
}

interface RankingCardProps {
  id: string
  title: string
  subtitle: string
  entries: RankingEntry[]
  insight?: string
  barColor?: string
  formatValue?: (value: number) => string
}

export function RankingCard({
  id,
  title,
  subtitle,
  entries,
  insight,
  barColor = "bg-[var(--color-green-primary)]",
  formatValue = (v) => v.toFixed(1),
}: RankingCardProps) {
  const maxValue = entries.length > 0 ? Math.max(...entries.map((e) => e.value)) : 1

  async function handleShare() {
    const url = `${window.location.origin}/rankings#${id}`
    const text = `${title}\n${entries.map((e, i) => `${i + 1}. ${e.team} — ${formatValue(e.value)}`).join('\n')}\n\nVia Futedata`

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url })
      } catch {
        // User cancelled or share failed
      }
    } else {
      await navigator.clipboard.writeText(`${text}\n${url}`)
    }
  }

  return (
    <div id={id} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden scroll-mt-20">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
          {title}
        </h2>
        <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase tracking-wide mt-0.5">
          {subtitle}
        </p>
      </div>

      <div className="p-6 space-y-3">
        {entries.map((entry, index) => (
          <div key={entry.team} className="flex items-center gap-3">
            <span className="font-[family-name:var(--font-heading)] text-2xl text-gray-300 w-8 text-center">
              {index + 1}
            </span>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-900">
                  {entry.team}
                </span>
                <span className="font-[family-name:var(--font-data)] text-xs text-gray-600 font-medium">
                  {formatValue(entry.value)}
                </span>
              </div>
              <div className="bg-gray-100 rounded-full h-3 overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor} transition-all duration-500`}
                  style={{ width: `${(entry.value / maxValue) * 100}%` }}
                />
              </div>
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 mt-0.5">
                {entry.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {insight && (
        <div className="px-6 pb-4">
          <InsightBox insight={insight} label="Opinião" />
        </div>
      )}

      <div className="px-6 pb-4">
        <button
          onClick={handleShare}
          className="font-[family-name:var(--font-data)] text-[10px] px-4 py-2 rounded-full bg-[var(--color-green-light)] text-[var(--color-green-primary)] font-medium hover:bg-[var(--color-green-primary)] hover:text-white transition-colors"
        >
          Compartilhar ranking
        </button>
      </div>
    </div>
  )
}
