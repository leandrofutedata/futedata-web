import { fetchAllGames, fetchPlayerStatsByTeam } from "@/lib/data"
import { calcStandings } from "@/lib/calculations"
import { TEAMS } from "@/lib/teams"
import { Breadcrumb } from "@/components/Breadcrumb"
import { ComparadorClient } from "@/components/ComparadorClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Comparador de Times — Brasileirão 2026 | Futedata",
  description: "Compare dois times do Brasileirão 2026 lado a lado. Estatísticas, xG, xPTS, forma e análise completa com IA.",
  openGraph: {
    title: "Comparador de Times — Brasileirão 2026",
    description: "Compare dois times lado a lado com xG, xPTS e análise IA.",
    images: [{ url: "/api/og?title=COMPARADOR&subtitle=Brasileir%C3%A3o+2026", width: 1200, height: 630 }],
  },
}

export const revalidate = 300

export default async function CompararPage() {
  const games = await fetchAllGames()
  const standings = calcStandings(games)

  // Pre-fetch all player stats for all teams
  const allPlayerStats = await Promise.all(
    TEAMS.map(async t => ({
      team: t.name,
      stats: await fetchPlayerStatsByTeam(t.name),
    }))
  )

  const playerStatsMap: Record<string, { name: string; goals: number; assists: number; games: number; avgRating: number }[]> = {}
  for (const { team, stats } of allPlayerStats) {
    const map = new Map<number, { name: string; goals: number; assists: number; games: number; ratings: number[] }>()
    for (const s of stats) {
      if (!map.has(s.player_id)) {
        map.set(s.player_id, { name: s.player_name, goals: 0, assists: 0, games: 0, ratings: [] })
      }
      const p = map.get(s.player_id)!
      p.goals += s.goals
      p.assists += s.assists
      p.games++
      if (s.rating) p.ratings.push(s.rating)
    }
    playerStatsMap[team] = Array.from(map.values())
      .filter(p => p.ratings.length >= 2)
      .map(p => ({
        name: p.name,
        goals: p.goals,
        assists: p.assists,
        games: p.games,
        avgRating: p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length,
      }))
      .sort((a, b) => b.avgRating - a.avgRating)
      .slice(0, 5)
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <Breadcrumb items={[{ label: "Comparador" }]} />

      <div className="bg-[var(--color-green-dark)] rounded-xl p-6 md:p-8 shadow-lg mb-8">
        <p className="font-[family-name:var(--font-data)] text-[10px] text-green-300 uppercase tracking-widest mb-1">
          Brasileirão Série A 2026
        </p>
        <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-6xl text-white">
          COMPARADOR
        </h1>
        <p className="text-green-200 text-sm mt-2">
          Selecione dois times para comparar estatísticas lado a lado
        </p>
      </div>

      <ComparadorClient
        standings={standings}
        teams={TEAMS}
        playerStatsMap={playerStatsMap}
      />
    </div>
  )
}
