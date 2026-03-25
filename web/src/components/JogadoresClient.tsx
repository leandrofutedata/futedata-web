"use client"

import { useState, useMemo } from "react"
import type { Game } from "@/lib/types"
import { parseRoundNumber } from "@/lib/calculations"

interface JogadoresClientProps {
  games: Game[]
}

interface PlayerAgg {
  name: string
  team: string
  goals: number
  assists: number
  gamesPlayed: number
  avgGoals: number
}

function getTeamColor(team: string): string {
  const colors: Record<string, string> = {
    Flamengo: "#B71C1C",
    Palmeiras: "#1B5E20",
    "Atletico-MG": "#212121",
    "Atletico Mineiro": "#212121",
    Fluminense: "#880E4F",
    Corinthians: "#212121",
    "Sao Paulo": "#B71C1C",
    Internacional: "#C62828",
    Gremio: "#0D47A1",
    Santos: "#212121",
    Botafogo: "#212121",
    Vasco: "#212121",
    Cruzeiro: "#1565C0",
    Bahia: "#0D47A1",
    Fortaleza: "#B71C1C",
    Athletico: "#B71C1C",
    "Athletico-PR": "#B71C1C",
    "Red Bull Bragantino": "#212121",
    Bragantino: "#212121",
    Cuiaba: "#F9A825",
    Goias: "#1B5E20",
    "America-MG": "#1B5E20",
    Coritiba: "#1B5E20",
  }
  return colors[team] || "#00843D"
}

function getInitials(name: string): string {
  const parts = name.split(" ")
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.slice(0, 2).toUpperCase()
}

function extractTopScorers(games: Game[]): PlayerAgg[] {
  const finishedGames = games.filter((g) => g.status === "FT")
  const playerMap = new Map<string, PlayerAgg>()

  for (const game of finishedGames) {
    const rawJson = game.raw_json as Record<string, unknown> | null
    if (!rawJson) continue

    const events = (rawJson as { events?: Array<{ type?: string; detail?: string; player?: { name?: string }; team?: { name?: string } }> }).events
    if (!Array.isArray(events)) continue

    for (const event of events) {
      if (event.type === "Goal" && event.detail !== "Missed Penalty") {
        const name = event.player?.name
        const team = event.team?.name
        if (!name || !team) continue

        const key = `${name}__${team}`
        if (!playerMap.has(key)) {
          playerMap.set(key, {
            name,
            team,
            goals: 0,
            assists: 0,
            gamesPlayed: 0,
            avgGoals: 0,
          })
        }
        playerMap.get(key)!.goals++
      }
    }
  }

  // Count games played (approximate: unique rounds where team played)
  const teamGames = new Map<string, number>()
  for (const game of finishedGames) {
    teamGames.set(game.home_team, (teamGames.get(game.home_team) || 0) + 1)
    teamGames.set(game.away_team, (teamGames.get(game.away_team) || 0) + 1)
  }

  for (const player of playerMap.values()) {
    player.gamesPlayed = teamGames.get(player.team) || 1
    player.avgGoals =
      Math.round((player.goals / player.gamesPlayed) * 100) / 100
  }

  return Array.from(playerMap.values())
    .sort((a, b) => b.goals - a.goals || b.avgGoals - a.avgGoals)
    .slice(0, 30)
}

export function JogadoresClient({ games }: JogadoresClientProps) {
  const [clubFilter, setClubFilter] = useState<string>("todos")
  const topScorers = useMemo(() => extractTopScorers(games), [games])

  const clubs = useMemo(() => {
    const set = new Set(topScorers.map((p) => p.team))
    return Array.from(set).sort()
  }, [topScorers])

  const filtered = useMemo(() => {
    if (clubFilter === "todos") return topScorers
    return topScorers.filter((p) => p.team === clubFilter)
  }, [topScorers, clubFilter])

  const maxGoals = filtered.length > 0 ? filtered[0].goals : 1

  const hasData = topScorers.length > 0

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl text-gray-900 mb-2">
          JOGADORES
        </h1>
        <p className="text-gray-500 text-sm">
          Ranking de goleadores e estatísticas individuais do Brasileirão
        </p>
      </div>

      {!hasData ? (
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm mb-2">
            Dados de jogadores ainda não disponíveis.
          </p>
          <p className="text-gray-300 text-xs">
            Os dados de goleadores são extraídos dos eventos dos jogos.
            Certifique-se de que os jogos possuem raw_json com eventos.
          </p>
        </div>
      ) : (
        <>
          {/* Filters */}
          <div className="flex gap-2 mb-6 flex-wrap">
            <button
              onClick={() => setClubFilter("todos")}
              className={`font-[family-name:var(--font-data)] text-xs px-4 py-2 rounded-lg transition-colors ${
                clubFilter === "todos"
                  ? "bg-[var(--color-green-primary)] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              Todos os clubes
            </button>
            {clubs.map((club) => (
              <button
                key={club}
                onClick={() => setClubFilter(club)}
                className={`font-[family-name:var(--font-data)] text-xs px-4 py-2 rounded-lg transition-colors ${
                  clubFilter === club
                    ? "bg-[var(--color-green-primary)] text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {club}
              </button>
            ))}
          </div>

          {/* Goleadores section */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
                ARTILHARIA
              </h2>
            </div>

            <div className="divide-y divide-gray-100">
              {filtered.map((player, index) => {
                const color = getTeamColor(player.team)
                const initials = getInitials(player.name)
                const barWidth = (player.goals / maxGoals) * 100

                return (
                  <div
                    key={`${player.name}__${player.team}`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors"
                  >
                    {/* Position */}
                    <span className="font-[family-name:var(--font-heading)] text-2xl text-gray-300 w-8 text-right">
                      {index + 1}
                    </span>

                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: color }}
                    >
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {player.name}
                      </p>
                      <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">
                        {player.team}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="hidden sm:flex items-center gap-6">
                      <div className="text-center">
                        <p className="font-[family-name:var(--font-heading)] text-2xl text-[var(--color-green-primary)]">
                          {player.goals}
                        </p>
                        <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 uppercase">
                          Gols
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="font-[family-name:var(--font-data)] text-sm text-gray-700">
                          {player.gamesPlayed}
                        </p>
                        <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 uppercase">
                          Jogos
                        </p>
                      </div>
                      <div className="text-center">
                        <p className="font-[family-name:var(--font-data)] text-sm text-gray-700">
                          {player.avgGoals.toFixed(2)}
                        </p>
                        <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 uppercase">
                          Média
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-24 hidden md:block">
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--color-green-primary)] rounded-full transition-all"
                          style={{ width: `${barWidth}%` }}
                        />
                      </div>
                    </div>

                    {/* Mobile goals */}
                    <div className="sm:hidden">
                      <span className="font-[family-name:var(--font-heading)] text-2xl text-[var(--color-green-primary)]">
                        {player.goals}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
