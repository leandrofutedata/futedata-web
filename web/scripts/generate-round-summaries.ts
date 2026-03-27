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

function parseRoundNumber(round: string): number {
  const match = round.match(/(\d+)$/)
  return match ? parseInt(match[1]) : 0
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

async function generateSummary(roundNumber: number, roundData: string): Promise<string> {
  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 500,
    system: `Você é o editor-chefe de uma revista de dados do futebol brasileiro.
Regras:
- SIGA O FORMATO EXATAMENTE como pedido (TITULO:, DESTAQUE 1:, etc.)
- Tom de colunista inteligente e provocativo
- SEMPRE cite dados concretos (placar, xG, diferença)
- Português brasileiro natural
- Sem aspas, sem emojis`,
    messages: [
      {
        role: "user",
        content: `Resultados da Rodada ${roundNumber} do Brasileirão 2026:\n${roundData}\n\nEscreva uma análise editorial da rodada no formato EXATO abaixo:\nTITULO: [título forte e opinativo em 1 frase, não neutro]\nDESTAQUE 1: [resultado + dado xG + interpretação em 2 frases]\nDESTAQUE 2: [resultado + dado xG + interpretação em 2 frases]\nDESTAQUE 3: [resultado + dado xG + interpretação em 2 frases]\nJOGADA DOS DADOS: [algo que os números revelam que passou despercebido, 2 frases]`,
      },
    ],
  })

  return response.content[0].type === "text" ? response.content[0].text : ""
}

async function main() {
  console.log("Futedata — Round Summary Generation Script")
  console.log("==========================================\n")

  const games = await fetchAllGames()
  if (games.length === 0) {
    console.log("Nenhum jogo encontrado.")
    return
  }

  // Find all rounds with finished games
  const roundMap = new Map<number, Game[]>()
  for (const g of games) {
    if (g.status !== "FT") continue
    const round = parseRoundNumber(g.round)
    if (round <= 0) continue
    if (!roundMap.has(round)) roundMap.set(round, [])
    roundMap.get(round)!.push(g)
  }

  const rounds = Array.from(roundMap.keys()).sort((a, b) => a - b)
  console.log(`Rodadas finalizadas encontradas: ${rounds.join(", ")}\n`)

  // Check which rounds are specified via CLI args, or do all
  const targetRounds = process.argv.slice(2).map(Number).filter(n => n > 0)
  const roundsToProcess = targetRounds.length > 0 ? targetRounds : rounds

  let generated = 0

  for (const round of roundsToProcess) {
    const key = `round-summary-${round}`
    const roundGames = roundMap.get(round)

    if (!roundGames || roundGames.length === 0) {
      console.log(`Rodada ${round}: sem jogos finalizados`)
      continue
    }

    // Check if already cached
    const existing = await getCachedInsight(key)
    if (existing && !targetRounds.length) {
      console.log(`Rodada ${round}: ja tem resumo (${existing.length} chars)`)
      continue
    }

    // Generate summary
    const roundData = roundGames
      .map((g) => {
        const hg = g.home_goals ?? 0
        const ag = g.away_goals ?? 0
        const hxg = g.home_xg?.toFixed(1) ?? "?"
        const axg = g.away_xg?.toFixed(1) ?? "?"
        return `${g.home_team} ${hg}x${ag} ${g.away_team} (xG: ${hxg} vs ${axg})`
      })
      .join("\n")

    console.log(`Rodada ${round}: gerando resumo (${roundGames.length} jogos)...`)

    try {
      const summary = await generateSummary(round, roundData)
      if (summary) {
        await setCachedInsight(key, summary)
        generated++
        console.log(`  OK (${summary.length} chars)`)
      } else {
        console.log(`  Resposta vazia`)
      }
    } catch (err) {
      console.error(`  Erro:`, err)
    }

    // Small pause between API calls
    await new Promise((r) => setTimeout(r, 1000))
  }

  console.log(`\nConcluido! ${generated} resumos gerados.`)
}

main().catch((err) => {
  console.error("Erro fatal:", err)
  process.exit(1)
})
