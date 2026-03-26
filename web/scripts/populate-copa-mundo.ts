import { config } from "dotenv"
import { resolve } from "path"
import { createClient } from "@supabase/supabase-js"

// Load env
config({ path: resolve(__dirname, "..", "..", ".env") })
config({ path: resolve(__dirname, "..", ".env.local") })

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || ""
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || ""

if (!RAPIDAPI_KEY) { console.error("RAPIDAPI_KEY missing"); process.exit(1) }
if (!SUPABASE_URL || !SUPABASE_KEY) { console.error("Supabase credentials missing"); process.exit(1) }

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/* ═══════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════ */

const VENUE_CITY: Record<string, { city: string; country: string }> = {
  "Estadio Azteca": { city: "Cidade do Mexico", country: "Mexico" },
  "SoFi Stadium": { city: "Los Angeles", country: "EUA" },
  "MetLife Stadium": { city: "Nova York", country: "EUA" },
  "Gillette Stadium": { city: "Boston", country: "EUA" },
  "NRG Stadium": { city: "Houston", country: "EUA" },
  "Lincoln Financial Field": { city: "Filadelfia", country: "EUA" },
  "Mercedes-Benz Stadium": { city: "Atlanta", country: "EUA" },
  "Lumen Field": { city: "Seattle", country: "EUA" },
  "Hard Rock Stadium": { city: "Miami", country: "EUA" },
  "BMO Field": { city: "Toronto", country: "Canada" },
  "BC Place": { city: "Vancouver", country: "Canada" },
  "Estadio Akron": { city: "Guadalajara", country: "Mexico" },
  "Estadio BBVA Bancomer": { city: "Monterrey", country: "Mexico" },
  "Arrowhead Stadium": { city: "Kansas City", country: "EUA" },
}

const CONFEDERATION: Record<string, string> = {
  "Belgium": "UEFA", "France": "UEFA", "Croatia": "UEFA", "Spain": "UEFA",
  "England": "UEFA", "Switzerland": "UEFA", "Germany": "UEFA", "Portugal": "UEFA",
  "Austria": "UEFA", "Norway": "UEFA", "Scotland": "UEFA", "Netherlands": "UEFA",
  "Brazil": "CONMEBOL", "Uruguay": "CONMEBOL", "Colombia": "CONMEBOL",
  "Ecuador": "CONMEBOL", "Paraguay": "CONMEBOL", "Argentina": "CONMEBOL",
  "Panama": "CONCACAF", "Mexico": "CONCACAF", "USA": "CONCACAF",
  "Haiti": "CONCACAF", "Canada": "CONCACAF", "Curaçao": "CONCACAF",
  "Senegal": "CAF", "Morocco": "CAF", "Egypt": "CAF", "Tunisia": "CAF",
  "Ivory Coast": "CAF", "Ghana": "CAF", "South Africa": "CAF",
  "Algeria": "CAF", "Cape Verde Islands": "CAF",
  "Japan": "AFC", "South Korea": "AFC", "Iran": "AFC", "Australia": "AFC",
  "Saudi Arabia": "AFC", "Qatar": "AFC", "Jordan": "AFC", "Uzbekistan": "AFC",
  "New Zealand": "OFC",
}

// Base Elo ratings (inspired by FIFA rankings + historical WC performance)
const BASE_ELO: Record<string, number> = {
  // UEFA Tier 1
  "France": 2080, "Spain": 2040, "England": 2030, "Germany": 2000,
  "Portugal": 1990, "Netherlands": 1970, "Belgium": 1950, "Croatia": 1940,
  // UEFA Tier 2
  "Switzerland": 1830, "Austria": 1800, "Norway": 1780, "Scotland": 1730,
  // CONMEBOL (adjusted by qualifiers below)
  "Argentina": 2100, "Brazil": 2040, "Uruguay": 1910, "Colombia": 1890,
  "Ecuador": 1840, "Paraguay": 1770,
  // CONCACAF
  "USA": 1790, "Mexico": 1780, "Canada": 1710, "Panama": 1610,
  "Haiti": 1380, "Curaçao": 1340,
  // CAF
  "Morocco": 1860, "Senegal": 1790, "Ivory Coast": 1770, "Egypt": 1740,
  "Algeria": 1740, "Tunisia": 1730, "Ghana": 1710, "South Africa": 1590,
  "Cape Verde Islands": 1510,
  // AFC
  "Japan": 1820, "South Korea": 1790, "Iran": 1730, "Australia": 1710,
  "Saudi Arabia": 1660, "Uzbekistan": 1610, "Qatar": 1570, "Jordan": 1560,
  // OFC
  "New Zealand": 1470,
}

