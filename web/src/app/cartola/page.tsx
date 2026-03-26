import { fetchAllGames, fetchPlayerStats, fetchCartolaPlayers, getLatestFinishedRound } from "@/lib/data"
import { CartolaClient } from "@/components/CartolaClient"
import { generateInsight } from "@/lib/ai"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cartola FC — Futedata",
  description: "Recomendacoes inteligentes para o Cartola FC baseadas em estatisticas reais do Brasileirao.",
}

export const revalidate = 60

export default async function CartolaPage() {
  const [games, playerStats, cartolaPlayers] = await Promise.all([
    fetchAllGames(),
    fetchPlayerStats(),
    fetchCartolaPlayers(),
  ])

  const currentRound = getLatestFinishedRound(games)

  // Build context for Cartola insight
  // Get top players by rating
  const playerMap = new Map<number, { name: string; team: string; pos: string; goals: number; assists: number; games: number; ratings: number[] }>()
  for (const s of playerStats) {
    if (!playerMap.has(s.player_id)) {
      playerMap.set(s.player_id, { name: s.player_name, team: s.team, pos: s.position, goals: 0, assists: 0, games: 0, ratings: [] })
    }
    const p = playerMap.get(s.player_id)!
    p.goals += s.goals
    p.assists += s.assists
    p.games++
    if (s.rating) p.ratings.push(s.rating)
  }
  const topPlayers = Array.from(playerMap.values())
    .filter(p => p.games >= 3 && p.ratings.length > 0)
    .map(p => ({ ...p, avgRating: p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 8)

  const dataContext = `Dê dicas para a próxima rodada (${currentRound + 1}) do Cartola FC baseado nos jogadores que mais se destacaram até agora:
${topPlayers.map((p, i) => `${i + 1}. ${p.name} (${p.team}, ${p.pos}) — Nota média: ${p.avgRating.toFixed(1)}, ${p.goals} gols, ${p.assists} assistências em ${p.games} jogos`).join('\n')}

Destaque quem está em grande fase e vale escalar. Tom direto de quem manja de Cartola.`

  const cartolaInsight = await generateInsight(`cartola-rodada-${currentRound}`, dataContext)

  return (
    <CartolaClient
      games={games}
      playerStats={playerStats}
      cartolaPlayers={cartolaPlayers}
      cartolaInsight={cartolaInsight}
    />
  )
}
