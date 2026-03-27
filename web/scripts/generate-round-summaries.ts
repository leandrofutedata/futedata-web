import { config } from "dotenv"
import { resolve } from "path"
import { createClient } from "@supabase/supabase-js"
import Anthropic from "@anthropic-ai/sdk"

config({ path: resolve(__dirname, "..", ".env.local") })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || ""

if (!ANTHROPIC_API_KEY) {
  console.error("ANTHROPIC_API_KEY nao definida no .env.local")
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Credenciais do Supabase nao encontradas no .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

interface Game {
  id: number
  round: string
  status: string
  home_team: string
  away_team: string
  home_goals: number | null
  away_goals: number | null
  home_xg: number | null
  away_xg: number | null
}

interface TeamStanding {
  team: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  points: number
  xG: number
  xGA: number
  xPTS: number
  deltaPTS: number
}

function parseRoundNumber(round: string): number {
  const match = round.match(/(\d+)$/)
  return match ? parseInt(match[1]) : 0
}

function estimarXG(gols: number, jogos: number): number {
  if (jogos === 0) return 0
  const mediaPorJogo = gols / jogos
  const mediaLeague = 1.15
  return Math.round((mediaPorJogo * 0.82 + mediaLeague * 0.18) * jogos * 10) / 10
}

function estimarXGA(gc: number, jogos: number): number {
  if (jogos === 0) return 0
  const mediaPorJogo = gc / jogos
  const mediaLeague = 1.15
  return Math.round((mediaPorJogo * 0.82 + mediaLeague * 0.18) * jogos * 10) / 10
}

function calcXPTS(xg: number, xga: number, jogos: number): number {
  if (jogos === 0) return 0
  const xgPorJogo = xg / jogos
  const xgaPorJogo = xga / jogos
  const ratio = xgPorJogo / (xgPorJogo + xgaPorJogo + 0.001)
  const xPTSporJogo = ratio * 2.85 + 0.05
  return Math.round(xPTSporJogo * jogos * 10) / 10
}

function calcStandings(games: Game[]): TeamStanding[] {
  const finished = games.filter(g => g.status === "FT")
  const teamMap = new Map<string, { played: number; wins: number; draws: number; losses: number; goalsFor: number; goalsAgainst: number; points: number }>()

  const getTeam = (name: string) => {
    if (!teamMap.has(name)) {
      teamMap.set(name, { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0 })
    }
    return teamMap.get(name)!
  }

  for (const game of finished) {
    const hg = game.home_goals ?? 0
    const ag = game.away_goals ?? 0
    const home = getTeam(game.home_team)
    const away = getTeam(game.away_team)

    home.played++; away.played++
    home.goalsFor += hg; home.goalsAgainst += ag
    away.goalsFor += ag; away.goalsAgainst += hg

    if (hg > ag) { home.wins++; home.points += 3; away.losses++ }
    else if (hg < ag) { away.wins++; away.points += 3; home.losses++ }
    else { home.draws++; home.points += 1; away.draws++; away.points += 1 }
  }

  const standings: TeamStanding[] = []
  for (const [team, data] of teamMap) {
    const xG = estimarXG(data.goalsFor, data.played)
    const xGA = estimarXGA(data.goalsAgainst, data.played)
    const xPTS = calcXPTS(xG, xGA, data.played)
    const deltaPTS = Math.round((data.points - xPTS) * 10) / 10
    standings.push({ team, ...data, xG, xGA, xPTS, deltaPTS })
  }

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.wins !== a.wins) return b.wins - a.wins
    const gdA = a.goalsFor - a.goalsAgainst, gdB = b.goalsFor - b.goalsAgainst
    if (gdB !== gdA) return gdB - gdA
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.team.localeCompare(b.team)
  })

  return standings
}

async function fetchAllGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from("games")
    .select("id, round, status, home_team, away_team, home_goals, away_goals, home_xg, away_xg")
    .order("date", { ascending: true })

  if (error) {
    console.error("Erro buscando jogos:", error.message)
    return []
  }
  return data as Game[]
}

async function getCachedInsight(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from("ai_insights")
    .select("content")
    .eq("key", key)
    .single()

  if (error || !data) return null
  return data.content
}

async function setCachedInsight(key: string, content: string): Promise<void> {
  await supabase
    .from("ai_insights")
    .upsert(
      { key, content, created_at: new Date().toISOString() },
      { onConflict: "key" }
    )
}

const EDITORIAL_SYSTEM = `Você é um colunista esportivo brasileiro especialista em estatísticas avançadas. Escreva como um colunista do The Athletic — opinativo, apaixonado, inteligente.

Regras:
- Use EXATAMENTE o formato com os marcadores: MANCHETE:, LIDE:, ANÁLISE PRINCIPAL:, CONCLUSÃO:
- NÃO liste resultados um por um — ANALISE, INTERPRETE, OPINE
- Cite dados reais: xG, xPTS, ±PTS, posição na tabela
- Português brasileiro natural e fluente
- Sem emojis, sem aspas, sem bullet points no corpo do texto
- Cada parágrafo da análise deve ter 3-5 frases
- A manchete deve ser curta (máximo 10 palavras) e provocativa, em MAIÚSCULAS`

