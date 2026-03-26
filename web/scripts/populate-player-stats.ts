import { config } from "dotenv"
import { resolve } from "path"
import { createClient } from "@supabase/supabase-js"

// Carrega .env.local do diretório web/
config({ path: resolve(__dirname, "..", ".env.local") })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || ""

if (!RAPIDAPI_KEY) {
  console.error("RAPIDAPI_KEY nao definida.")
  console.error("   Edite o arquivo web/.env.local e preencha:")
  console.error("   RAPIDAPI_KEY=sua_chave_aqui")
  process.exit(1)
}

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Credenciais do Supabase nao encontradas no .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

interface ApiPlayerResponse {
  team: { id: number; name: string }
  players: Array<{
    player: { id: number; name: string }
    statistics: Array<{
      games: { minutes: number | null; position: string | null; rating: string | null }
      goals: { total: number | null; assists: number | null; saves: number | null }
      passes: { total: number | null; accuracy: string | null }
      tackles: { total: number | null; interceptions: number | null }
      duels: { won: number | null }
    }>
  }>
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

async function getFinishedGameIds(): Promise<number[]> {
  const { data, error } = await supabase
    .from("games")
    .select("id")
    .eq("status", "FT")

  if (error) {
    console.error("Erro buscando jogos finalizados:", error.message)
    return []
  }

  return (data || []).map((g: { id: number }) => g.id)
}

async function getAlreadyPopulatedGameIds(): Promise<Set<number>> {
  const { data, error } = await supabase
    .from("player_stats")
    .select("game_id")

  if (error) {
    // Tabela pode nao existir ainda
    return new Set()
  }

  const ids = new Set<number>()
  for (const row of data || []) {
    ids.add(row.game_id)
  }
  return ids
}

async function populatePlayerStats() {
  console.log("Futedata — Player Stats Population Script")
  console.log("==========================================\n")

  const allGameIds = await getFinishedGameIds()
  const alreadyPopulated = await getAlreadyPopulatedGameIds()

  const gameIds = allGameIds.filter((id) => !alreadyPopulated.has(id))

  console.log(`Jogos finalizados: ${allGameIds.length}`)
  console.log(`Ja populados: ${alreadyPopulated.size}`)
  console.log(`Pendentes: ${gameIds.length}\n`)

  if (gameIds.length === 0) {
    console.log("Nenhum jogo novo para processar.")
    return
  }

  let successCount = 0

  for (let i = 0; i < gameIds.length; i++) {
    const gameId = gameIds[i]

    try {
      const response: ApiPlayerResponse[] = await fetchFromApi("fixtures/players", {
        fixture: String(gameId),
      })

      const rows: Array<Record<string, unknown>> = []

      for (const teamData of response) {
        const teamName = teamData.team.name

        for (const playerData of teamData.players) {
          const stat = playerData.statistics[0]
          if (!stat) continue

          const passesTotal = stat.passes?.total ?? 0
          const accuracyPct = stat.passes?.accuracy ? parseInt(stat.passes.accuracy) : 0
          const passesAccurate = passesTotal > 0
            ? Math.round((accuracyPct / 100) * passesTotal)
            : 0

          rows.push({
            game_id: gameId,
            player_id: playerData.player.id,
            player_name: playerData.player.name,
            team: teamName,
            goals: stat.goals?.total ?? 0,
            assists: stat.goals?.assists ?? 0,
            minutes_played: stat.games?.minutes ?? 0,
            rating: stat.games?.rating ? parseFloat(stat.games.rating) : null,
            position: stat.games?.position ?? "",
            passes_total: passesTotal,
            passes_accurate: passesAccurate,
            tackles: stat.tackles?.total ?? 0,
            interceptions: stat.tackles?.interceptions ?? 0,
            duels_won: stat.duels?.won ?? 0,
            saves: stat.goals?.saves ?? 0,
          })
        }
      }

      if (rows.length > 0) {
        const { error } = await supabase
          .from("player_stats")
          .upsert(rows, { onConflict: "game_id,player_id" })

        if (error) {
          console.error(`Erro inserindo stats do jogo ${gameId}:`, error.message)
        } else {
          successCount++
          console.log(`[${i + 1}/${gameIds.length}] Jogo ${gameId}: ${rows.length} jogadores`)
        }
      }

      // Rate limit: 10 requests per minute on free tier
      if ((i + 1) % 8 === 0 && i + 1 < gameIds.length) {
        console.log(`  Pausa de 65s para respeitar rate limit (${i + 1}/${gameIds.length})...`)
        await new Promise((r) => setTimeout(r, 65000))
      }
    } catch (err) {
      console.error(`Erro buscando stats do jogo ${gameId}:`, err)
    }
  }

  console.log(`\nConcluido! ${successCount} jogos processados.`)
}

populatePlayerStats().catch((err) => {
  console.error("Erro fatal:", err)
  process.exit(1)
})
