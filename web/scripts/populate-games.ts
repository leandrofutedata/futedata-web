import { config } from "dotenv"
import { resolve } from "path"
import { createClient } from "@supabase/supabase-js"

// Carrega .env.local do diretório web/
config({ path: resolve(__dirname, "..", ".env.local") })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || ""

if (!RAPIDAPI_KEY) {
  console.error("❌ RAPIDAPI_KEY não definida.")
  console.error("   Edite o arquivo web/.env.local e preencha:")
  console.error("   RAPIDAPI_KEY=sua_chave_aqui")
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Credenciais do Supabase não encontradas no .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const LEAGUE_ID = 71 // Brasileirão Série A
const SEASON = 2026

interface ApiFixture {
  fixture: {
    id: number
    date: string
    status: { short: string }
  }
  league: {
    id: number
    round: string
    season: number
  }
  teams: {
    home: { id: number; name: string }
    away: { id: number; name: string }
  }
  goals: {
    home: number | null
    away: number | null
  }
  score: Record<string, unknown>
}

interface ApiEvent {
  type: string
  detail: string
  player: { id: number; name: string }
  team: { id: number; name: string }
  time: { elapsed: number }
}

async function fetchFromApi(endpoint: string, params: Record<string, string>) {
  const url = new URL(`https://v3.football.api-sports.io/${endpoint}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

 const response = await fetch(url.toString(), {
    headers: {
      "x-apisports-key": RAPIDAPI_KEY,
    },
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.response
}

function mapStatus(apiStatus: string): string {
  const map: Record<string, string> = {
    FT: "FT",
    AET: "FT",
    PEN: "FT",
    "1H": "1H",
    "2H": "2H",
    HT: "HT",
    NS: "NS",
    TBD: "NS",
    PST: "NS",
    CANC: "NS",
    SUSP: "NS",
    INT: "HT",
    LIVE: "1H",
  }
  return map[apiStatus] || "NS"
}

async function populateGames() {
  console.log(`📊 Buscando jogos do Brasileirão ${SEASON}...`)

  const fixtures: ApiFixture[] = await fetchFromApi("fixtures", {
    league: String(LEAGUE_ID),
    season: String(SEASON),
  })

  console.log(`📋 ${fixtures.length} jogos encontrados`)

  let upsertCount = 0
  for (const fixture of fixtures) {
    const game = {
      id: fixture.fixture.id,
      league_id: fixture.league.id,
      season: fixture.league.season,
      round: fixture.league.round,
      date: fixture.fixture.date,
      status: mapStatus(fixture.fixture.status.short),
      home_team: fixture.teams.home.name,
      away_team: fixture.teams.away.name,
      home_goals: fixture.goals.home,
      away_goals: fixture.goals.away,
      home_xg: null,
      away_xg: null,
      raw_json: fixture,
    }

    const { error } = await supabase.from("games").upsert(game, { onConflict: "id" })
    if (error) {
      console.error(`❌ Erro no jogo ${game.id}:`, error.message)
    } else {
      upsertCount++
    }
  }

  console.log(`✅ ${upsertCount} jogos inseridos/atualizados`)
  return fixtures
}

async function populateEvents(fixtures: ApiFixture[]) {
  const finishedFixtures = fixtures.filter(
    (f) => mapStatus(f.fixture.status.short) === "FT"
  )

  console.log(`\n📊 Buscando eventos de ${finishedFixtures.length} jogos finalizados...`)

  let eventCount = 0
  // Process in batches to avoid rate limits
  for (let i = 0; i < finishedFixtures.length; i++) {
    const fixture = finishedFixtures[i]
    const fixtureId = fixture.fixture.id

    try {
      const events: ApiEvent[] = await fetchFromApi("fixtures/events", {
        fixture: String(fixtureId),
      })

      // Update the raw_json with events
      const rawJson = { ...fixture, events }
      const { error } = await supabase
        .from("games")
        .update({ raw_json: rawJson })
        .eq("id", fixtureId)

      if (error) {
        console.error(`❌ Erro atualizando eventos do jogo ${fixtureId}:`, error.message)
      } else {
        eventCount++
      }

      // Rate limit: 10 requests per minute on free tier
      if ((i + 1) % 8 === 0) {
        console.log(`  ⏳ Pausa de 65s para respeitar rate limit (${i + 1}/${finishedFixtures.length})...`)
        await new Promise((r) => setTimeout(r, 65000))
      }
    } catch (err) {
      console.error(`❌ Erro buscando eventos do jogo ${fixtureId}:`, err)
    }
  }

  console.log(`✅ Eventos atualizados para ${eventCount} jogos`)
}

async function main() {
  console.log("🏟  Futedata — Population Script")
  console.log("================================\n")

  try {
    const fixtures = await populateGames()
    await populateEvents(fixtures)
    console.log("\n🎉 Concluído!")
  } catch (err) {
    console.error("❌ Erro fatal:", err)
    process.exit(1)
  }
}

main()
