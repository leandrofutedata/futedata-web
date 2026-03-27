import { fetchAllGames, fetchArticles, fetchPlayerStats } from "@/lib/data"
import { HomeClient } from "@/components/HomeClient"
import { calcStandings, parseRoundNumber } from "@/lib/calculations"
import { generateInsight } from "@/lib/ai"
import { getLatestFinishedRound } from "@/lib/data"
import { Breadcrumb } from "@/components/Breadcrumb"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Brasileirão 2026 — Classificação, Jogos e Análises | Futedata",
  description: "Classificação completa, jogos por rodada, xG, xGA, xPTS e análises editoriais do Brasileirão Série A 2026.",
  openGraph: {
    title: "Brasileirão 2026 — Classificação e Análises | Futedata",
    description: "Dados avançados e análises editoriais do Brasileirão Série A 2026.",
    images: [{ url: "/api/og?title=BRASILEIR%C3%83O+2026&subtitle=Classifica%C3%A7%C3%A3o%2C+Jogos+e+An%C3%A1lises", width: 1200, height: 630 }],
  },
}

export const revalidate = 60

export default async function BrasileraoPage() {
  const [games, articles, playerStats] = await Promise.all([
    fetchAllGames(),
    fetchArticles(),
    fetchPlayerStats(),
  ])

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

  const roundGames = games.filter(g =>
    g.status === 'FT' && parseRoundNumber(g.round) === currentRound
  )
  let roundAnalysis = ''
  if (roundGames.length > 0) {
    const gamesContext = roundGames.map(g => {
      const hg = g.home_goals ?? 0
      const ag = g.away_goals ?? 0
      const hxg = g.home_xg?.toFixed(1) ?? '?'
      const axg = g.away_xg?.toFixed(1) ?? '?'
      const hPos = standings.findIndex(s => s.team === g.home_team) + 1
      const aPos = standings.findIndex(s => s.team === g.away_team) + 1
      return `${g.home_team} (${hPos}º) ${hg}×${ag} ${g.away_team} (${aPos}º) — xG: ${hxg} vs ${axg}`
    }).join('\n')

    const standingsContext = standings.slice(0, 10).map((t, i) =>
      `${i + 1}. ${t.team} ${t.points}pts (${t.wins}V ${t.draws}E ${t.losses}D) xG:${t.xG.toFixed(1)} xGA:${t.xGA.toFixed(1)} xPTS:${t.xPTS.toFixed(1)} ±PTS:${t.deltaPTS > 0 ? '+' : ''}${t.deltaPTS.toFixed(1)}`
    ).join('\n')

    roundAnalysis = await generateInsight(
      `round-editorial-${currentRound}`,
      `DADOS DA RODADA ${currentRound} DO BRASILEIRÃO 2026:\n\nJOGOS:\n${gamesContext}\n\nCLASSIFICAÇÃO (top 10 após rodada ${currentRound}):\n${standingsContext}\n\nEscreva um texto editorial completo seguindo EXATAMENTE este formato:\n\nMANCHETE: [frase curta, provocativa, máximo 10 palavras, em CAPS]\n\nLIDE: [parágrafo de 2-3 frases capturando a essência da rodada]\n\nANÁLISE PRINCIPAL:\n[Parágrafo 1: o jogo mais importante e seu significado na tabela]\n\n[Parágrafo 2: a surpresa da rodada — resultado inesperado]\n\n[Parágrafo 3: o time que mais impressionou pelos dados (xG, xPTS)]\n\n[Parágrafo 4: o time que decepcionou]\n\nCONCLUSÃO: [1 parágrafo sobre o que essa rodada significa para o restante da temporada]`,
      {
        maxTokens: 1200,
        systemPrompt: `Você é um colunista esportivo brasileiro especialista em estatísticas avançadas. Escreva como um colunista do The Athletic — opinativo, apaixonado, inteligente.

Regras:
- Use EXATAMENTE o formato com os marcadores: MANCHETE:, LIDE:, ANÁLISE PRINCIPAL:, CONCLUSÃO:
- NÃO liste resultados um por um — ANALISE, INTERPRETE, OPINE
- Cite dados reais: xG, xPTS, ±PTS, posição na tabela
- Português brasileiro natural e fluente
- Sem emojis, sem aspas, sem bullet points no corpo do texto
- Cada parágrafo da análise deve ter 3-5 frases
- A manchete deve ser curta (máximo 10 palavras) e provocativa, em MAIÚSCULAS`
      }
    )
  }

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumb items={[{ label: "Brasileirão" }]} />
      </div>
      <HomeClient
        games={games}
        articles={articles}
        playerStats={playerStats}
        standingsInsight={standingsInsight}
        roundAnalysis={roundAnalysis}
      />
    </>
  )
}
