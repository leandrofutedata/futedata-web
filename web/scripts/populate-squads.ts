import { config } from "dotenv"
import { resolve } from "path"
import { createClient } from "@supabase/supabase-js"

config({ path: resolve(__dirname, "..", ".env.local") })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || ""

if (!RAPIDAPI_KEY) {
  console.error("RAPIDAPI_KEY nao definida no .env.local")
  process.exit(1)
}
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Credenciais do Supabase nao encontradas no .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const TEAMS = [
  { name: "Flamengo", apiId: 127 },
  { name: "Palmeiras", apiId: 121 },
  { name: "Atletico-MG", apiId: 1062 },
  { name: "Fluminense", apiId: 124 },
  { name: "Botafogo", apiId: 120 },
  { name: "Sao Paulo", apiId: 126 },
  { name: "Corinthians", apiId: 131 },
  { name: "Internacional", apiId: 119 },
  { name: "Gremio", apiId: 130 },
  { name: "Athletico-PR", apiId: 134 },
  { name: "Cruzeiro", apiId: 135 },
  { name: "Vasco", apiId: 133 },
  { name: "Bahia", apiId: 118 },
  { name: "Santos", apiId: 128 },
  { name: "RB Bragantino", apiId: 794 },
  { name: "Vitoria", apiId: 136 },
  { name: "Mirassol", apiId: 7848 },
  { name: "Chapecoense", apiId: 132 },
  { name: "Coritiba", apiId: 147 },
  { name: "Remo", apiId: 1198 },
]

interface ApiSquadPlayer {
  id: number
  name: string
  age: number | null
  number: number | null
  position: string
  photo: string | null
}

interface ApiSquadResponse {
  team: { id: number; name: string }
  players: ApiSquadPlayer[]
}

async function fetchFromApi(endpoint: string, params: Record<string, string>) {
  const url = new URL(`https://v3.football.api-sports.io/${endpoint}`)
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }

  const response = await fetch(url.toString(), {
    headers: { "x-apisports-key": RAPIDAPI_KEY },
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.response
}

async function populateSquads() {
  console.log("Futedata — Squad Population Script")
  console.log("===================================\n")

  let successCount = 0

  for (let i = 0; i < TEAMS.length; i++) {
    const team = TEAMS[i]

    try {
      const response: ApiSquadResponse[] = await fetchFromApi("players/squads", {
        team: String(team.apiId),
      })

      if (!response || response.length === 0) {
        console.log(`[${i + 1}/${TEAMS.length}] ${team.name}: sem dados`)
        continue
      }

      const players = response[0].players
      const rows = players.map((p: ApiSquadPlayer) => ({
        team_id: team.apiId,
        player_id: p.id,
        player_name: p.name,
        age: p.age,
        number: p.number,
        position: p.position,
        photo: p.photo,
      }))

      if (rows.length > 0) {
        // Delete existing squad for this team before inserting fresh data
        await supabase.from("squads").delete().eq("team_id", team.apiId)

        const { error } = await supabase.from("squads").insert(rows)

        if (error) {
          console.error(`Erro inserindo elenco do ${team.name}:`, error.message)
        } else {
          successCount++
          console.log(`[${i + 1}/${TEAMS.length}] ${team.name}: ${rows.length} jogadores`)
        }
      }

      // Rate limit: pause every 8 requests
      if ((i + 1) % 8 === 0 && i + 1 < TEAMS.length) {
        console.log(`  Pausa de 65s para respeitar rate limit (${i + 1}/${TEAMS.length})...`)
        await new Promise((r) => setTimeout(r, 65000))
      }
    } catch (err) {
      console.error(`Erro buscando elenco do ${team.name}:`, err)
    }
  }

  console.log(`\nConcluido! ${successCount} times processados.`)
}

populateSquads().catch((err) => {
  console.error("Erro fatal:", err)
  process.exit(1)
})
