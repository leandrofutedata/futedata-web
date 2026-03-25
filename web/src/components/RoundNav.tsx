"use client"

interface RoundNavProps {
  currentRound: number
  availableRounds: number[]
  onRoundChange: (round: number) => void
}

export function RoundNav({
  currentRound,
  availableRounds,
  onRoundChange,
}: RoundNavProps) {
  const minRound = availableRounds[0] ?? 1
  const maxRound = availableRounds[availableRounds.length - 1] ?? 1

  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-4 shadow-sm mb-6">
      <button
        onClick={() => onRoundChange(Math.max(currentRound - 1, minRound))}
        disabled={currentRound <= minRound}
        className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-green-primary)] text-white hover:bg-[var(--color-green-dark)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Rodada anterior"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      <div className="flex items-center gap-3">
        <span className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
          RODADA {currentRound}
        </span>
        <span className="font-[family-name:var(--font-data)] text-xs text-gray-500">
          de {maxRound}
        </span>
      </div>

      <button
        onClick={() => onRoundChange(Math.min(currentRound + 1, maxRound))}
        disabled={currentRound >= maxRound}
        className="flex items-center justify-center w-10 h-10 rounded-lg bg-[var(--color-green-primary)] text-white hover:bg-[var(--color-green-dark)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        aria-label="Próxima rodada"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  )
}
