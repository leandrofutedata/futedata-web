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
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("❌ Credenciais do Supabase não encontradas no .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface ApiStatEntry {
  type: string
  value: string | number | null
}

interface ApiTeamStats {
  team: { id: number; name: string }
  statistics: ApiStatEntry[]
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

function parseStatValue(value: string | number | null): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === "number") return value
  // "60%" → 60, "1.50" → 1.5
  const cleaned = String(value).replace("%", "").trim()
  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

function getStatValue(stats: ApiStatEntry[], type: string): number | null {
  const entry = stats.find((s) => s.type === type)
  return entry ? parseStatValue(entry.value) : null
}

async function main() {
  console.log("🏟  Futedata — Game Stats Population Script")
  console.log("============================================\n")

  // Busca jogos FT sem estatísticas (home_possession IS NULL)
  const { data: games, error } = await supabase
    .from("games")
    .select("id, home_team, away_team, raw_json")
    .eq("status", "FT")
    .is("home_possession", null)
    .order("id")

  if (error) {
    console.error("❌ Erro buscando jogos:", error.message)
    process.exit(1)
  }

  if (!games || games.length === 0) {
    console.log("✅ Todos os jogos já possuem estatísticas.")
    return
  }

  console.log(`📋 ${games.length} jogos FT sem estatísticas encontrados\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < games.length; i++) {
    const game = games[i]

    try {
      const response: ApiTeamStats[] = await fetchFromApi("fixtures/statistics", {
        fixture: String(game.id),
      })

      if (!response || response.length < 2) {
        console.log(`  ⚠️  Jogo ${game.id}: sem estatísticas disponíveis`)
        errorCount++
        continue
      }

      // Determina qual entry é home e qual é away
      // Compara team.id da API com raw_json.teams.home.id
      const rawJson = game.raw_json as Record<string, unknown> | null
      const teamsData = rawJson?.teams as { home?: { id?: number }; away?: { id?: number } } | undefined
      const homeTeamId = teamsData?.home?.id

      let homeStats: ApiStatEntry[]
      let awayStats: ApiStatEntry[]

      if (homeTeamId && response[0].team.id === homeTeamId) {
        homeStats = response[0].statistics
        awayStats = response[1].statistics
      } else if (homeTeamId && response[1].team.id === homeTeamId) {
        homeStats = response[1].statistics
        awayStats = response[0].statistics
      } else {
        // Fallback: primeiro entry = home (ordem padrão da API)
        homeStats = response[0].statistics
        awayStats = response[1].statistics
      }

      const updateData = {
        home_possession: getStatValue(homeStats, "Ball Possession"),
        away_possession: getStatValue(awayStats, "Ball Possession"),
        home_shots: getStatValue(homeStats, "Total Shots"),
        away_shots: getStatValue(awayStats, "Total Shots"),
        home_shots_on_target: getStatValue(homeStats, "Shots on Goal"),
        away_shots_on_target: getStatValue(awayStats, "Shots on Goal"),
        home_corners: getStatValue(homeStats, "Corner Kicks"),
        away_corners: getStatValue(awayStats, "Corner Kicks"),
        home_fouls: getStatValue(homeStats, "Fouls"),
        away_fouls: getStatValue(awayStats, "Fouls"),
        home_passes: getStatValue(homeStats, "Total passes"),
        away_passes: getStatValue(awayStats, "Total passes"),
        home_passes_accuracy: getStatValue(homeStats, "Passes %"),
        away_passes_accuracy: getStatValue(awayStats, "Passes %"),
        home_xg: getStatValue(homeStats, "expected_goals"),
        away_xg: getStatValue(awayStats, "expected_goals"),
      }

      const { error: updateError } = await supabase
        .from("games")
        .update(updateData)
        .eq("id", game.id)

      if (updateError) {
        console.error(`  ❌ Jogo ${game.id}: ${updateError.message}`)
        errorCount++
      } else {
        successCount++
        console.log(
          `  ✅ ${game.home_team} vs ${game.away_team} — ` +
          `posse ${updateData.home_possession}%-${updateData.away_possession}%, ` +
          `xG ${updateData.home_xg ?? "?"}-${updateData.away_xg ?? "?"}`
        )
      }

      // Rate limit: pausa de 65s a cada 8 chamadas
      if ((i + 1) % 8 === 0 && i + 1 < games.length) {
        console.log(`\n  ⏳ Pausa de 65s para respeitar rate limit (${i + 1}/${games.length})...\n`)
        await new Promise((r) => setTimeout(r, 65000))
      }
    } catch (err) {
      console.error(`  ❌ Jogo ${game.id}: ${err}`)
      errorCount++
    }
  }

  console.log(`\n✅ Concluído: ${successCount} atualizados, ${errorCount} erros`)

  // Sample final
  const { data: sample } = await supabase
    .from("games")
    .select("id, home_team, away_team, home_possession, home_shots, home_xg")
    .eq("status", "FT")
    .not("home_possession", "is", null)
    .limit(3)

  if (sample && sample.length > 0) {
    console.log("\n📊 Amostra dos dados:")
    for (const s of sample) {
      console.log(`  ${s.home_team} vs ${s.away_team}: posse=${s.home_possession}%, chutes=${s.home_shots}, xG=${s.home_xg}`)
    }
  }
}

main()
