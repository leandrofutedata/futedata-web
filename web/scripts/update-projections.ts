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

const TOTAL_ROUNDS = 38

/* ─── xG / xPTS calculation (replicating lib/calculations.ts) ─── */

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

function parseRoundNumber(round: string): number {
  const match = round.match(/(\d+)$/)
  return match ? parseInt(match[1], 10) : 0
}

/* ─── Copa do Brasil model (replicating lib/copa-brasil-model.ts) ─── */

const HISTORICAL_WEIGHT: Record<string, number> = {
  "Flamengo": 95, "Palmeiras": 95, "Corinthians": 92, "Sao Paulo": 92,
  "Gremio": 90, "Internacional": 90, "Cruzeiro": 90,
  "Santos": 88, "Atletico-MG": 88, "Fluminense": 85, "Botafogo": 85,
  "Vasco DA Gama": 83,
  "Atletico Paranaense": 75, "Bahia": 75, "Fortaleza EC": 72,
  "RB Bragantino": 68, "Coritiba": 65,
  "Vitoria": 58, "Remo": 55, "Chapecoense-sc": 52,
  "Mirassol": 50, "Goias": 60, "Ceara": 60, "Juventude": 55,
  "Paysandu": 55, "CRB": 48, "Operario-PR": 45,
  "Athletic Club": 35, "Atletico Goianiense": 50,
  "Novorizontino": 42, "Confiança": 30, "Jacuipense": 15,
  "Barra": 10,
}
const DEFAULT_HISTORICAL_WEIGHT = 25

interface Standing {
  team: string; played: number; wins: number; draws: number; losses: number
  goalsFor: number; goalsAgainst: number; points: number
  xG: number; xGA: number; xPTS: number
  form: ('W' | 'D' | 'L')[]
}

function calcStandings(games: { status: string; home_team: string; away_team: string; home_goals: number | null; away_goals: number | null; date: string }[]): Standing[] {
  const finishedGames = games.filter(g => g.status === 'FT')
  const teamMap = new Map<string, {
    played: number; wins: number; draws: number; losses: number
    goalsFor: number; goalsAgainst: number; points: number
    recentGames: { date: string; result: 'W' | 'D' | 'L' }[]
  }>()

  const getTeam = (name: string) => {
    if (!teamMap.has(name)) {
      teamMap.set(name, { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0, points: 0, recentGames: [] })
    }
    return teamMap.get(name)!
  }

  for (const game of finishedGames) {
    const hg = game.home_goals ?? 0
    const ag = game.away_goals ?? 0
    const home = getTeam(game.home_team)
    const away = getTeam(game.away_team)
    home.played++; away.played++
    home.goalsFor += hg; home.goalsAgainst += ag
    away.goalsFor += ag; away.goalsAgainst += hg

    if (hg > ag) {
      home.wins++; home.points += 3; away.losses++
      home.recentGames.push({ date: game.date, result: 'W' })
      away.recentGames.push({ date: game.date, result: 'L' })
    } else if (hg < ag) {
      away.wins++; away.points += 3; home.losses++
      home.recentGames.push({ date: game.date, result: 'L' })
      away.recentGames.push({ date: game.date, result: 'W' })
    } else {
      home.draws++; home.points += 1; away.draws++; away.points += 1
      home.recentGames.push({ date: game.date, result: 'D' })
      away.recentGames.push({ date: game.date, result: 'D' })
    }
  }

  const standings: Standing[] = []
  for (const [team, data] of teamMap) {
    const xG = estimarXG(data.goalsFor, data.played)
    const xGA = estimarXGA(data.goalsAgainst, data.played)
    const xPTS = calcXPTS(xG, xGA, data.played)
    const form = data.recentGames.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5).map(g => g.result)
    standings.push({ team, played: data.played, wins: data.wins, draws: data.draws, losses: data.losses, goalsFor: data.goalsFor, goalsAgainst: data.goalsAgainst, points: data.points, xG, xGA, xPTS, form })
  }

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.wins !== a.wins) return b.wins - a.wins
    const gdA = a.goalsFor - a.goalsAgainst, gdB = b.goalsFor - b.goalsAgainst
    if (gdB !== gdA) return gdB - gdA
    return a.team.localeCompare(b.team)
  })

  return standings
}

