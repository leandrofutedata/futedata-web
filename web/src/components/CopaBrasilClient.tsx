"use client"

import { useState, useMemo } from "react"
import type { CopaBrasilGame, Game, TeamStanding } from "@/lib/types"
import { calcStandings } from "@/lib/calculations"

/* ─── Props ─── */
interface CopaBrasilClientProps {
  copaGames: CopaBrasilGame[]
  brasileiraoGames: Game[]
}

/* ─── Confronto (tie / matchup) ─── */
interface Confronto {
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
interface TeamAnalysis {
  team: string
  standing: TeamStanding | null
  position: number
  strengthIndex: number // 0-100
  offenseRating: number // goals per game
  defenseRating: number // goals conceded per game
  form: ("W" | "D" | "L")[]
  formPoints: number // points from last 5
}

/* ─── Probability model ─── */
interface MatchProbability {
  homeWin: number
  draw: number
  awayWin: number
  homeClassify: number
  awayClassify: number
  scenarioText: string | null
  dominantFactor: string
}

/* ─── Constants ─── */
const MAIN_PHASES = ["3a Fase", "Oitavas de Final", "Quartas de Final", "Semifinal", "Final"]
const EARLY_PHASES = ["Fase Preliminar 1", "Fase Preliminar 2", "1a Fase", "2a Fase"]

/* ─── Historical club weight (0-100) ─── */
// Tier 1 (85-95): Grandes com titulos internacionais e multiplas Copas do Brasil
// Tier 2 (70-84): Serie A consolidados com tradicao em mata-mata
// Tier 3 (50-69): Serie A/B tradicionais
// Tier 4 (30-49): Serie B competitivos
// Tier 5 (10-29): Serie C/D e divisoes inferiores
const HISTORICAL_WEIGHT: Record<string, number> = {
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
const DEFAULT_HISTORICAL_WEIGHT = 25 // Divisoes inferiores nao listados

/* ═══════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════ */

function groupConfrontos(games: CopaBrasilGame[]): Confronto[] {
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

function buildTeamAnalysis(teamName: string, standings: TeamStanding[]): TeamAnalysis {
  const standing = standings.find((s) => s.team === teamName) || null
  const position = standing ? standings.indexOf(standing) + 1 : 99
  const totalTeams = standings.length || 20

  // Historical weight (40% of final strength)
  const historical = HISTORICAL_WEIGHT[teamName] ?? DEFAULT_HISTORICAL_WEIGHT

  // Brasileirao performance (35% of final strength) — normalized to 0-100
  let brasileiraoScore = 0
  if (standing && standing.played > 0) {
    const positionScore = ((totalTeams - position) / totalTeams) * 50 // 0-50
    const xgDiffPerGame = (standing.xG - standing.xGA) / standing.played
    const xgScore = Math.max(0, Math.min(30, 15 + xgDiffPerGame * 10)) // 0-30
    const formPts = standing.form.reduce((acc, f) => acc + (f === "W" ? 3 : f === "D" ? 1 : 0), 0)
    const formScore = (formPts / 15) * 20 // 0-20
    brasileiraoScore = Math.round(positionScore + xgScore + formScore)
  } else {
    // No Brasileirao data: estimate from historical weight (less reliable)
    brasileiraoScore = Math.round(historical * 0.4)
  }

  // Combined strength index: historical 40% + brasileirao 35% + base 25%
  // (Home advantage and aggregate are applied in calcProbability, not here)
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

function calcProbability(
  confronto: Confronto,
  homeAnalysis: TeamAnalysis,
  awayAnalysis: TeamAnalysis
): MatchProbability {
  // ── Factor 1: Historical weight (40%) ──
  const hHist = HISTORICAL_WEIGHT[confronto.homeTeam] ?? DEFAULT_HISTORICAL_WEIGHT
  const aHist = HISTORICAL_WEIGHT[confronto.awayTeam] ?? DEFAULT_HISTORICAL_WEIGHT
  const histTotal = hHist + aHist || 1
  const histFactor = hHist / histTotal // 0-1, home perspective

  // ── Factor 2: Brasileirao performance (35%) ──
  const hStr = homeAnalysis.strengthIndex
  const aStr = awayAnalysis.strengthIndex
  const strTotal = hStr + aStr || 1
  const brFactor = hStr / strTotal // 0-1

  // ── Factor 3: Home advantage (15%) ──
  // In Copa do Brasil, the team playing at home in the decisive leg has an edge.
  // For ida/volta, the away team in the first leg is home in the second (volta).
  // For future games with one leg remaining, give home advantage to the actual home team.
  let homeFactor = 0.5 // neutral by default
  const hasVolta = confronto.legs.some(l => l.jogo_ida_volta === "volta")
  const hasFutureVolta = confronto.legs.some(l => l.jogo_ida_volta === "volta" && l.status !== "FT")
  if (confronto.status === "futuro") {
    homeFactor = 0.62 // home team advantage in future single games
  } else if (hasFutureVolta) {
    // The volta leg is still to be played — who is home in the volta?
    const voltaLeg = confronto.legs.find(l => l.jogo_ida_volta === "volta" && l.status !== "FT")
    if (voltaLeg) {
      // If the volta home team is the confronto's "home" team, advantage to home
      homeFactor = voltaLeg.home_team_id === confronto.homeTeamId ? 0.62 : 0.38
    }
  }

  // ── Factor 4: First leg result / Aggregate (10%) ──
  let aggFactor = 0.5 // neutral
  let scenarioText: string | null = null
  if (confronto.status === "em-andamento") {
    const diff = confronto.aggHome - confronto.aggAway
    // Sigmoid-like scaling: each goal shifts probability significantly
    aggFactor = 1 / (1 + Math.exp(-diff * 0.8))
    if (diff > 0) {
      scenarioText = `${confronto.awayTeam} precisa vencer por ${diff + 1}+ gols`
    } else if (diff < 0) {
      scenarioText = `${confronto.homeTeam} precisa vencer por ${Math.abs(diff) + 1}+ gols`
    } else {
      scenarioText = "Empate no agregado — quem vencer avanca"
    }
  }

  // ── Weighted combination ──
  const homeClassifyRaw =
    histFactor * 0.40 +
    brFactor * 0.35 +
    homeFactor * 0.15 +
    aggFactor * 0.10

  // Clamp to 3%-97%
  const homeClassify = Math.max(0.03, Math.min(0.97, homeClassifyRaw))

  // ── Dominant factor ──
  const factors = [
    { name: "Tradição", contribution: Math.abs(histFactor - 0.5) * 0.40 },
    { name: "Brasileirão", contribution: Math.abs(brFactor - 0.5) * 0.35 },
    { name: "Mando de campo", contribution: Math.abs(homeFactor - 0.5) * 0.15 },
    { name: "Agregado", contribution: Math.abs(aggFactor - 0.5) * 0.10 },
  ]
  factors.sort((a, b) => b.contribution - a.contribution)
  const dominantFactor = factors[0].contribution > 0.01 ? factors[0].name : "Equilibrado"

  // ── Single match probabilities ──
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

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}
function formatTime(d: string) {
  return new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
}

/* ═══════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════ */

function TeamLogo({ name, logo, size = "md" }: { name: string; logo: string | null; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-6 h-6", md: "w-10 h-10", lg: "w-14 h-14" }
  const textSizes = { sm: "text-[8px]", md: "text-[10px]", lg: "text-sm" }
  if (logo) {
    return <img src={logo} alt={name} className={`${sizes[size]} object-contain`} loading="lazy" />
  }
  const parts = name.split(" ")
  const initials = parts.length >= 2 ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase()
  return (
    <div className={`${sizes[size]} rounded-full bg-[var(--color-green-primary)] flex items-center justify-center text-white ${textSizes[size]} font-bold`}>
      {initials}
    </div>
  )
}

function FormDots({ form }: { form: ("W" | "D" | "L")[] }) {
  if (form.length === 0) return <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-500">S/D</span>
  return (
    <div className="flex gap-0.5">
      {form.map((f, i) => (
        <div
          key={i}
          className={`w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white ${
            f === "W" ? "bg-green-500" : f === "D" ? "bg-gray-400" : "bg-red-500"
          }`}
        >
          {f === "W" ? "V" : f === "D" ? "E" : "D"}
        </div>
      ))}
    </div>
  )
}

function StrengthBar({ value, label }: { value: number; label: string }) {
  const color = value >= 70 ? "bg-green-500" : value >= 45 ? "bg-yellow-500" : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 w-14 uppercase">{label}</span>
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${value}%` }} />
      </div>
      <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-700 w-6 text-right">{value}</span>
    </div>
  )
}

function ProbabilityBar({ prob }: { prob: MatchProbability }) {
  const [showTooltip, setShowTooltip] = useState(false)
  return (
    <div className="relative">
      <div className="flex items-center gap-2 mb-1">
        <span className="font-[family-name:var(--font-heading)] text-lg text-[var(--color-green-primary)]">
          {prob.homeClassify}%
        </span>
        <div className="flex-1 h-3 rounded-full overflow-hidden flex bg-gray-200">
          <div className="h-full bg-[var(--color-green-primary)] transition-all" style={{ width: `${prob.homeClassify}%` }} />
          <div className="h-full bg-blue-500 transition-all" style={{ width: `${prob.awayClassify}%` }} />
        </div>
        <span className="font-[family-name:var(--font-heading)] text-lg text-blue-600">
          {prob.awayClassify}%
        </span>
      </div>
      <div className="flex items-center justify-center gap-1.5">
        <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-500 uppercase">
          Prob. classificacao
        </p>
        <button
          onClick={(e) => { e.stopPropagation(); setShowTooltip(!showTooltip) }}
          className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 hover:text-gray-600 transition-colors w-3 h-3 rounded-full border border-gray-300 flex items-center justify-center"
        >
          ?
        </button>
      </div>
      {showTooltip && (
        <div className="absolute z-20 left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-gray-200 rounded-lg p-3 shadow-xl w-64" onClick={(e) => e.stopPropagation()}>
          <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-600 leading-relaxed mb-2">Modelo com 4 fatores ponderados:</p>
          <div className="space-y-1 font-[family-name:var(--font-data)] text-[9px] text-gray-500">
            <p><span className="text-[var(--color-green-primary)] font-bold">40%</span> Tradicao historica do clube</p>
            <p><span className="text-[var(--color-green-primary)] font-bold">35%</span> Desempenho no Brasileirao (posicao, xG, forma)</p>
            <p><span className="text-[var(--color-green-primary)] font-bold">15%</span> Mando de campo</p>
            <p><span className="text-[var(--color-green-primary)] font-bold">10%</span> Resultado do jogo de ida</p>
          </div>
          <p className="font-[family-name:var(--font-data)] text-[8px] text-gray-400 mt-2">Fator dominante: {prob.dominantFactor}</p>
        </div>
      )}
    </div>
  )
}

/* ─── Confronto Card ─── */
function ConfrontoCard({
  confronto,
  homeAnalysis,
  awayAnalysis,
  prob,
}: {
  confronto: Confronto
  homeAnalysis: TeamAnalysis
  awayAnalysis: TeamAnalysis
  prob: MatchProbability
}) {
  const [expanded, setExpanded] = useState(false)
  const isFuture = confronto.status === "futuro"
  const isFinished = confronto.status === "finalizado"
  const homeWon = confronto.winner === confronto.homeTeam
  const awayWon = confronto.winner === confronto.awayTeam

  // Difficulty index: average of both teams' strength
  const difficulty = Math.round((homeAnalysis.strengthIndex + awayAnalysis.strengthIndex) / 2)

  // Favoritism
  const diff = Math.abs(prob.homeClassify - prob.awayClassify)
  const favoritismo = diff > 40 ? "Muito desequilibrado" : diff > 20 ? "Favorito claro" : diff > 8 ? "Leve favoritismo" : "Equilibrado"

  return (
    <div
      className={`rounded-2xl overflow-hidden transition-all cursor-pointer ${
        isFinished
          ? "bg-white border border-gray-200 shadow-sm opacity-75 hover:opacity-100"
          : "bg-white border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      {/* Status strip */}
      <div className={`h-1 ${
        isFinished ? "bg-gray-300" : isFuture ? "bg-gradient-to-r from-green-500 to-emerald-400" : "bg-gradient-to-r from-orange-500 to-yellow-400"
      }`} />

      {/* Main content */}
      <div className="px-5 pt-5 pb-4">
        {/* Status + Difficulty row */}
        <div className="flex items-center justify-between mb-4">
          <span className={`font-[family-name:var(--font-data)] text-[10px] px-2 py-0.5 rounded-full ${
            isFinished
              ? "bg-gray-100 text-gray-500"
              : isFuture
                ? "bg-[var(--color-green-light)] text-[var(--color-green-primary)]"
                : "bg-orange-100 text-orange-700"
          }`}>
            {isFinished ? "ENCERRADO" : isFuture ? `${formatDate(confronto.legs[0].date)} ${formatTime(confronto.legs[0].date)}` : "EM ANDAMENTO"}
          </span>
          {!isFinished && (
            <div className="flex items-center gap-1.5">
              <span className="font-[family-name:var(--font-data)] text-[8px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">
                {prob.dominantFactor}
              </span>
              <span className={`font-[family-name:var(--font-data)] text-[10px] px-2 py-0.5 rounded-full ${
                diff > 20 ? "bg-red-100 text-red-700" : diff > 8 ? "bg-yellow-100 text-yellow-700" : "bg-[var(--color-green-light)] text-[var(--color-green-primary)]"
              }`}>
                {favoritismo}
              </span>
            </div>
          )}
        </div>

        {/* Teams */}
        <div className="flex items-center justify-between gap-3">
          {/* Home team */}
          <div className={`flex flex-col items-center gap-1 flex-1 ${awayWon ? "opacity-40" : ""}`}>
            <TeamLogo name={confronto.homeTeam} logo={confronto.homeLogo} size="lg" />
            <span className={`text-xs text-center leading-tight ${homeWon ? "text-gray-900 font-bold" : "text-gray-600"}`}>
              {confronto.homeTeam}
            </span>
            {homeAnalysis.standing && (
              <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-500">
                {homeAnalysis.position}o no BR
              </span>
            )}
          </div>

          {/* Score / VS */}
          <div className="flex flex-col items-center gap-1 px-2">
            {isFuture ? (
              <span className="font-[family-name:var(--font-heading)] text-2xl text-gray-400">VS</span>
            ) : (
              <span className="font-[family-name:var(--font-heading)] text-4xl text-gray-900">
                {confronto.aggHome} <span className="text-gray-300">-</span> {confronto.aggAway}
              </span>
            )}
            {isFinished && confronto.winner && (
              <span className="font-[family-name:var(--font-data)] text-[9px] text-[var(--color-green-primary)]">CLASSIFICADO</span>
            )}
          </div>

          {/* Away team */}
          <div className={`flex flex-col items-center gap-1 flex-1 ${homeWon ? "opacity-40" : ""}`}>
            <TeamLogo name={confronto.awayTeam} logo={confronto.awayLogo} size="lg" />
            <span className={`text-xs text-center leading-tight ${awayWon ? "text-gray-900 font-bold" : "text-gray-600"}`}>
              {confronto.awayTeam}
            </span>
            {awayAnalysis.standing && (
              <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-500">
                {awayAnalysis.position}o no BR
              </span>
            )}
          </div>
        </div>

        {/* Probability bar (not for finished) */}
        {!isFinished && (
          <div className="mt-4">
            <ProbabilityBar prob={prob} />
          </div>
        )}

        {/* Scenario text */}
        {prob.scenarioText && (
          <p className="font-[family-name:var(--font-data)] text-[10px] text-[var(--color-yellow-dark)] text-center mt-2">
            {prob.scenarioText}
          </p>
        )}

        {/* Expand hint */}
        <div className="flex justify-center mt-3">
          <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-600">
            {expanded ? "ocultar detalhes \u25B2" : "ver analise \u25BC"}
          </span>
        </div>
      </div>

      {/* Expanded analysis */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100 pt-4 space-y-4">
          {/* Team strength comparison */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Home */}
            <div className="space-y-2">
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase">{confronto.homeTeam}</p>
              <StrengthBar value={homeAnalysis.strengthIndex} label="Forca" />
              <StrengthBar value={Math.round(homeAnalysis.offenseRating * 50)} label="Ataque" />
              <StrengthBar value={Math.round(Math.max(0, 100 - homeAnalysis.defenseRating * 50))} label="Defesa" />
              <div className="flex items-center gap-2 mt-1">
                <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 w-14 uppercase">Forma</span>
                <FormDots form={homeAnalysis.form} />
              </div>
            </div>
            {/* Away */}
            <div className="space-y-2">
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase">{confronto.awayTeam}</p>
              <StrengthBar value={awayAnalysis.strengthIndex} label="Forca" />
              <StrengthBar value={Math.round(awayAnalysis.offenseRating * 50)} label="Ataque" />
              <StrengthBar value={Math.round(Math.max(0, 100 - awayAnalysis.defenseRating * 50))} label="Defesa" />
              <div className="flex items-center gap-2 mt-1">
                <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 w-14 uppercase">Forma</span>
                <FormDots form={awayAnalysis.form} />
              </div>
            </div>
          </div>

          {/* Match result probabilities */}
          {!isFinished && (
            <div>
              <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-500 uppercase mb-2">Probabilidade do resultado</p>
              <div className="flex gap-2">
                <div className="flex-1 bg-green-50 rounded-lg py-2 text-center">
                  <p className="font-[family-name:var(--font-heading)] text-lg text-[var(--color-green-primary)]">{prob.homeWin}%</p>
                  <p className="font-[family-name:var(--font-data)] text-[8px] text-gray-500">VITORIA CASA</p>
                </div>
                <div className="flex-1 bg-gray-50 rounded-lg py-2 text-center">
                  <p className="font-[family-name:var(--font-heading)] text-lg text-gray-500">{prob.draw}%</p>
                  <p className="font-[family-name:var(--font-data)] text-[8px] text-gray-500">EMPATE</p>
                </div>
                <div className="flex-1 bg-blue-50 rounded-lg py-2 text-center">
                  <p className="font-[family-name:var(--font-heading)] text-lg text-blue-600">{prob.awayWin}%</p>
                  <p className="font-[family-name:var(--font-data)] text-[8px] text-gray-500">VITORIA FORA</p>
                </div>
              </div>
            </div>
          )}

          {/* Difficulty + xG context */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-500 uppercase">Indice de dificuldade</p>
                <p className="font-[family-name:var(--font-heading)] text-xl text-gray-900">{difficulty}<span className="text-gray-400 text-sm">/100</span></p>
              </div>
              {homeAnalysis.standing && awayAnalysis.standing && (
                <div className="text-right">
                  <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-500 uppercase">xG no Brasileirao</p>
                  <p className="font-[family-name:var(--font-data)] text-xs text-gray-600">
                    {(homeAnalysis.standing.xG / homeAnalysis.standing.played).toFixed(2)} vs {(awayAnalysis.standing.xG / awayAnalysis.standing.played).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Legs detail */}
          {confronto.legs.length > 0 && (
            <div>
              <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-500 uppercase mb-2">Detalhes do jogo</p>
              {confronto.legs.map((leg, i) => (
                <div key={leg.id} className="flex items-center justify-between py-1.5 border-b border-gray-100 last:border-0">
                  <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                    {leg.jogo_ida_volta === "ida" ? "Ida" : leg.jogo_ida_volta === "volta" ? "Volta" : confronto.legs.length > 1 ? `Jogo ${i+1}` : "Jogo unico"}
                  </span>
                  <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-600">
                    {leg.status === "FT"
                      ? `${leg.home_team} ${leg.home_score}-${leg.away_score} ${leg.away_team}`
                      : `${formatDate(leg.date)} as ${formatTime(leg.date)}`}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Methodology note */}
          <p className="font-[family-name:var(--font-data)] text-[8px] text-gray-600 leading-relaxed">
            Modelo: tradicao historica (40%) + desempenho no Brasileirao (35%) + mando de campo (15%) + resultado da ida (10%).
            Fator dominante: {prob.dominantFactor}.
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── Competition Stats Panel ─── */
function CompetitionStats({ copaGames, standings }: { copaGames: CopaBrasilGame[]; standings: TeamStanding[] }) {
  const finished = copaGames.filter((g) => g.status === "FT")
  const totalGoals = finished.reduce((acc, g) => acc + (g.home_score ?? 0) + (g.away_score ?? 0), 0)
  const avgGoals = finished.length > 0 ? totalGoals / finished.length : 0

  // Top scoring teams in Copa
  const teamGoals = new Map<string, number>()
  for (const g of finished) {
    teamGoals.set(g.home_team, (teamGoals.get(g.home_team) || 0) + (g.home_score ?? 0))
    teamGoals.set(g.away_team, (teamGoals.get(g.away_team) || 0) + (g.away_score ?? 0))
  }
  const topScorers = Array.from(teamGoals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Best defense (fewest goals conceded)
  const teamConceded = new Map<string, { conceded: number; games: number }>()
  for (const g of finished) {
    if (!teamConceded.has(g.home_team)) teamConceded.set(g.home_team, { conceded: 0, games: 0 })
    if (!teamConceded.has(g.away_team)) teamConceded.set(g.away_team, { conceded: 0, games: 0 })
    const h = teamConceded.get(g.home_team)!
    const a = teamConceded.get(g.away_team)!
    h.conceded += g.away_score ?? 0; h.games++
    a.conceded += g.home_score ?? 0; a.games++
  }
  const bestDefense = Array.from(teamConceded.entries())
    .filter(([, v]) => v.games >= 2)
    .sort((a, b) => (a[1].conceded / a[1].games) - (b[1].conceded / b[1].games))
    .slice(0, 3)

  // Goals by phase
  const goalsByPhase = new Map<string, { goals: number; games: number }>()
  for (const g of finished) {
    if (!goalsByPhase.has(g.fase)) goalsByPhase.set(g.fase, { goals: 0, games: 0 })
    const p = goalsByPhase.get(g.fase)!
    p.goals += (g.home_score ?? 0) + (g.away_score ?? 0)
    p.games++
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 space-y-6">
      <h3 className="font-[family-name:var(--font-heading)] text-xl text-gray-900">NUMEROS DA COPA</h3>

      {/* Key stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { value: finished.length, label: "JOGOS" },
          { value: totalGoals, label: "GOLS" },
          { value: avgGoals.toFixed(1), label: "MEDIA/JOGO" },
        ].map((s) => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="font-[family-name:var(--font-heading)] text-2xl text-[var(--color-green-primary)]">{s.value}</p>
            <p className="font-[family-name:var(--font-data)] text-[8px] text-gray-500 uppercase">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Top scorers */}
      <div>
        <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-500 uppercase mb-2">Times artilheiros</p>
        <div className="space-y-1.5">
          {topScorers.map(([team, goals], i) => {
            const maxG = topScorers[0][1]
            return (
              <div key={team} className="flex items-center gap-2">
                <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 w-4">{i + 1}</span>
                <span className="text-xs text-gray-600 flex-1 truncate">{team}</span>
                <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full" style={{ width: `${(goals / maxG) * 100}%` }} />
                </div>
                <span className="font-[family-name:var(--font-heading)] text-sm text-gray-900 w-6 text-right">{goals}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Best defense */}
      <div>
        <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-500 uppercase mb-2">Melhor defesa (gols/jogo)</p>
        <div className="space-y-1.5">
          {bestDefense.map(([team, data], i) => (
            <div key={team} className="flex items-center gap-2">
              <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 w-4">{i + 1}</span>
              <span className="text-xs text-gray-600 flex-1 truncate">{team}</span>
              <span className="font-[family-name:var(--font-data)] text-xs text-blue-600">
                {(data.conceded / data.games).toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Goals by phase */}
      <div>
        <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-500 uppercase mb-2">Media de gols por fase</p>
        <div className="space-y-1.5">
          {Array.from(goalsByPhase.entries())
            .sort((a, b) => {
              const order = [...EARLY_PHASES, ...MAIN_PHASES]
              return order.indexOf(a[0]) - order.indexOf(b[0])
            })
            .map(([fase, data]) => (
              <div key={fase} className="flex items-center justify-between">
                <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">{fase}</span>
                <span className="font-[family-name:var(--font-heading)] text-sm text-[var(--color-green-primary)]">
                  {(data.goals / data.games).toFixed(1)}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export function CopaBrasilClient({ copaGames, brasileiraoGames }: CopaBrasilClientProps) {
  const [showEarlier, setShowEarlier] = useState(false)
  const [activeFaseFilter, setActiveFaseFilter] = useState<string | null>(null)

  const standings = useMemo(() => calcStandings(brasileiraoGames), [brasileiraoGames])

  const gamesByFase = useMemo(() => {
    const map = new Map<string, CopaBrasilGame[]>()
    for (const g of copaGames) {
      if (!map.has(g.fase)) map.set(g.fase, [])
      map.get(g.fase)!.push(g)
    }
    return map
  }, [copaGames])

  // Auto-detect active phase
  const activeFase = useMemo(() => {
    const all = [...EARLY_PHASES, ...MAIN_PHASES]
    for (const fase of [...all].reverse()) {
      const faseGames = gamesByFase.get(fase)
      if (faseGames?.some((g) => g.status !== "FT")) return fase
    }
    for (const fase of [...all].reverse()) {
      if (gamesByFase.has(fase)) return fase
    }
    return MAIN_PHASES[0]
  }, [gamesByFase])

  // Build team analyses cache
  const teamAnalysisCache = useMemo(() => {
    const cache = new Map<string, TeamAnalysis>()
    const allTeams = new Set<string>()
    for (const g of copaGames) {
      allTeams.add(g.home_team)
      allTeams.add(g.away_team)
    }
    for (const team of allTeams) {
      cache.set(team, buildTeamAnalysis(team, standings))
    }
    return cache
  }, [copaGames, standings])

  const getAnalysis = (team: string) =>
    teamAnalysisCache.get(team) || buildTeamAnalysis(team, standings)

  // Featured confrontos (3a Fase with Série A teams)
  const featuredConfrontos = useMemo(() => {
    const faseGames = gamesByFase.get(activeFase) || []
    const confrontos = groupConfrontos(faseGames)

    // Sort: futures first, then by probability spread (most unbalanced = more interesting)
    return confrontos.sort((a, b) => {
      if (a.status !== b.status) {
        const order = { "em-andamento": 0, futuro: 1, finalizado: 2 }
        return order[a.status] - order[b.status]
      }
      const hA = getAnalysis(a.homeTeam)
      const aA = getAnalysis(a.awayTeam)
      const hB = getAnalysis(b.homeTeam)
      const aB = getAnalysis(b.awayTeam)
      // Higher combined strength = more interesting matchup
      return (hB.strengthIndex + aB.strengthIndex) - (hA.strengthIndex + aA.strengthIndex)
    })
  }, [gamesByFase, activeFase, teamAnalysisCache])

  if (copaGames.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="text-center py-20">
          <p className="text-gray-400 text-sm">Nenhum jogo da Copa do Brasil encontrado.</p>
        </div>
      </div>
    )
  }

  const displayPhases = activeFaseFilter
    ? MAIN_PHASES.filter((f) => f === activeFaseFilter)
    : MAIN_PHASES

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Hero header */}
      <div className="bg-[var(--color-green-dark)] rounded-xl p-6 md:p-8 shadow-lg mb-8">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="font-[family-name:var(--font-data)] text-[10px] text-green-300 uppercase tracking-widest mb-1">
              Analise estatistica
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-6xl text-white">
              COPA DO BRASIL
            </h1>
            <p className="font-[family-name:var(--font-heading)] text-xl text-[var(--color-yellow-accent)] mt-1">
              2026
            </p>
          </div>
          <div className="hidden md:block text-right">
            <p className="font-[family-name:var(--font-data)] text-[10px] text-green-200/70 uppercase">Fase atual</p>
            <p className="font-[family-name:var(--font-heading)] text-xl text-white">{activeFase}</p>
          </div>
        </div>
      </div>

        {/* Phase navigation */}
        <div className="flex gap-1.5 mb-6 flex-wrap">
          <button
            onClick={() => setActiveFaseFilter(null)}
            className={`font-[family-name:var(--font-data)] text-[10px] px-3 py-1.5 rounded-full transition-all ${
              !activeFaseFilter
                ? "bg-[var(--color-green-light)] text-[var(--color-green-primary)] font-medium"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            Todas
          </button>
          {MAIN_PHASES.map((fase) => {
            const has = gamesByFase.has(fase)
            return (
              <button
                key={fase}
                onClick={() => setActiveFaseFilter(fase)}
                disabled={!has}
                className={`font-[family-name:var(--font-data)] text-[10px] px-3 py-1.5 rounded-full transition-all ${
                  activeFaseFilter === fase
                    ? "bg-[var(--color-green-light)] text-[var(--color-green-primary)] font-medium"
                    : has
                      ? "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      : "bg-gray-50 text-gray-300 cursor-not-allowed"
                }`}
              >
                {fase}
              </button>
            )
          })}
        </div>

      {/* Main content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Confrontos */}
          <div className="lg:col-span-2 space-y-8">
            {displayPhases.map((fase) => {
              const faseGames = gamesByFase.get(fase)
              if (!faseGames) return null

              const confrontos = groupConfrontos(faseGames)
              const isActive = fase === activeFase

              // Sort confrontos
              confrontos.sort((a, b) => {
                const order = { "em-andamento": 0, futuro: 1, finalizado: 2 }
                if (a.status !== b.status) return order[a.status] - order[b.status]
                const strA = getAnalysis(a.homeTeam).strengthIndex + getAnalysis(a.awayTeam).strengthIndex
                const strB = getAnalysis(b.homeTeam).strengthIndex + getAnalysis(b.awayTeam).strengthIndex
                return strB - strA
              })

              return (
                <div key={fase}>
                  <div className="flex items-center gap-3 mb-4">
                    <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
                      {fase.toUpperCase()}
                    </h2>
                    <div className="flex-1 h-px bg-gray-200" />
                    {isActive && (
                      <span className="font-[family-name:var(--font-data)] text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-green-light)] text-[var(--color-green-primary)] animate-pulse-live">
                        FASE ATUAL
                      </span>
                    )}
                    <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-600">
                      {confrontos.length} confrontos
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {confrontos.map((c) => {
                      const hA = getAnalysis(c.homeTeam)
                      const aA = getAnalysis(c.awayTeam)
                      const prob = calcProbability(c, hA, aA)
                      return (
                        <ConfrontoCard
                          key={c.id}
                          confronto={c}
                          homeAnalysis={hA}
                          awayAnalysis={aA}
                          prob={prob}
                        />
                      )
                    })}
                  </div>
                </div>
              )
            })}

            {/* Earlier phases */}
            {EARLY_PHASES.some((f) => gamesByFase.has(f)) && !activeFaseFilter && (
              <div>
                <button
                  onClick={() => setShowEarlier(!showEarlier)}
                  className="flex items-center gap-2 font-[family-name:var(--font-data)] text-xs text-gray-500 hover:text-[var(--color-green-primary)] transition-colors"
                >
                  <span>{showEarlier ? "Ocultar" : "Ver"} fases anteriores ({EARLY_PHASES.reduce((acc, f) => acc + (gamesByFase.get(f)?.length || 0), 0)} jogos)</span>
                  <span>{showEarlier ? "\u25B2" : "\u25BC"}</span>
                </button>

                {showEarlier && (
                  <div className="mt-4 space-y-6">
                    {EARLY_PHASES.map((fase) => {
                      const faseGames = gamesByFase.get(fase)
                      if (!faseGames) return null
                      const confrontos = groupConfrontos(faseGames)

                      return (
                        <div key={fase}>
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-500">
                              {fase.toUpperCase()}
                            </h3>
                            <div className="flex-1 h-px bg-gray-100" />
                            <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-600">
                              {confrontos.length} confrontos
                            </span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            {confrontos.map((c) => {
                              const hA = getAnalysis(c.homeTeam)
                              const aA = getAnalysis(c.awayTeam)
                              const prob = calcProbability(c, hA, aA)
                              return (
                                <ConfrontoCard
                                  key={c.id}
                                  confronto={c}
                                  homeAnalysis={hA}
                                  awayAnalysis={aA}
                                  prob={prob}
                                />
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar: Competition stats */}
          <div className="space-y-6">
            <CompetitionStats copaGames={copaGames} standings={standings} />

            {/* Methodology card */}
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-3">METODOLOGIA</h3>
              <div className="space-y-3 font-[family-name:var(--font-data)] text-[10px] text-gray-500 leading-relaxed">
                <div>
                  <p className="text-gray-700 font-bold mb-0.5">Modelo de 4 Fatores</p>
                  <p>A probabilidade de classificacao combina quatro fatores ponderados para cada confronto:</p>
                </div>
                <div>
                  <p className="text-[var(--color-green-primary)] font-bold mb-0.5">1. Tradicao Historica — 40%</p>
                  <p>Peso baseado em titulos, tradicao e divisao do clube. Grandes como Flamengo, Palmeiras, Corinthians tem peso 90-95. Serie B/C recebem 30-50. Times de divisoes inferiores recebem peso minimo (25).</p>
                </div>
                <div>
                  <p className="text-[var(--color-green-primary)] font-bold mb-0.5">2. Desempenho no Brasileirao — 35%</p>
                  <p>Dados reais da Serie A: posicao na tabela, diferencial de xG por jogo, e forma nos ultimos 5 jogos. Times sem dados no Brasileirao tem estimativa reduzida baseada na tradicao.</p>
                </div>
                <div>
                  <p className="text-[var(--color-green-primary)] font-bold mb-0.5">3. Mando de Campo — 15%</p>
                  <p>Vantagem de jogar em casa no jogo decisivo (volta). O time mandante no jogo de volta recebe bonus de 12% na probabilidade.</p>
                </div>
                <div>
                  <p className="text-[var(--color-green-primary)] font-bold mb-0.5">4. Resultado da Ida — 10%</p>
                  <p>Vantagem no placar agregado apos o jogo de ida. Usa funcao sigmoide para escalar o impacto de cada gol de diferenca.</p>
                </div>
                <div>
                  <p className="text-gray-700 font-bold mb-0.5">Fator Dominante</p>
                  <p>Cada confronto exibe qual fator mais influencia o resultado previsto, ajudando a entender a logica da previsao.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
    </div>
  )
}
