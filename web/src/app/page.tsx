import { fetchAllGames, fetchArticles, fetchPlayerStats } from "@/lib/data"
import { HomeClient } from "@/components/HomeClient"
import { calcStandings } from "@/lib/calculations"
import { generateInsight } from "@/lib/ai"
import { getLatestFinishedRound } from "@/lib/data"

export const revalidate = 60

export default async function HomePage() {
  const [games, articles, playerStats] = await Promise.all([
    fetchAllGames(),
    fetchArticles(),
    fetchPlayerStats(),
  ])

  // Generate standings insight server-side
  const standings = calcStandings(games)
  const currentRound = getLatestFinishedRound(games)
  const top6 = standings.slice(0, 6)
  const dataContext = `Analise a classificação atual do Brasileirão 2026 (Rodada ${currentRound}):
${top6.map((t, i) => `${i + 1}. ${t.team} — ${t.points}pts, ${t.wins}V ${t.draws}E ${t.losses}D, xG: ${t.xG.toFixed(1)}, xGA: ${t.xGA.toFixed(1)}, xPTS: ${t.xPTS.toFixed(1)}, ±PTS: ${t.deltaPTS > 0 ? '+' : ''}${t.deltaPTS.toFixed(1)}, forma: ${t.form.join('')}`).join('\n')}

Destaque algo surpreendente, uma tendência ou um time que está performando acima/abaixo do esperado.`

  const standingsInsight = await generateInsight(`standings-rodada-${currentRound}`, dataContext)

  return (
    <HomeClient
      games={games}
      articles={articles}
      playerStats={playerStats}
      standingsInsight={standingsInsight}
    />
  )
}