const DEFAULT_ELO = 1400

// Estimated FIFA ranking from Elo (rough mapping)
function eloToFifaRank(elo: number): number {
  if (elo >= 2080) return Math.round(1 + (2100 - elo) / 10)
  if (elo >= 1900) return Math.round(5 + (2080 - elo) / 15)
  if (elo >= 1700) return Math.round(20 + (1900 - elo) / 10)
  if (elo >= 1500) return Math.round(40 + (1700 - elo) / 8)
  return Math.round(65 + (1500 - elo) / 5)
}

/* ═══════════════════════════════════════════
   API HELPERS
   ═══════════════════════════════════════════ */

async function apiGet(endpoint: string): Promise<any> {
  const url = `https://v3.football.api-sports.io/${endpoint}`
  console.log(`  API: ${endpoint}`)
  const res = await fetch(url, {
    headers: { "x-apisports-key": RAPIDAPI_KEY },
  })
  const json = await res.json()
  if (json.errors && Object.keys(json.errors).length > 0) {
    console.error("  API Error:", json.errors)
  }
  return json
}

/* ═══════════════════════════════════════════
   ELO & PROBABILITY MODEL
   ═══════════════════════════════════════════ */

interface GroupTeam {
  teamName: string
  teamId: number
  teamLogo: string | null
  elo: number
}

function matchProbabilities(eloA: number, eloB: number) {
  const expected = 1 / (1 + Math.pow(10, (eloB - eloA) / 400))
  // Draw probability: higher when teams are closer in strength
  const closeness = 1 - Math.abs(expected - 0.5) * 2 // 0 (very unequal) to 1 (equal)
  const pDraw = Math.max(0.10, Math.min(0.28, 0.15 + closeness * 0.15))
  const pA = expected * (1 - pDraw)
  const pB = 1 - pA - pDraw
  return { pA, pDraw, pB }
}

function poisson(lambda: number): number {
  let L = Math.exp(-lambda), p = 1, k = 0
  do { k++; p *= Math.random() } while (p > L)
  return k - 1
}

function simulateMatch(eloA: number, eloB: number): { goalsA: number; goalsB: number } {
  const { pA, pDraw } = matchProbabilities(eloA, eloB)
  const roll = Math.random()
  if (roll < pA) {
    return { goalsA: poisson(1.6) + 1, goalsB: poisson(0.6) }
  } else if (roll < pA + pDraw) {
    const g = poisson(0.9)
    return { goalsA: g, goalsB: g }
  } else {
    return { goalsA: poisson(0.6), goalsB: poisson(1.6) + 1 }
  }
}

interface SimResult {
  advances: Map<string, number> // team -> count of advancement
  champion: Map<string, number> // team -> count of championship wins
}

