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
  const standingsData = standings.map((t, i) =>
    `${i + 1}. ${t.team} — ${t.points}pts, ${t.wins}V ${t.draws}E ${t.losses}D, GP:${t.goalsFor} GC:${t.goalsAgainst} SG:${t.goalDifference}, xG:${t.xG.toFixed(1)}, xGA:${t.xGA.toFixed(1)}, xPTS:${t.xPTS.toFixed(1)}, ±PTS:${t.deltaPTS > 0 ? '+' : ''}${t.deltaPTS.toFixed(1)}, forma:${t.form.join('')}`
  ).join('\n')

  const standingsInsight = await generateInsight(
    `standings-narrativa-rodada-${currentRound}`,
    `Classificação completa do Brasileirão 2026 após a Rodada ${currentRound}:\n${standingsData}\n\nEscreva uma análise editorial da rodada seguindo EXATAMENTE esta estrutura:\n1. Destaque o líder e explique se merece ou não a liderança (compare PTS com xPTS)\n2. Aponte a surpresa positiva — time com maior ±PTS positivo, que está acima do esperado\n3. Aponte a decepção — time com xG alto mas posição real ruim, ou ±PTS muito negativo\n4. Mencione uma tendência ou confronto interessante baseado na forma recente\n\nUse dados concretos (números) em cada ponto. Tom de colunista esportivo inteligente.`,
    {
      maxTokens: 600,
      systemPrompt: `Você é o principal colunista de dados do futebol brasileiro. Escreva análises editoriais que combinam dados com narrativa envolvente.
Regras:
- Exatamente 4-6 frases
- Tom direto, opinativo, engajante — como coluna de jornal esportivo
- SEMPRE cite números concretos (xG, xPTS, ±PTS, posição)
- Português brasileiro natural e fluente
- Não use aspas, não se apresente, não use bullet points — texto corrido
- Termine com uma frase provocativa tipo "Fique de olho." ou "Os dados não mentem."`
    }
  )

  return (
    <HomeClient
      games={games}
      articles={articles}
      playerStats={playerStats}
      standingsInsight={standingsInsight}
    />
  )
}
