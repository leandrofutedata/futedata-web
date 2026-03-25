import type { Game } from "@/lib/types"

interface GameCardProps {
  game: Game
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function StatusBadge({ status }: { status: Game["status"] }) {
  if (status === "FT") {
    return (
      <span className="font-[family-name:var(--font-data)] text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
        FT
      </span>
    )
  }
  if (["1H", "2H", "HT"].includes(status)) {
    return (
      <span className="font-[family-name:var(--font-data)] text-[10px] bg-red-50 text-red-600 px-2 py-0.5 rounded-full animate-pulse-live">
        AO VIVO
      </span>
    )
  }
  return (
    <span className="font-[family-name:var(--font-data)] text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">
      EM BREVE
    </span>
  )
}

export function GameCard({ game }: GameCardProps) {
  const isFinished = game.status === "FT"
  const isLive = ["1H", "2H", "HT"].includes(game.status)

  return (
    <div
      className={`bg-white border border-gray-200 rounded-xl p-4 shadow-sm transition-all hover:shadow-md ${
        isLive ? "border-l-4 border-l-red-500" : ""
      }`}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="font-[family-name:var(--font-data)] text-[11px] text-gray-400">
          {formatDate(game.date)}
        </span>
        <StatusBadge status={game.status} />
      </div>

      <div className="flex items-center justify-between">
        {/* Home team */}
        <div className="flex-1 text-right">
          <p className="font-medium text-gray-900 text-sm">{game.home_team}</p>
        </div>

        {/* Score */}
        <div className="px-4 flex items-center gap-2">
          {isFinished || isLive ? (
            <span className="font-[family-name:var(--font-heading)] text-3xl text-gray-900">
              {game.home_goals} — {game.away_goals}
            </span>
          ) : (
            <span className="font-[family-name:var(--font-data)] text-sm text-gray-400">
              {new Date(game.date).toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
          )}
        </div>

        {/* Away team */}
        <div className="flex-1 text-left">
          <p className="font-medium text-gray-900 text-sm">{game.away_team}</p>
        </div>
      </div>

      {/* xG row */}
      {isFinished && (game.home_xg != null || game.away_xg != null) && (
        <div className="flex items-center justify-between mt-2 font-[family-name:var(--font-data)] text-[10px] text-gray-400">
          <span className="flex-1 text-right">
            xG {game.home_xg?.toFixed(1) ?? "—"}
          </span>
          <span className="px-4" />
          <span className="flex-1 text-left">
            xG {game.away_xg?.toFixed(1) ?? "—"}
          </span>
        </div>
      )}

    </div>
  )
}