function simulateGroupStage(
  groups: Map<string, GroupTeam[]>,
  numSims: number
): SimResult {
  const advances = new Map<string, number>()
  const champion = new Map<string, number>()

  // Initialize counters
  for (const teams of groups.values()) {
    for (const t of teams) {
      advances.set(t.teamName, 0)
      champion.set(t.teamName, 0)
    }
  }

  for (let sim = 0; sim < numSims; sim++) {
    const allThirdPlace: { team: GroupTeam; points: number; gd: number; gf: number }[] = []
    const advancedTeams: GroupTeam[] = []

    for (const [, teams] of groups) {
      // Simulate round-robin
      const stats = new Map<string, { points: number; gd: number; gf: number }>()
      for (const t of teams) {
        stats.set(t.teamName, { points: 0, gd: 0, gf: 0 })
      }

      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const a = teams[i], b = teams[j]
          const { goalsA, goalsB } = simulateMatch(a.elo, b.elo)
          const sa = stats.get(a.teamName)!
          const sb = stats.get(b.teamName)!

          if (goalsA > goalsB) {
            sa.points += 3
          } else if (goalsA === goalsB) {
            sa.points += 1; sb.points += 1
          } else {
            sb.points += 3
          }
          sa.gd += goalsA - goalsB; sa.gf += goalsA
          sb.gd += goalsB - goalsA; sb.gf += goalsB
        }
      }

      // Rank: points > GD > GF
      const ranked = teams.slice().sort((a, b) => {
        const sa = stats.get(a.teamName)!, sb = stats.get(b.teamName)!
        if (sb.points !== sa.points) return sb.points - sa.points
        if (sb.gd !== sa.gd) return sb.gd - sa.gd
        return sb.gf - sa.gf
      })

      // Top 2 advance
      advancedTeams.push(ranked[0], ranked[1])
      advances.set(ranked[0].teamName, (advances.get(ranked[0].teamName) || 0) + 1)
      advances.set(ranked[1].teamName, (advances.get(ranked[1].teamName) || 0) + 1)

      // 3rd place
      if (ranked.length >= 3) {
        const s3 = stats.get(ranked[2].teamName)!
        allThirdPlace.push({ team: ranked[2], ...s3 })
      }
    }

    // Best 8 third-place teams advance
    allThirdPlace.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points
      if (b.gd !== a.gd) return b.gd - a.gd
      return b.gf - a.gf
    })
    for (let i = 0; i < Math.min(8, allThirdPlace.length); i++) {
      const t = allThirdPlace[i].team
      advancedTeams.push(t)
      advances.set(t.teamName, (advances.get(t.teamName) || 0) + 1)
    }

    // Simulate knockout (5 rounds: R32, R16, QF, SF, Final)
    let remaining = advancedTeams.slice()
    // Shuffle for bracket randomness
    remaining.sort(() => Math.random() - 0.5)

    for (let round = 0; round < 5; round++) {
      const winners: GroupTeam[] = []
      for (let i = 0; i < remaining.length - 1; i += 2) {
        const a = remaining[i], b = remaining[i + 1]
        const { goalsA, goalsB } = simulateMatch(a.elo, b.elo)
        if (goalsA > goalsB) winners.push(a)
        else if (goalsB > goalsA) winners.push(b)
        else {
          // Penalty shootout: slight advantage to higher Elo
          const pA = 0.45 + (a.elo - b.elo) / 4000
          winners.push(Math.random() < pA ? a : b)
        }
      }
      remaining = winners
      if (remaining.length <= 1) break
    }

    if (remaining.length === 1) {
      champion.set(remaining[0].teamName, (champion.get(remaining[0].teamName) || 0) + 1)
    }
  }

  return { advances, champion }
}

/* ═══════════════════════════════════════════
   MAIN
   ═══════════════════════════════════════════ */

