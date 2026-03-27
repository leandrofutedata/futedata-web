import type { CopaBrasilGame, TeamStanding } from './types'

/* ─── Confronto (tie / matchup) ─── */
export interface Confronto {
  id: string
  homeTeam: string
  awayTeam: string
  homeLogo: string | null
  awayLogo: string | null
  homeTeamId: number
  awayTeamId: number
  legs: CopaBrasilGame[]
  aggHome: number
  aggAway: number
  status: "finalizado" | "em-andamento" | "futuro"
  winner: string | null
}

/* ─── Team analysis from Brasileirão ─── */
export interface TeamAnalysis {
  team: string
  standing: TeamStanding | null
  position: number
  strengthIndex: number
  offenseRating: number
  defenseRating: number
  form: ("W" | "D" | "L")[]
  formPoints: number
}

/* ─── Probability model ─── */
export interface MatchProbability {
  homeWin: number
  draw: number
  awayWin: number
  homeClassify: number
  awayClassify: number
  scenarioText: string | null
  dominantFactor: string
}

/* ─── Constants ─── */
export const MAIN_PHASES = ["3a Fase", "Oitavas de Final", "Quartas de Final", "Semifinal", "Final"]
export const EARLY_PHASES = ["Fase Preliminar 1", "Fase Preliminar 2", "1a Fase", "2a Fase"]

/* ─── Historical club weight (0-100) ─── */
// Tier 1 (85-95): Grandes com titulos internacionais e multiplas Copas do Brasil
// Tier 2 (70-84): Serie A consolidados com tradicao em mata-mata
// Tier 3 (50-69): Serie A/B tradicionais
// Tier 4 (30-49): Serie B competitivos
// Tier 5 (10-29): Serie C/D e divisoes inferiores
export const HISTORICAL_WEIGHT: Record<string, number> = {
  // Tier 1 — Gigantes
  "Flamengo": 95, "Palmeiras": 95, "Corinthians": 92, "Sao Paulo": 92,
  "Gremio": 90, "Internacional": 90, "Cruzeiro": 90,
  "Santos": 88, "Atletico-MG": 88, "Fluminense": 85, "Botafogo": 85,
  "Vasco DA Gama": 83,
  // Tier 2 — Serie A fortes
  "Atletico Paranaense": 75, "Bahia": 75, "Fortaleza EC": 72,
  "RB Bragantino": 68, "Coritiba": 65,
  // Tier 3 — Serie A/B tradicionais
  "Vitoria": 58, "Remo": 55, "Chapecoense-sc": 52,
  "Mirassol": 50, "Goias": 60, "Ceara": 60, "Juventude": 55,
  "Paysandu": 55, "CRB": 48, "Operario-PR": 45,
  // Tier 4 — Serie B/C
  "Athletic Club": 35, "Atletico Goianiense": 50,
  "Novorizontino": 42, "Confiança": 30, "Jacuipense": 15,
  "Barra": 10,
}
export const DEFAULT_HISTORICAL_WEIGHT = 25

/* ═══════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════ */

export function groupConfrontos(games: CopaBrasilGame[]): Confronto[] {
  const map = new Map<string, CopaBrasilGame[]>()
  for (const g of games) {
    const teams = [g.home_team_id, g.away_team_id].sort((a, b) => a - b)
    const key = `${g.fase}__${teams[0]}__${teams[1]}`
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(g)
  }

  const confrontos: Confronto[] = []
  for (const [key, legs] of map.entries()) {
    legs.sort((a, b) => a.date.localeCompare(b.date))
    const first = legs[0]

    let aggHome = 0, aggAway = 0
    let allFinished = true, anyPlayed = false

    for (const leg of legs) {
      if (leg.status === "FT") {
        anyPlayed = true
        if (leg.home_team_id === first.home_team_id) {
          aggHome += leg.home_score ?? 0
          aggAway += leg.away_score ?? 0
        } else {
          aggHome += leg.away_score ?? 0
          aggAway += leg.home_score ?? 0
        }
      } else {
        allFinished = false
      }
    }

    let status: Confronto["status"] = "futuro"
    if (allFinished && anyPlayed) status = "finalizado"
    else if (anyPlayed) status = "em-andamento"

    let winner: string | null = null
    if (status === "finalizado") {
      if (aggHome > aggAway) winner = first.home_team
      else if (aggAway > aggHome) winner = first.away_team
    }

    confrontos.push({
      id: key,
      homeTeam: first.home_team,
      awayTeam: first.away_team,
      homeLogo: first.home_logo,
      awayLogo: first.away_logo,
      homeTeamId: first.home_team_id,
      awayTeamId: first.away_team_id,
      legs,
      aggHome,
      aggAway,
      status,
      winner,
    })
  }

  return confrontos
}

