import { fetchAllGames } from "@/lib/data"
import { calcStandings } from "@/lib/calculations"
import { TEAMS, getTeamSlug } from "@/lib/teams"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Times do Brasileirão 2026 — Estatísticas e Análise | Futedata",
  description: "Todos os 20 times da Série A do Brasileirão 2026. Veja estatísticas, classificação, xG, xPTS e análise completa de cada clube.",
}

export const revalidate = 300

export default async function TimesPage() {
  const games = await fetchAllGames()
  const standings = calcStandings(games)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-[var(--color-green-dark)] rounded-xl p-6 md:p-8 shadow-lg mb-8">
        <p className="font-[family-name:var(--font-data)] text-[10px] text-green-300 uppercase tracking-widest mb-1">
          Brasileirão Série A 2026
        </p>
        <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-6xl text-white">
          TIMES
        </h1>
        <p className="text-green-200 text-sm mt-2">
          Estatísticas completas, análise e desempenho de cada clube
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {standings.map((team, index) => {
          const position = index + 1
          const teamInfo = TEAMS.find(t => t.name === team.team)
          const slug = teamInfo?.slug || getTeamSlug(team.team)

          const zoneColor = position <= 4
            ? "border-l-blue-500"
            : position <= 6
              ? "border-l-green-500"
              : position > standings.length - 4
                ? "border-l-red-500"
                : "border-l-gray-200"

          return (
            <Link
              key={team.team}
              href={`/times/${slug}`}
              className={`bg-white border border-gray-200 border-l-4 ${zoneColor} rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow group`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="font-[family-name:var(--font-data)] text-xs text-gray-400">
                  #{position}
                </span>
                <span className="font-[family-name:var(--font-heading)] text-lg text-[var(--color-green-primary)]">
                  {team.points}pts
                </span>
              </div>
              <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 group-hover:text-[var(--color-green-primary)] transition-colors">
                {team.team}
              </h2>
              {teamInfo && (
                <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 mt-0.5">
                  {teamInfo.city}/{teamInfo.state}
                </p>
              )}
              <div className="flex items-center gap-3 mt-3">
                <div className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">
                  {team.wins}V {team.draws}E {team.losses}D
                </div>
                <div className="flex gap-0.5">
                  {team.form.map((result, i) => (
                    <span
                      key={i}
                      className={`form-${result} w-4 h-4 flex items-center justify-center rounded text-[8px] font-[family-name:var(--font-data)] font-bold`}
                    >
                      {result}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                  xG {team.xG.toFixed(1)}
                </span>
                <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                  xPTS {team.xPTS.toFixed(1)}
                </span>
                <span className={`font-[family-name:var(--font-data)] text-[10px] font-bold ${team.deltaPTS > 0 ? 'text-orange-500' : team.deltaPTS < 0 ? 'text-green-600' : 'text-gray-400'}`}>
                  ±{team.deltaPTS > 0 ? '+' : ''}{team.deltaPTS.toFixed(1)}
                </span>
              </div>
              <p className="font-[family-name:var(--font-data)] text-[10px] text-[var(--color-green-primary)] mt-3 group-hover:underline">
                Ver análise completa →
              </p>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