async function main() {
  console.log("=" .repeat(50))
  console.log("POPULANDO COPA DO MUNDO 2026")
  console.log("=" .repeat(50))

  // ── 1. Fetch data from API ──
  console.log("\n1. Buscando dados da API Football...")

  const [fixData, standData, conmebolData] = await Promise.all([
    apiGet("fixtures?league=1&season=2026"),
    apiGet("standings?league=1&season=2026"),
    apiGet("standings?league=34&season=2026"),
  ])

  const fixtures = fixData.response || []
  console.log(`   Fixtures: ${fixtures.length}`)

  // Parse groups from standings
  const groupStandings: Array<{ group: string; teams: any[] }> = []
  if (standData.response?.[0]?.league?.standings) {
    for (const group of standData.response[0].league.standings) {
      if (Array.isArray(group) && group.length > 0 && group[0].group) {
        const groupName = group[0].group
        if (groupName.startsWith("Group")) {
          groupStandings.push({ group: groupName, teams: group })
        }
      }
    }
  }
  console.log(`   Groups: ${groupStandings.length}`)

  // Parse CONMEBOL qualifiers
  const conmebolTeams: any[] = []
  if (conmebolData.response?.[0]?.league?.standings) {
    for (const standing of conmebolData.response[0].league.standings) {
      if (Array.isArray(standing)) {
        for (const team of standing) {
          conmebolTeams.push(team)
        }
      }
    }
  }
  console.log(`   CONMEBOL teams: ${conmebolTeams.length}`)

  // ── 2. Adjust Elo for CONMEBOL teams using qualifier data ──
  console.log("\n2. Calculando Elo ajustado...")
  const adjustedElo = { ...BASE_ELO }

  for (const ct of conmebolTeams) {
    const name = ct.team?.name
    if (!name || !adjustedElo[name]) continue

    const played = ct.all?.played || 0
    if (played === 0) continue

    const ppg = ct.points / played // points per game (max 3)
    const gdpg = ((ct.all?.goals?.for || 0) - (ct.all?.goals?.against || 0)) / played

    // Adjust Elo: strong qualifier performance boosts, weak performance reduces
    // PPG of 2.0 = very strong, 1.0 = average, 0.5 = weak
    const ppgAdjust = (ppg - 1.3) * 80 // baseline 1.3 ppg
    const gdAdjust = gdpg * 20

    adjustedElo[name] = Math.round(adjustedElo[name] + ppgAdjust + gdAdjust)
    console.log(`   ${name}: base ${BASE_ELO[name]} -> adjusted ${adjustedElo[name]} (ppg=${ppg.toFixed(2)}, gd/g=${gdpg.toFixed(2)})`)
  }

  // ── 3. Build group structure for simulation ──
  console.log("\n3. Simulando torneio (10.000x)...")
  const groupsForSim = new Map<string, GroupTeam[]>()

  for (const gs of groupStandings) {
    const teams: GroupTeam[] = []
    for (const t of gs.teams) {
      const name = t.team?.name || "TBD"
      if (name === "Team will be confirmed") continue
      teams.push({
        teamName: name,
        teamId: t.team?.id || 0,
        teamLogo: t.team?.logo || null,
        elo: adjustedElo[name] || DEFAULT_ELO,
      })
    }
    if (teams.length >= 3) {
      groupsForSim.set(gs.group, teams)
    }
  }

  const simResult = simulateGroupStage(groupsForSim, 10000)

  // Print top 15 championship probabilities
  const champProbs = Array.from(simResult.champion.entries())
    .map(([team, count]) => ({ team, prob: count / 10000 }))
    .sort((a, b) => b.prob - a.prob)
  console.log("\n   Top 15 favoritos:")
  for (const { team, prob } of champProbs.slice(0, 15)) {
    const advProb = (simResult.advances.get(team) || 0) / 10000
    console.log(`   ${team.padEnd(20)} Campeao: ${(prob * 100).toFixed(1)}%  Avanca: ${(advProb * 100).toFixed(1)}%`)
  }

  // ── 4. Insert wc_games ──
  console.log("\n4. Inserindo wc_games...")
  const gamesRows = fixtures.map((f: any) => {
    const venueName = f.fixture.venue?.name || null
    const venueInfo = venueName ? VENUE_CITY[venueName] : null
    const round = f.league?.round || ""
    const phase = round.includes("Group") ? "Fase de Grupos" : round

    // Determine group from round or from fixture teams
    let groupName: string | null = null
    if (round.includes("Group")) {
      // Find which group these teams belong to
      for (const gs of groupStandings) {
        const teamIds = gs.teams.map((t: any) => t.team?.id)
        if (teamIds.includes(f.teams.home.id) || teamIds.includes(f.teams.away.id)) {
          groupName = gs.group
          break
        }
      }
    }

    return {
      api_game_id: f.fixture.id,
      phase,
      group_name: groupName,
      home_team: f.teams.home.name,
      away_team: f.teams.away.name,
      home_team_id: f.teams.home.id,
      away_team_id: f.teams.away.id,
      home_logo: f.teams.home.logo,
      away_logo: f.teams.away.logo,
      home_score: f.goals.home,
      away_score: f.goals.away,
      status: f.fixture.status.short,
      date: f.fixture.date,
      venue: venueName,
      city: venueInfo?.city || f.fixture.venue?.city || null,
      country: venueInfo?.country || null,
      updated_at: new Date().toISOString(),
    }
  })

  const { error: gamesErr } = await supabase
    .from("wc_games")
    .upsert(gamesRows, { onConflict: "api_game_id" })

  if (gamesErr) {
    console.error("   Erro wc_games:", gamesErr.message)
  } else {
    console.log(`   OK: ${gamesRows.length} jogos inseridos`)
  }

  // ── 5. Insert wc_groups ──
  console.log("\n5. Inserindo wc_groups...")

  // Delete existing then insert (simpler than upsert for composite key)
  await supabase.from("wc_groups").delete().neq("id", 0)

  const groupRows: any[] = []
  for (const gs of groupStandings) {
    for (const t of gs.teams) {
      groupRows.push({
        group_name: gs.group,
        team_name: t.team?.name || "TBD",
        team_id: t.team?.id || 0,
        team_logo: t.team?.logo || null,
        played: t.all?.played || 0,
        won: t.all?.win || 0,
        drawn: t.all?.draw || 0,
        lost: t.all?.lose || 0,
        goals_for: t.all?.goals?.for || 0,
        goals_against: t.all?.goals?.against || 0,
        points: t.points || 0,
        rank: t.rank || 0,
        updated_at: new Date().toISOString(),
      })
    }
  }

  const { error: groupsErr } = await supabase.from("wc_groups").insert(groupRows)

  if (groupsErr) {
    console.error("   Erro wc_groups:", groupsErr.message)
  } else {
    console.log(`   OK: ${groupRows.length} entradas de grupo inseridas`)
  }

  // ── 6. Insert wc_team_stats ──
  console.log("\n6. Inserindo wc_team_stats...")

  // Build team stats
  const teamStatsRows: any[] = []

  // Collect all WC teams from groups
  const allWcTeams = new Map<string, { id: number; logo: string | null; group: string }>()
  for (const gs of groupStandings) {
    for (const t of gs.teams) {
      const name = t.team?.name
      if (name && name !== "Team will be confirmed") {
        allWcTeams.set(name, {
          id: t.team.id,
          logo: t.team.logo,
          group: gs.group,
        })
      }
    }
  }

  for (const [teamName, info] of allWcTeams) {
    const elo = adjustedElo[teamName] || DEFAULT_ELO
    const conf = CONFEDERATION[teamName] || "Unknown"

    // CONMEBOL qualifier data
    const conmebol = conmebolTeams.find((c: any) => c.team?.name === teamName)

    const advanceProb = (simResult.advances.get(teamName) || 0) / 10000
    const champProb = (simResult.champion.get(teamName) || 0) / 10000

    teamStatsRows.push({
      team_id: info.id,
      team_name: teamName,
      team_logo: info.logo,
      confederation: conf,
      fifa_ranking: eloToFifaRank(elo),
      elim_points: conmebol?.points || 0,
      elim_played: conmebol?.all?.played || 0,
      elim_won: conmebol?.all?.win || 0,
      elim_drawn: conmebol?.all?.draw || 0,
      elim_lost: conmebol?.all?.lose || 0,
      elim_gf: conmebol?.all?.goals?.for || 0,
      elim_ga: conmebol?.all?.goals?.against || 0,
      wc_group: info.group,
      probability_advance: Math.round(advanceProb * 1000) / 10, // percentage with 1 decimal
      probability_champion: Math.round(champProb * 1000) / 10,
      updated_at: new Date().toISOString(),
    })
  }

  // Delete existing then insert
  await supabase.from("wc_team_stats").delete().neq("id", 0)
  const { error: statsErr } = await supabase.from("wc_team_stats").insert(teamStatsRows)

  if (statsErr) {
    console.error("   Erro wc_team_stats:", statsErr.message)
  } else {
    console.log(`   OK: ${teamStatsRows.length} selecoes inseridas`)
  }

  // ── Summary ──
  console.log("\n" + "=".repeat(50))
  console.log("RESULTADO FINAL")
  console.log("=".repeat(50))
  console.log(`wc_games:      ${gamesRows.length} jogos`)
  console.log(`wc_groups:     ${groupRows.length} entradas (${groupStandings.length} grupos)`)
  console.log(`wc_team_stats: ${teamStatsRows.length} selecoes com probabilidades`)
  console.log(`Erros:         ${[gamesErr, groupsErr, statsErr].filter(Boolean).length}`)

  // API usage
  const status = await apiGet("status")
  console.log(`\nAPI requests today: ${status.response?.requests?.current} / ${status.response?.requests?.limit_day}`)
}

main().catch(console.error)