export function buildTeamAnalysis(teamName: string, standings: TeamStanding[]): TeamAnalysis {
  const standing = standings.find((s) => s.team === teamName) || null
  const position = standing ? standings.indexOf(standing) + 1 : 99
  const totalTeams = standings.length || 20

  const historical = HISTORICAL_WEIGHT[teamName] ?? DEFAULT_HISTORICAL_WEIGHT

  let brasileiraoScore = 0
  if (standing && standing.played > 0) {
    const positionScore = ((totalTeams - position) / totalTeams) * 50
    const xgDiffPerGame = (standing.xG - standing.xGA) / standing.played
    const xgScore = Math.max(0, Math.min(30, 15 + xgDiffPerGame * 10))
    const formPts = standing.form.reduce((acc, f) => acc + (f === "W" ? 3 : f === "D" ? 1 : 0), 0)
    const formScore = (formPts / 15) * 20
    brasileiraoScore = Math.round(positionScore + xgScore + formScore)
  } else {
    brasileiraoScore = Math.round(historical * 0.4)
  }

  const strengthIndex = Math.round(
    Math.max(5, Math.min(95,
      historical * 0.40 + brasileiraoScore * 0.35 + 25 * 0.25
    ))
  )

  return {
    team: teamName,
    standing,
    position,
    strengthIndex,
    offenseRating: standing && standing.played > 0 ? standing.goalsFor / standing.played : 0,
    defenseRating: standing && standing.played > 0 ? standing.goalsAgainst / standing.played : 0,
    form: standing?.form || [],
    formPoints: standing?.form.reduce((acc, f) => acc + (f === "W" ? 3 : f === "D" ? 1 : 0), 0) || 0,
  }
}

export function calcProbability(
  confronto: Confronto,
  homeAnalysis: TeamAnalysis,
  awayAnalysis: TeamAnalysis
): MatchProbability {
  // Factor 1: Historical weight (40%)
  const hHist = HISTORICAL_WEIGHT[confronto.homeTeam] ?? DEFAULT_HISTORICAL_WEIGHT
  const aHist = HISTORICAL_WEIGHT[confronto.awayTeam] ?? DEFAULT_HISTORICAL_WEIGHT
  const histTotal = hHist + aHist || 1
  const histFactor = hHist / histTotal

  // Factor 2: Brasileirao performance (35%)
  const hStr = homeAnalysis.strengthIndex
  const aStr = awayAnalysis.strengthIndex
  const strTotal = hStr + aStr || 1
  const brFactor = hStr / strTotal

  // Factor 3: Home advantage (15%)
  let homeFactor = 0.5
  const hasFutureVolta = confronto.legs.some(l => l.jogo_ida_volta === "volta" && l.status !== "FT")
  if (confronto.status === "futuro") {
    homeFactor = 0.62
  } else if (hasFutureVolta) {
    const voltaLeg = confronto.legs.find(l => l.jogo_ida_volta === "volta" && l.status !== "FT")
    if (voltaLeg) {
      homeFactor = voltaLeg.home_team_id === confronto.homeTeamId ? 0.62 : 0.38
    }
  }

  // Factor 4: First leg result / Aggregate (10%)
  let aggFactor = 0.5
  let scenarioText: string | null = null
  if (confronto.status === "em-andamento") {
    const diff = confronto.aggHome - confronto.aggAway
    aggFactor = 1 / (1 + Math.exp(-diff * 0.8))
    if (diff > 0) {
      scenarioText = `${confronto.awayTeam} precisa vencer por ${diff + 1}+ gols`
    } else if (diff < 0) {
      scenarioText = `${confronto.homeTeam} precisa vencer por ${Math.abs(diff) + 1}+ gols`
    } else {
      scenarioText = "Empate no agregado — quem vencer avanca"
    }
  }

  // Weighted combination
  const homeClassifyRaw =
    histFactor * 0.40 +
    brFactor * 0.35 +
    homeFactor * 0.15 +
    aggFactor * 0.10

  const homeClassify = Math.max(0.03, Math.min(0.97, homeClassifyRaw))

  // Dominant factor
  const factors = [
    { name: "Tradição", contribution: Math.abs(histFactor - 0.5) * 0.40 },
    { name: "Brasileirão", contribution: Math.abs(brFactor - 0.5) * 0.35 },
    { name: "Mando de campo", contribution: Math.abs(homeFactor - 0.5) * 0.15 },
    { name: "Agregado", contribution: Math.abs(aggFactor - 0.5) * 0.10 },
  ]
  factors.sort((a, b) => b.contribution - a.contribution)
  const dominantFactor = factors[0].contribution > 0.01 ? factors[0].name : "Equilibrado"

  // Single match probabilities
  const homeWin = homeClassify * 0.85
  const awayWin = (1 - homeClassify) * 0.85
  const draw = 1 - homeWin - awayWin

  return {
    homeWin: Math.round(homeWin * 100),
    draw: Math.round(draw * 100),
    awayWin: Math.round(awayWin * 100),
    homeClassify: Math.round(homeClassify * 100),
    awayClassify: Math.round((1 - homeClassify) * 100),
    scenarioText,
    dominantFactor,
  }
}
