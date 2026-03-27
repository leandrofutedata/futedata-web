import { config } from "dotenv"
import { resolve } from "path"
import { createClient } from "@supabase/supabase-js"

config({ path: resolve(__dirname, "..", ".env.local") })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Credenciais do Supabase nao encontradas no .env.local")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// Transfermarkt API (open source): https://github.com/felipeall/transfermarkt-api
const TM_API_BASE = "https://transfermarkt-api.fly.dev"

// Mapping: apiId (API Football) -> transfermarktId
const TEAMS = [
  { name: "Flamengo", apiId: 127, tmId: "614" },
  { name: "Palmeiras", apiId: 121, tmId: "1023" },
  { name: "Atletico-MG", apiId: 1062, tmId: "330" },
  { name: "Fluminense", apiId: 124, tmId: "2462" },
  { name: "Botafogo", apiId: 120, tmId: "537" },
  { name: "Sao Paulo", apiId: 126, tmId: "585" },
  { name: "Corinthians", apiId: 131, tmId: "199" },
  { name: "Internacional", apiId: 119, tmId: "6600" },
  { name: "Gremio", apiId: 130, tmId: "210" },
  { name: "Athletico-PR", apiId: 134, tmId: "679" },
  { name: "Cruzeiro", apiId: 135, tmId: "609" },
  { name: "Vasco", apiId: 133, tmId: "2388" },
  { name: "Bahia", apiId: 118, tmId: "2036" },
  { name: "Santos", apiId: 128, tmId: "1062" },
  { name: "RB Bragantino", apiId: 794, tmId: "7211" },
  { name: "Vitoria", apiId: 136, tmId: "2406" },
  { name: "Mirassol", apiId: 7848, tmId: "43939" },
  { name: "Chapecoense", apiId: 132, tmId: "12272" },
  { name: "Coritiba", apiId: 147, tmId: "2231" },
  { name: "Remo", apiId: 1198, tmId: "12335" },
]

interface TmPlayer {
  id: string
  name: string
  position: string
  dateOfBirth: string
  nationality: string[]
  marketValue: { value: number; currency: string } | null
}

function parseMarketValue(mv: { value: number; currency: string } | null): { value: number | null; currency: string } {
  if (!mv || !mv.value) return { value: null, currency: "EUR" }
  return { value: mv.value, currency: mv.currency || "EUR" }
}

async function fetchTmPlayers(tmId: string): Promise<TmPlayer[]> {
  const url = `${TM_API_BASE}/clubs/${tmId}/players`
  const response = await fetch(url, {
    headers: { "User-Agent": "Futedata/1.0" },
  })

  if (!response.ok) {
    throw new Error(`TM API error for club ${tmId}: ${response.status} ${response.statusText}`)
  }

  const data = await response.json()
  return data.players || data || []
}

async function populateMarketValues() {
  console.log("Futedata — Market Values Population Script (Transfermarkt)")
  console.log("==========================================================\n")

  let successCount = 0

  for (let i = 0; i < TEAMS.length; i++) {
    const team = TEAMS[i]

    try {
      const players = await fetchTmPlayers(team.tmId)

      if (!players || players.length === 0) {
        console.log(`[${i + 1}/${TEAMS.length}] ${team.name}: sem dados`)
        continue
      }

      const rows = players.map((p: TmPlayer) => {
        const { value, currency } = parseMarketValue(p.marketValue)
        return {
          team_id: team.apiId,
          player_name: p.name,
          position: p.position || null,
          market_value: value,
          currency,
        }
      }).filter(r => r.market_value !== null)

      if (rows.length > 0) {
        // Delete existing values for this team
        await supabase.from("market_values").delete().eq("team_id", team.apiId)

        const { error } = await supabase.from("market_values").insert(rows)

        if (error) {
          console.error(`Erro inserindo valores do ${team.name}:`, error.message)
        } else {
          const totalValue = rows.reduce((sum, r) => sum + (r.market_value || 0), 0)
          console.log(`[${i + 1}/${TEAMS.length}] ${team.name}: ${rows.length} jogadores, total: €${(totalValue / 1_000_000).toFixed(1)}M`)
          successCount++
        }
      }

      // Be polite: 2s pause between requests
      if (i + 1 < TEAMS.length) {
        await new Promise((r) => setTimeout(r, 2000))
      }
    } catch (err) {
      console.error(`Erro buscando valores do ${team.name}:`, err)
    }
  }

  console.log(`\nConcluido! ${successCount} times processados.`)
}

populateMarketValues().catch((err) => {
  console.error("Erro fatal:", err)
  process.exit(1)
})
