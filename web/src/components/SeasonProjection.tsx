"use client"

import { useMemo } from "react"
import type { TeamStanding } from "@/lib/types"

interface SeasonProjectionProps {
  standings: TeamStanding[]
}

interface ProjectedTeam {
  team: string
  currentPoints: number
  played: number
  xPTSPerGame: number
  projectedPoints: number
  zone: "libertadores" | "pre-libertadores" | "sulamericana" | "none" | "rebaixamento"
}

const TOTAL_ROUNDS = 38

export function SeasonProjection({ standings }: SeasonProjectionProps) {
  const projections = useMemo(() => {
    if (standings.length === 0 || standings[0].played < 3) return []

    return standings
      .map((s): ProjectedTeam => {
        const remaining = TOTAL_ROUNDS - s.played
        const xPTSPerGame = s.played > 0 ? s.xPTS / s.played : 0
        const projectedRemaining = xPTSPerGame * remaining
        const projectedPoints = Math.round(s.points + projectedRemaining)

        return {
          team: s.team,
          currentPoints: s.points,
          played: s.played,
          xPTSPerGame,
          projectedPoints,
          zone: "none",
        }
      })
      .sort((a, b) => b.projectedPoints - a.projectedPoints)
      .map((t, i) => ({
        ...t,
        zone: (i < 4 ? "libertadores" : i < 6 ? "pre-libertadores" : i < 12 ? "sulamericana" : i >= 16 ? "rebaixamento" : "none") as ProjectedTeam["zone"],
      }))
  }, [standings])

  if (projections.length === 0) return null

  const maxProjected = Math.max(...projections.map(p => p.projectedPoints))

  const zoneColors: Record<string, string> = {
    libertadores: "bg-green-700",
    "pre-libertadores": "bg-green-400",
    sulamericana: "bg-blue-500",
    none: "bg-gray-300",
    rebaixamento: "bg-red-500",
  }

  const zoneBarColors: Record<string, string> = {
    libertadores: "bg-green-700",
    "pre-libertadores": "bg-green-400",
    sulamericana: "bg-blue-400",
    none: "bg-gray-300",
    rebaixamento: "bg-red-400",
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
          PROJEÇÃO DE FINAL DE TEMPORADA
        </h2>
        <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 mt-1">
          Baseado no xPTS/jogo de cada time, projetado para 38 rodadas
        </p>
      </div>

      <div className="p-6 space-y-2">
        {projections.map((team, index) => (
          <div key={team.team} className="flex items-center gap-3">
            {/* Position */}
            <span className="font-[family-name:var(--font-data)] text-xs text-gray-400 w-5 text-right">
              {index + 1}
            </span>

            {/* Zone indicator */}
            <span className={`w-1.5 h-6 rounded-full ${zoneColors[team.zone]}`} />

            {/* Team name */}
            <span className="text-sm font-medium text-gray-900 w-32 truncate">
              {team.team}
            </span>

            {/* Bar */}
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden relative">
                {/* Current points portion */}
                <div
                  className="absolute left-0 top-0 h-full bg-gray-900/20 rounded-full"
                  style={{ width: `${(team.currentPoints / maxProjected) * 100}%` }}
                />
                {/* Projected total */}
                <div
                  className={`absolute left-0 top-0 h-full ${zoneBarColors[team.zone]} rounded-full opacity-50`}
                  style={{ width: `${(team.projectedPoints / maxProjected) * 100}%` }}
                />
                {/* Current points label inside bar */}
                <div
                  className="absolute left-0 top-0 h-full flex items-center"
                  style={{ width: `${(team.currentPoints / maxProjected) * 100}%` }}
                >
                  <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-700 ml-1.5 font-bold">
                    {team.currentPoints}
                  </span>
                </div>
              </div>

              {/* Projected points */}
              <span className="font-[family-name:var(--font-heading)] text-base text-gray-900 w-10 text-right">
                {team.projectedPoints}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="px-6 py-3 border-t border-gray-100 flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-700" />
          <span className="text-gray-500">Libertadores (1-4)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-green-400" />
          <span className="text-gray-500">Pré-Liberta (5-6)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500" />
          <span className="text-gray-500">Sul-Americana (7-12)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-gray-500">Rebaixamento (17-20)</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto">
          <span className="w-3 h-3 rounded bg-gray-900/20" />
          <span className="text-gray-400">Pontos atuais</span>
          <span className="w-3 h-3 rounded bg-gray-300/50 ml-2" />
          <span className="text-gray-400">Projetados</span>
        </div>
      </div>

      {/* Methodology note */}
      <div className="px-6 py-3 border-t border-gray-100">
        <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 leading-relaxed">
          Projeção calculada com base no xPTS (pontos esperados) por jogo de cada time,
          extrapolado para as rodadas restantes. Não considera calendário, mando de campo ou contratações.
          <a href="/sobre" className="text-[var(--color-green-primary)] hover:underline ml-1">
            Saiba mais sobre a metodologia →
          </a>
        </p>
      </div>
    </div>
  )
}
