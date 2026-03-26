import { config } from "dotenv"
import { resolve } from "path"
import { createClient } from "@supabase/supabase-js"

// Carrega .env.local do diretorio web/ e .env da raiz (service key)
config({ path: resolve(__dirname, "..", ".env.local") })
config({ path: resolve(__dirname, "..", "..", ".env") })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
// Prefere service key para escrita
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const API_KEY = process.env.RAPIDAPI_KEY || ""

if (!API_KEY) {
  console.error("RAPIDAPI_KEY nao definida no .env.local")
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Credenciais Supabase nao encontradas")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const LEAGUE_ID = 73 // Copa do Brasil
const SEASON = 2026

interface ApiFixture {
  fixture: {
    id: number
    date: string
    status: { short: string; long: string }
  }
  league: {
    id: number
    round: string
    season: number
  }
  teams: {
    home: { id: number; name: string; logo: string }
    away: { id: number; name: string; logo: string }
  }
  goals: {
    home: number | null
    away: number | null
  }
}

function mapFase(round: string): { fase: string; fase_ordem: number; jogo_ida_volta: string } {
  const r = round.toLowerCase()

  // Detect ida/volta from leg indicators
  let jogo_ida_volta = "unico"
  if (r.includes("1st leg")) jogo_ida_volta = "ida"
  else if (r.includes("2nd leg")) jogo_ida_volta = "volta"

  // API-Football uses formats like:
  // "1/256-finals", "1/128-finals", "Round of 128", "Round of 64",
  // "Round of 32", "Round of 16", "Quarter-finals", "Semi-finals", "Final"
  if (r === "final") return { fase: "Final", fase_ordem: 7, jogo_ida_volta }
  if (r.includes("semi")) return { fase: "Semifinal", fase_ordem: 6, jogo_ida_volta }
  if (r.includes("quarter")) return { fase: "Quartas de Final", fase_ordem: 5, jogo_ida_volta }
  if (r.includes("round of 16") || r.includes("1/8")) return { fase: "Oitavas de Final", fase_ordem: 4, jogo_ida_volta }
  if (r.includes("round of 32") || r.includes("1/16")) return { fase: "3a Fase", fase_ordem: 3, jogo_ida_volta }
  if (r.includes("round of 64") || r.includes("1/32")) return { fase: "2a Fase", fase_ordem: 2, jogo_ida_volta }
  if (r.includes("round of 128") || r.includes("1/64")) return { fase: "1a Fase", fase_ordem: 1, jogo_ida_volta }
  if (r.includes("1/128")) return { fase: "Fase Preliminar 2", fase_ordem: 0, jogo_ida_volta }
  if (r.includes("1/256")) return { fase: "Fase Preliminar 1", fase_ordem: -1, jogo_ida_volta }

  // Fallback
  return { fase: round, fase_ordem: -2, jogo_ida_volta }
}

function mapStatus(apiStatus: string): string {
  const map: Record<string, string> = {
    FT: "FT", AET: "FT", PEN: "FT",
    "1H": "1H", "2H": "2H", HT: "HT",
    NS: "NS", TBD: "NS", PST: "NS", CANC: "CANC", SUSP: "NS",
    INT: "HT", LIVE: "1H",
  }
  return map[apiStatus] || "NS"
}

async function fetchFromApi(endpoint: string, params: Record<string, string>) {
  const url = new URL(`https://v3.football.api-sports.io/${endpoint}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  const response = await fetch(url.toString(), {
    headers: { "x-apisports-key": API_KEY },
  })
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }
  const data = await response.json()
  return data
}

async function main() {
  console.log("Futedata — Copa do Brasil Population Script")
  console.log("============================================\n")

  // 1. Fetch all fixtures
  console.log(`Buscando jogos da Copa do Brasil ${SEASON} (league_id=${LEAGUE_ID})...`)
  const apiResponse = await fetchFromApi("fixtures", {
    league: String(LEAGUE_ID),
    season: String(SEASON),
  })

  const fixtures: ApiFixture[] = apiResponse.response || []
  console.log(`${fixtures.length} jogos encontrados na API\n`)

  if (fixtures.length === 0) {
    console.log("Nenhum jogo encontrado. Verifique se a season esta correta.")
    console.log("Tentando season 2025...")

    const fallback = await fetchFromApi("fixtures", {
      league: String(LEAGUE_ID),
      season: "2025",
    })
    const fallbackFixtures: ApiFixture[] = fallback.response || []
    console.log(`Season 2025: ${fallbackFixtures.length} jogos encontrados`)

    if (fallbackFixtures.length === 0) {
      console.log("\nNenhum dado disponivel. Informacoes da API:")
      const leagueInfo = await fetchFromApi("leagues", { id: String(LEAGUE_ID) })
      console.log(JSON.stringify(leagueInfo.response?.[0]?.seasons?.slice(-3), null, 2))
      return
    }

    // Use fallback
    await insertFixtures(fallbackFixtures)
    return
  }

  await insertFixtures(fixtures)
}

async function insertFixtures(fixtures: ApiFixture[]) {
  let successCount = 0

  for (const fixture of fixtures) {
    const { fase, fase_ordem, jogo_ida_volta } = mapFase(fixture.league.round)
    const status = mapStatus(fixture.fixture.status.short)

    const row = {
      api_game_id: fixture.fixture.id,
      fase,
      fase_ordem,
      jogo_ida_volta,
      home_team: fixture.teams.home.name,
      away_team: fixture.teams.away.name,
      home_team_id: fixture.teams.home.id,
      away_team_id: fixture.teams.away.id,
      home_logo: fixture.teams.home.logo,
      away_logo: fixture.teams.away.logo,
      home_score: fixture.goals.home,
      away_score: fixture.goals.away,
      status,
      date: fixture.fixture.date,
      round: fixture.league.round,
    }

    const { error } = await supabase
      .from("copa_brasil_games")
      .upsert(row, { onConflict: "api_game_id" })

    if (error) {
      console.error(`Erro no jogo ${row.api_game_id}: ${error.message}`)
    } else {
      successCount++
      console.log(`[${successCount}] ${row.home_team} vs ${row.away_team} (${fase} - ${jogo_ida_volta}) ${status === "FT" ? `${row.home_score}x${row.away_score}` : status}`)
    }
  }

  console.log(`\nConcluido! ${successCount}/${fixtures.length} jogos inseridos.`)
}

main().catch((err) => {
  console.error("Erro fatal:", err)
  process.exit(1)
})
