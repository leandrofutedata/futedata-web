import { fetchAllGames, fetchArticles, fetchPlayerStats } from "@/lib/data"
import { HomeClient } from "@/components/HomeClient"
import { calcStandings, parseRoundNumber } from "@/lib/calculations"
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

  // Generate round analysis server-side
  const roundGames = games.filter(g =>
    g.status === 'FT' && parseRoundNumber(g.round) === currentRound
  )
  let roundAnalysis = ''
  if (roundGames.length > 0) {
    const roundData = roundGames.map(g => {
      const hg = g.home_goals ?? 0
      const ag = g.away_goals ?? 0
      const hxg = g.home_xg?.toFixed(1) ?? '?'
      const axg = g.away_xg?.toFixed(1) ?? '?'
      return `${g.home_team} ${hg}x${ag} ${g.away_team} (xG: ${hxg} vs ${axg})`
    }).join('\n')

    roundAnalysis = await generateInsight(
      `round-summary-${currentRound}`,
      `Resultados da Rodada ${currentRound} do Brasileirão 2026:\n${roundData}\n\nEscreva uma análise editorial da rodada no formato EXATO abaixo:\nTITULO: [título forte e opinativo em 1 frase, não neutro]\nDESTAQUE 1: [resultado + dado xG + interpretação em 2 frases]\nDESTAQUE 2: [resultado + dado xG + interpretação em 2 frases]\nDESTAQUE 3: [resultado + dado xG + interpretação em 2 frases]\nJOGADA DOS DADOS: [algo que os números revelam que passou despercebido, 2 frases]`,
      {
        maxTokens: 500,
        systemPrompt: `Você é o editor-chefe de uma revista de dados do futebol brasileiro.
Regras:
- SIGA O FORMATO EXATAMENTE como pedido (TITULO:, DESTAQUE 1:, etc.)
- Tom de colunista inteligente e provocativo
- SEMPRE cite dados concretos (placar, xG, diferença)
- Português brasileiro natural
- Sem aspas, sem emojis`
      }
    )
  }

  return (
    <HomeClient
      games={games}
      articles={articles}
      playerStats={playerStats}
      standingsInsight={standingsInsight}
      roundAnalysis={roundAnalysis}
    />
  )
}