async function generateEditorial(roundNumber: number, roundGames: Game[], standings: TeamStanding[]): Promise<string> {
  const gamesText = roundGames.map(g => {
    const hg = g.home_goals ?? 0
    const ag = g.away_goals ?? 0
    const hxg = g.home_xg?.toFixed(1) ?? "?"
    const axg = g.away_xg?.toFixed(1) ?? "?"
    const hPos = standings.findIndex(s => s.team === g.home_team) + 1
    const aPos = standings.findIndex(s => s.team === g.away_team) + 1
    return `${g.home_team} (${hPos}º) ${hg}×${ag} ${g.away_team} (${aPos}º) — xG: ${hxg} vs ${axg}`
  }).join("\n")

  const standingsText = standings.slice(0, 10).map((t, i) =>
    `${i + 1}. ${t.team} ${t.points}pts (${t.wins}V ${t.draws}E ${t.losses}D) xG:${t.xG.toFixed(1)} xGA:${t.xGA.toFixed(1)} xPTS:${t.xPTS.toFixed(1)} ±PTS:${t.deltaPTS > 0 ? "+" : ""}${t.deltaPTS.toFixed(1)}`
  ).join("\n")

  const userPrompt = `DADOS DA RODADA ${roundNumber} DO BRASILEIRÃO 2026:

JOGOS:
${gamesText}

CLASSIFICAÇÃO (top 10 após rodada ${roundNumber}):
${standingsText}

Escreva um texto editorial completo seguindo EXATAMENTE este formato:

MANCHETE: [frase curta, provocativa, máximo 10 palavras, em CAPS]

LIDE: [parágrafo de 2-3 frases capturando a essência da rodada]

ANÁLISE PRINCIPAL:
[Parágrafo 1: o jogo mais importante e seu significado na tabela]

[Parágrafo 2: a surpresa da rodada — resultado inesperado]

[Parágrafo 3: o time que mais impressionou pelos dados (xG, xPTS)]

[Parágrafo 4: o time que decepcionou]

CONCLUSÃO: [1 parágrafo sobre o que essa rodada significa para o restante da temporada]`

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1200,
    system: EDITORIAL_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  })

  return response.content[0].type === "text" ? response.content[0].text : ""
}

function extractHeadline(text: string): string {
  const lines = text.split("\n")
  for (const line of lines) {
    const trimmed = line.trim()
    const upper = trimmed.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
    if (upper.startsWith("MANCHETE:")) {
      return trimmed.substring(trimmed.indexOf(":") + 1).trim()
    }
  }
  return text.split("\n")[0]?.trim() || "(sem manchete)"
}

async function main() {
  console.log("Futedata — Round Editorial Generation")
  console.log("======================================\n")

  const allGames = await fetchAllGames()
  if (allGames.length === 0) {
    console.log("Nenhum jogo encontrado.")
    return
  }

  // Group finished games by round
  const roundMap = new Map<number, Game[]>()
  for (const g of allGames) {
    if (g.status !== "FT") continue
    const round = parseRoundNumber(g.round)
    if (round <= 0) continue
    if (!roundMap.has(round)) roundMap.set(round, [])
    roundMap.get(round)!.push(g)
  }

  const rounds = Array.from(roundMap.keys()).sort((a, b) => a - b)
  console.log(`Rodadas finalizadas: ${rounds.join(", ")}\n`)

  // CLI args: specific rounds to process
  const targetRounds = process.argv.slice(2).map(Number).filter(n => n > 0)
  const roundsToProcess = targetRounds.length > 0 ? targetRounds : rounds

  let generated = 0

  for (const round of roundsToProcess) {
    const key = `round-editorial-${round}`
    const roundGames = roundMap.get(round)

    if (!roundGames || roundGames.length === 0) {
      console.log(`Rodada ${round}: sem jogos finalizados`)
      continue
    }

    // Check cache (skip if already generated and not explicitly targeting)
    const existing = await getCachedInsight(key)
    if (existing && !targetRounds.length) {
      const headline = extractHeadline(existing)
      console.log(`Rodada ${round}: ✓ "${headline}"`)
      continue
    }

    // Compute standings up to this round
    const gamesUpToRound = allGames.filter(g =>
      g.status === "FT" && parseRoundNumber(g.round) <= round
    )
    const standings = calcStandings(gamesUpToRound)

    console.log(`Rodada ${round}: gerando editorial (${roundGames.length} jogos)...`)

    try {
      const editorial = await generateEditorial(round, roundGames, standings)
      if (editorial) {
        await setCachedInsight(key, editorial)
        const headline = extractHeadline(editorial)
        generated++
        console.log(`  → "${headline}"`)
      } else {
        console.log(`  ✗ Resposta vazia`)
      }
    } catch (err) {
      console.error(`  ✗ Erro:`, err)
    }

    // Pause between API calls
    await new Promise(r => setTimeout(r, 1500))
  }

  console.log(`\n======================================`)
  console.log(`Concluido! ${generated} editoriais gerados.`)
}

main().catch(err => {
  console.error("Erro fatal:", err)
  process.exit(1)
})