function getLatestFinishedRound(games: { status: string; round: string }[]): number {
  let maxRound = 1
  for (const game of games) {
    if (game.status === 'FT') {
      const round = parseRoundNumber(game.round)
      if (round > maxRound) maxRound = round
    }
  }
  return maxRound
}

/* ═══════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════ */

async function main() {
  console.log("Futedata — Update Projections")
  console.log("==============================\n")

  const rows: {
    competition: string
    entity: string
    round_phase: string
    projected_points: number | null
    zone: string | null
    probability: number | null
    metadata: Record<string, unknown>
  }[] = []

  // ─── 1. Brasileirão projections ───
  console.log("1. Fetching Brasileirão games...")
  const { data: games, error: gamesErr } = await supabase
    .from("games")
    .select("*")
    .order("date", { ascending: true })

  if (gamesErr || !games) {
    console.error("Erro ao buscar jogos:", gamesErr?.message)
  } else {
    const standings = calcStandings(games)
    const currentRound = getLatestFinishedRound(games)

    if (standings.length > 0 && standings[0].played >= 3) {
      const projected = standings
        .map((s, currentIdx) => {
          const remaining = TOTAL_ROUNDS - s.played
          const xPTSPerGame = s.played > 0 ? s.xPTS / s.played : 0
          const projectedPoints = Math.round(s.points + xPTSPerGame * remaining)
          return { ...s, currentPosition: currentIdx + 1, projectedPoints, xPTSPerGame }
        })
        .sort((a, b) => b.projectedPoints - a.projectedPoints)

      projected.forEach((t, i) => {
        const projectedPosition = i + 1
        const zone = projectedPosition <= 4 ? "libertadores"
          : projectedPosition <= 6 ? "pre-libertadores"
          : projectedPosition <= 12 ? "sulamericana"
          : projectedPosition >= 17 ? "rebaixamento"
          : "none"

        rows.push({
          competition: "brasileirao",
          entity: t.team,
          round_phase: `rodada-${currentRound}`,
          projected_points: t.projectedPoints,
          zone,
          probability: null,
          metadata: {
            current_points: t.points,
            current_position: t.currentPosition,
            projected_position: projectedPosition,
            xpts_per_game: Math.round(t.xPTSPerGame * 100) / 100,
            played: t.played,
            delta_position: t.currentPosition - projectedPosition,
          },
        })
      })
      console.log(`   ✓ ${projected.length} times projetados (rodada ${currentRound})`)
    } else {
      console.log("   ⚠ Dados insuficientes para projeção")
    }

    // ─── 2. Copa do Brasil projections ───
    console.log("\n2. Fetching Copa do Brasil games...")
    const { data: copaGames, error: copaErr } = await supabase
      .from("copa_brasil_games")
      .select("*")
      .order("fase_ordem", { ascending: true })
      .order("date", { ascending: true })

    if (copaErr || !copaGames) {
      console.error("Erro ao buscar Copa do Brasil:", copaErr?.message)
    } else {
      // Find active phase
      const phases = ["Final", "Semifinal", "Quartas de Final", "Oitavas de Final", "3a Fase", "2a Fase", "1a Fase"]
      const activeFase = phases.find(p => copaGames.some((g: { fase: string; status: string }) => g.fase === p && g.status !== "FT"))
        || phases.find(p => copaGames.some((g: { fase: string }) => g.fase === p)) || ""

      if (activeFase) {
        const faseGames = copaGames.filter((g: { fase: string }) => g.fase === activeFase)

        // Group into confrontos
        const confrontoMap = new Map<string, typeof faseGames>()
        for (const g of faseGames) {
          const teams = [g.home_team_id, g.away_team_id].sort((a: number, b: number) => a - b)
          const key = `${g.fase}__${teams[0]}__${teams[1]}`
          if (!confrontoMap.has(key)) confrontoMap.set(key, [])
          confrontoMap.get(key)!.push(g)
        }

        for (const [, legs] of confrontoMap) {
          legs.sort((a: { date: string }, b: { date: string }) => a.date.localeCompare(b.date))
          const first = legs[0]

          let aggHome = 0, aggAway = 0
          let allFinished = true, anyPlayed = false

          for (const leg of legs) {
            if (leg.status === "FT") {
              anyPlayed = true
              if (leg.home_team_id === first.home_team_id) {
                aggHome += leg.home_score ?? 0; aggAway += leg.away_score ?? 0
              } else {
                aggHome += leg.away_score ?? 0; aggAway += leg.home_score ?? 0
              }
            } else { allFinished = false }
          }

          if (allFinished && anyPlayed) continue // Already finished

          // Calculate probabilities
          const hHist = HISTORICAL_WEIGHT[first.home_team] ?? DEFAULT_HISTORICAL_WEIGHT
          const aHist = HISTORICAL_WEIGHT[first.away_team] ?? DEFAULT_HISTORICAL_WEIGHT
          const histFactor = hHist / ((hHist + aHist) || 1)

          // Brasileirão performance
          const hStanding = standings.find(s => s.team === first.home_team)
          const aStanding = standings.find(s => s.team === first.away_team)
          const hStr = hStanding ? Math.round(((standings.length - standings.indexOf(hStanding)) / standings.length) * 50 + 25) : Math.round(hHist * 0.4 + 10)
          const aStr = aStanding ? Math.round(((standings.length - standings.indexOf(aStanding)) / standings.length) * 50 + 25) : Math.round(aHist * 0.4 + 10)
          const brFactor = hStr / ((hStr + aStr) || 1)

          // Home advantage
          let homeFactor = 0.5
          const status = (!allFinished && !anyPlayed) ? "futuro" : "em-andamento"
          if (status === "futuro") homeFactor = 0.62

          // Aggregate
          let aggFactor = 0.5
          if (status === "em-andamento") {
            const diff = aggHome - aggAway
            aggFactor = 1 / (1 + Math.exp(-diff * 0.8))
          }

          const homeClassify = Math.max(0.03, Math.min(0.97,
            histFactor * 0.40 + brFactor * 0.35 + homeFactor * 0.15 + aggFactor * 0.10
          ))

          rows.push({
            competition: "copa-brasil",
            entity: first.home_team,
            round_phase: activeFase,
            projected_points: null,
            zone: null,
            probability: Math.round(homeClassify * 10000) / 100,
            metadata: { opponent: first.away_team, strength_index: hStr, aggregate: `${aggHome}-${aggAway}`, status },
          })

          rows.push({
            competition: "copa-brasil",
            entity: first.away_team,
            round_phase: activeFase,
            projected_points: null,
            zone: null,
            probability: Math.round((1 - homeClassify) * 10000) / 100,
            metadata: { opponent: first.home_team, strength_index: aStr, aggregate: `${aggAway}-${aggHome}`, status },
          })
        }
        console.log(`   ✓ ${rows.filter(r => r.competition === "copa-brasil").length} projeções da Copa do Brasil (${activeFase})`)
      }
    }
  }

  // ─── 3. Copa do Mundo projections ───
  console.log("\n3. Fetching Copa do Mundo stats...")
  const { data: wcStats, error: wcErr } = await supabase
    .from("wc_team_stats")
    .select("*")
    .order("probability_champion", { ascending: false })

  if (wcErr || !wcStats) {
    console.error("Erro ao buscar wc_team_stats:", wcErr?.message)
  } else {
    for (const team of wcStats) {
      rows.push({
        competition: "copa-mundo",
        entity: team.team_name,
        round_phase: "group-stage",
        projected_points: null,
        zone: null,
        probability: team.probability_advance,
        metadata: {
          probability_champion: team.probability_champion,
          group: team.wc_group,
          fifa_ranking: team.fifa_ranking,
          confederation: team.confederation,
        },
      })
    }
    console.log(`   ✓ ${wcStats.length} seleções projetadas`)
  }

  // ─── 4. Upsert to projections table ───
  console.log(`\n4. Upserting ${rows.length} rows to projections table...`)

  if (rows.length === 0) {
    console.log("   ⚠ Nenhuma projeção para inserir")
    return
  }

  // Batch upsert in chunks of 50
  const CHUNK_SIZE = 50
  let inserted = 0
  let errors = 0

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE)
    const { error } = await supabase
      .from("projections")
      .upsert(chunk, { onConflict: "competition,entity,round_phase" })

    if (error) {
      console.error(`   ✗ Erro no batch ${Math.floor(i / CHUNK_SIZE) + 1}:`, error.message)
      errors++
    } else {
      inserted += chunk.length
    }
  }

  console.log(`\n==============================`)
  console.log(`Concluido! ${inserted} rows inseridas, ${errors} erros`)
}

main().catch(err => {
  console.error("Erro fatal:", err)
  process.exit(1)
})
