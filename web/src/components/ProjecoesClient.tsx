"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import type { TeamStanding, CopaBrasilGame, WcTeamStats, WcGroup } from "@/lib/types"
import { getZoneColor, getZoneLabel } from "@/lib/calculations"
import {
  groupConfrontos,
  buildTeamAnalysis,
  calcProbability,
  MAIN_PHASES,
} from "@/lib/copa-brasil-model"
import { getTeamByName } from "@/lib/teams"

interface ProjecoesClientProps {
  standings: TeamStanding[]
  copaGames: CopaBrasilGame[]
  wcTeamStats: WcTeamStats[]
  wcGroups: WcGroup[]
}

const TOTAL_ROUNDS = 38

type Tab = "brasileirao" | "copa-brasil" | "copa-mundo" | "metodologia"

const tabs: { id: Tab; label: string }[] = [
  { id: "brasileirao", label: "Brasileirão" },
  { id: "copa-brasil", label: "Copa do Brasil" },
  { id: "copa-mundo", label: "Copa do Mundo" },
  { id: "metodologia", label: "Metodologia" },
]

export function ProjecoesClient({ standings, copaGames, wcTeamStats, wcGroups }: ProjecoesClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("brasileirao")

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="bg-[var(--color-green-dark)] rounded-xl p-6 md:p-8 shadow-lg mb-8">
        <p className="font-[family-name:var(--font-data)] text-[10px] text-green-300 uppercase tracking-widest mb-1">
          Modelos preditivos
        </p>
        <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-6xl text-white">
          PROJEÇÕES 2026
        </h1>
        <p className="text-white/70 text-sm mt-2 max-w-2xl">
          Projeções de final de temporada, probabilidades de classificação e simulações
          baseadas em dados reais — xPTS, modelo de 4 fatores e ranking FIFA.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-8 overflow-x-auto pb-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`font-[family-name:var(--font-data)] text-[11px] px-4 py-2 rounded-full transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? "bg-[var(--color-green-light)] text-[var(--color-green-primary)] font-medium"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "brasileirao" && <BrasileraoProjection standings={standings} />}
      {activeTab === "copa-brasil" && <CopaBrasilProjection copaGames={copaGames} standings={standings} />}
      {activeTab === "copa-mundo" && <CopaMundoProjection wcTeamStats={wcTeamStats} wcGroups={wcGroups} />}
      {activeTab === "metodologia" && <Metodologia />}
    </div>
  )
}

/* ═══════════════════════════════════════════
   BRASILEIRÃO PROJECTION
   ═══════════════════════════════════════════ */

interface ProjectedTeam {
  team: string
  currentPoints: number
  played: number
  xPTSPerGame: number
  projectedPoints: number
  currentPosition: number
  projectedPosition: number
  zone: string
}

function BrasileraoProjection({ standings }: { standings: TeamStanding[] }) {
  const projections = useMemo(() => {
    if (standings.length === 0 || standings[0].played < 3) return []

    return standings
      .map((s, currentIdx): ProjectedTeam => {
        const remaining = TOTAL_ROUNDS - s.played
        const xPTSPerGame = s.played > 0 ? s.xPTS / s.played : 0
        const projectedRemaining = xPTSPerGame * remaining
        const projectedPoints = Math.round(s.points + projectedRemaining)

        return {
          team: s.team,
          currentPoints: s.points,
          played: s.played,
          xPTSPerGame,
          projectedPoints,
          currentPosition: currentIdx + 1,
          projectedPosition: 0,
          zone: "none",
        }
      })
      .sort((a, b) => b.projectedPoints - a.projectedPoints)
      .map((t, i) => ({
        ...t,
        projectedPosition: i + 1,
        zone: i < 4 ? "libertadores" : i < 6 ? "pre-libertadores" : i < 12 ? "sulamericana" : i >= 16 ? "rebaixamento" : "none",
      }))
  }, [standings])

  if (projections.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-sm">Dados insuficientes para projeção (mínimo 3 rodadas)</p>
      </div>
    )
  }

  const maxProjected = Math.max(...projections.map(p => p.projectedPoints))

  const zoneBarColors: Record<string, string> = {
    libertadores: "bg-green-700",
    "pre-libertadores": "bg-green-400",
    sulamericana: "bg-blue-400",
    none: "bg-gray-300",
    rebaixamento: "bg-red-400",
  }

  const zoneNames: Record<string, string> = {
    libertadores: "Libertadores",
    "pre-libertadores": "Pré-Libertadores",
    sulamericana: "Sul-Americana",
    none: "",
    rebaixamento: "Rebaixamento",
  }

  // Insights
  const biggestRise = projections.reduce((best, t) => {
    const delta = t.currentPosition - t.projectedPosition
    return delta > (best ? best.currentPosition - best.projectedPosition : 0) ? t : best
  }, projections[0])

  const biggestDrop = projections.reduce((worst, t) => {
    const delta = t.projectedPosition - t.currentPosition
    return delta > (worst ? worst.projectedPosition - worst.currentPosition : 0) ? t : worst
  }, projections[0])

  return (
    <div className="space-y-6">
      {/* Insight cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {biggestRise && biggestRise.currentPosition - biggestRise.projectedPosition > 0 && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="font-[family-name:var(--font-data)] text-[10px] text-green-600 uppercase tracking-wider mb-1">Maior subida projetada</p>
            <p className="font-[family-name:var(--font-heading)] text-xl text-green-800">
              {biggestRise.team}
            </p>
            <p className="font-[family-name:var(--font-data)] text-xs text-green-600 mt-1">
              {biggestRise.currentPosition}º atual → {biggestRise.projectedPosition}º projetado ({biggestRise.currentPosition - biggestRise.projectedPosition} posições)
            </p>
          </div>
        )}
        {biggestDrop && biggestDrop.projectedPosition - biggestDrop.currentPosition > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="font-[family-name:var(--font-data)] text-[10px] text-red-600 uppercase tracking-wider mb-1">Maior queda projetada</p>
            <p className="font-[family-name:var(--font-heading)] text-xl text-red-800">
              {biggestDrop.team}
            </p>
            <p className="font-[family-name:var(--font-data)] text-xs text-red-600 mt-1">
              {biggestDrop.currentPosition}º atual → {biggestDrop.projectedPosition}º projetado ({biggestDrop.projectedPosition - biggestDrop.currentPosition} posições)
            </p>
          </div>
        )}
      </div>

      {/* Projection table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
            PROJEÇÃO FINAL DE TEMPORADA
          </h2>
          <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 mt-1">
            Baseado no xPTS/jogo × rodadas restantes + pontos atuais — projetado para 38 rodadas
          </p>
        </div>

        <div className="p-6 space-y-2">
          {projections.map((team) => {
            const teamInfo = getTeamByName(team.team)
            const positionDelta = team.currentPosition - team.projectedPosition

            return (
              <div key={team.team} className="flex items-center gap-3">
                {/* Position */}
                <span className="font-[family-name:var(--font-data)] text-xs text-gray-400 w-5 text-right">
                  {team.projectedPosition}
                </span>

                {/* Zone indicator */}
                <span className={`w-1.5 h-6 rounded-full ${zoneBarColors[team.zone]}`} />

                {/* Logo + Team name */}
                <div className="flex items-center gap-2 w-40">
                  {teamInfo && (
                    <Image src={teamInfo.logo} alt={teamInfo.name} width={20} height={20} className="object-contain" />
                  )}
                  <span className="text-sm font-medium text-gray-900 truncate">
                    {teamInfo?.name || team.team}
                  </span>
                </div>

                {/* Position delta */}
                <span className={`font-[family-name:var(--font-data)] text-[10px] w-8 text-center ${
                  positionDelta > 0 ? "text-green-600" : positionDelta < 0 ? "text-red-500" : "text-gray-300"
                }`}>
                  {positionDelta > 0 ? `+${positionDelta}` : positionDelta < 0 ? `${positionDelta}` : "="}
                </span>

                {/* Bar */}
                <div className="flex-1 flex items-center gap-2">
                  <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden relative">
                    <div
                      className="absolute left-0 top-0 h-full bg-gray-900/20 rounded-full"
                      style={{ width: `${(team.currentPoints / maxProjected) * 100}%` }}
                    />
                    <div
                      className={`absolute left-0 top-0 h-full ${zoneBarColors[team.zone]} rounded-full opacity-50`}
                      style={{ width: `${(team.projectedPoints / maxProjected) * 100}%` }}
                    />
                    <div
                      className="absolute left-0 top-0 h-full flex items-center"
                      style={{ width: `${(team.currentPoints / maxProjected) * 100}%` }}
                    >
                      <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-700 ml-1.5 font-bold">
                        {team.currentPoints}
                      </span>
                    </div>
                  </div>

                  {/* Projected points */}
                  <span className="font-[family-name:var(--font-heading)] text-base text-gray-900 w-10 text-right">
                    {team.projectedPoints}
                  </span>
                </div>

                {/* Zone label (desktop only) */}
                <span className={`hidden md:inline font-[family-name:var(--font-data)] text-[9px] w-24 text-right ${
                  team.zone === "libertadores" ? "text-green-700" :
                  team.zone === "pre-libertadores" ? "text-green-500" :
                  team.zone === "sulamericana" ? "text-blue-500" :
                  team.zone === "rebaixamento" ? "text-red-500" : "text-gray-300"
                }`}>
                  {zoneNames[team.zone]}
                </span>
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="px-6 py-3 border-t border-gray-100 flex flex-wrap gap-3 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-700" />
            <span className="text-gray-500">Libertadores (1-4)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-400" />
            <span className="text-gray-500">Pré-Liberta (5-6)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-gray-500">Sul-Americana (7-12)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            <span className="text-gray-500">Rebaixamento (17-20)</span>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <span className="w-3 h-3 rounded bg-gray-900/20" />
            <span className="text-gray-400">Pontos atuais</span>
            <span className="w-3 h-3 rounded bg-gray-300/50 ml-2" />
            <span className="text-gray-400">Projetados</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   COPA DO BRASIL PROJECTION
   ═══════════════════════════════════════════ */

function CopaBrasilProjection({ copaGames, standings }: { copaGames: CopaBrasilGame[]; standings: TeamStanding[] }) {
  const gamesByFase = useMemo(() => {
    const map = new Map<string, CopaBrasilGame[]>()
    for (const g of copaGames) {
      if (!map.has(g.fase)) map.set(g.fase, [])
      map.get(g.fase)!.push(g)
    }
    return map
  }, [copaGames])

  // Active phase: most advanced with pending games
  const activeFase = useMemo(() => {
    const all = [...MAIN_PHASES].reverse()
    for (const fase of all) {
      const faseGames = gamesByFase.get(fase)
      if (faseGames?.some((g) => g.status !== "FT")) return fase
    }
    for (const fase of all) {
      if (gamesByFase.has(fase)) return fase
    }
    return MAIN_PHASES[0]
  }, [gamesByFase])

  // Build team analyses cache
  const teamAnalysisCache = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof buildTeamAnalysis>>()
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

  // Get confrontos for active phase
  const confrontos = useMemo(() => {
    const faseGames = gamesByFase.get(activeFase) || []
    const all = groupConfrontos(faseGames)
    return all
      .filter(c => c.status !== "finalizado")
      .sort((a, b) => {
        const strA = getAnalysis(a.homeTeam).strengthIndex + getAnalysis(a.awayTeam).strengthIndex
        const strB = getAnalysis(b.homeTeam).strengthIndex + getAnalysis(b.awayTeam).strengthIndex
        return strB - strA
      })
  }, [gamesByFase, activeFase, teamAnalysisCache])

  if (copaGames.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-sm">Nenhum jogo da Copa do Brasil encontrado.</p>
      </div>
    )
  }

  if (confrontos.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-sm">Todos os confrontos da {activeFase} já foram encerrados.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Phase header */}
      <div className="flex items-center gap-3">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
          {activeFase.toUpperCase()}
        </h2>
        <div className="flex-1 h-px bg-gray-200" />
        <span className="font-[family-name:var(--font-data)] text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-green-light)] text-[var(--color-green-primary)]">
          {confrontos.length} confrontos pendentes
        </span>
      </div>

      {/* Confrontos list */}
      <div className="space-y-4">
        {confrontos.map((c) => {
          const hA = getAnalysis(c.homeTeam)
          const aA = getAnalysis(c.awayTeam)
          const prob = calcProbability(c, hA, aA)
          const homeLogo = copaGames.find(g => g.home_team === c.homeTeam)?.home_logo || c.homeLogo
          const awayLogo = copaGames.find(g => g.away_team === c.awayTeam)?.away_logo || c.awayLogo

          return (
            <div key={c.id} className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between gap-4">
                {/* Home team */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  {homeLogo ? (
                    <img src={homeLogo} alt={c.homeTeam} className="w-8 h-8 object-contain" loading="lazy" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--color-green-primary)] flex items-center justify-center text-white text-[9px] font-bold">
                      {c.homeTeam.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.homeTeam}</p>
                    {hA.standing && (
                      <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-500">
                        {hA.position}º no BR · Forca {hA.strengthIndex}
                      </p>
                    )}
                  </div>
                </div>

                {/* Probability */}
                <div className="flex flex-col items-center w-40 flex-shrink-0">
                  <div className="flex items-center gap-2 w-full mb-1">
                    <span className="font-[family-name:var(--font-heading)] text-lg text-[var(--color-green-primary)]">
                      {prob.homeClassify}%
                    </span>
                    <div className="flex-1 h-2.5 rounded-full overflow-hidden flex bg-gray-200">
                      <div className="h-full bg-[var(--color-green-primary)] transition-all" style={{ width: `${prob.homeClassify}%` }} />
                      <div className="h-full bg-blue-500 transition-all" style={{ width: `${prob.awayClassify}%` }} />
                    </div>
                    <span className="font-[family-name:var(--font-heading)] text-lg text-blue-600">
                      {prob.awayClassify}%
                    </span>
                  </div>
                  <span className="font-[family-name:var(--font-data)] text-[8px] text-gray-400 uppercase">
                    {prob.dominantFactor}
                  </span>
                  {prob.scenarioText && (
                    <span className="font-[family-name:var(--font-data)] text-[9px] text-[var(--color-yellow-dark)] mt-0.5">
                      {prob.scenarioText}
                    </span>
                  )}
                </div>

                {/* Away team */}
                <div className="flex items-center gap-3 flex-1 min-w-0 justify-end text-right">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.awayTeam}</p>
                    {aA.standing && (
                      <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-500">
                        {aA.position}º no BR · Forca {aA.strengthIndex}
                      </p>
                    )}
                  </div>
                  {awayLogo ? (
                    <img src={awayLogo} alt={c.awayTeam} className="w-8 h-8 object-contain" loading="lazy" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-[9px] font-bold">
                      {c.awayTeam.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              {/* Aggregate score if in progress */}
              {c.status === "em-andamento" && (
                <div className="mt-3 pt-3 border-t border-gray-100 text-center">
                  <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                    Agregado: {c.aggHome} - {c.aggAway}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Model note */}
      <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 leading-relaxed">
        Modelo de 4 fatores: Tradição histórica (40%) + Desempenho no Brasileirão (35%) + Mando de campo (15%) + Resultado da ida (10%).
      </p>
    </div>
  )
}

/* ═══════════════════════════════════════════
   COPA DO MUNDO PROJECTION
   ═══════════════════════════════════════════ */

function CopaMundoProjection({ wcTeamStats, wcGroups }: { wcTeamStats: WcTeamStats[]; wcGroups: WcGroup[] }) {
  if (wcTeamStats.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-sm">Dados da Copa do Mundo ainda não disponíveis.</p>
      </div>
    )
  }

  // Top 10 title contenders
  const topContenders = [...wcTeamStats]
    .sort((a, b) => b.probability_champion - a.probability_champion)
    .slice(0, 10)

  const maxChampProb = topContenders[0]?.probability_champion || 1

  // Brazil
  const brazil = wcTeamStats.find(t => t.team_name.includes("Brazil"))

  // Groups with advance probabilities
  const groupNames = [...new Set(wcGroups.map(g => g.group_name))].sort()

  return (
    <div className="space-y-8">
      {/* Brazil highlight */}
      {brazil && (
        <div className="bg-[var(--color-green-dark)] rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4">
            {brazil.team_logo && (
              <img src={brazil.team_logo} alt="Brasil" className="w-14 h-14 object-contain" />
            )}
            <div>
              <p className="font-[family-name:var(--font-data)] text-[10px] text-green-300 uppercase tracking-wider">Brasil na Copa do Mundo 2026</p>
              <p className="font-[family-name:var(--font-heading)] text-3xl text-white">
                {brazil.probability_champion.toFixed(1)}% de chance de título
              </p>
              <p className="font-[family-name:var(--font-data)] text-xs text-white/70 mt-1">
                Grupo {brazil.wc_group} · FIFA #{brazil.fifa_ranking} · {brazil.probability_advance.toFixed(1)}% de avançar de fase
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Top 10 title contenders */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
            TOP 10 FAVORITOS AO TÍTULO
          </h2>
          <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 mt-1">
            Probabilidade de conquistar a Copa do Mundo 2026
          </p>
        </div>
        <div className="p-6 space-y-3">
          {topContenders.map((team, i) => {
            const isBrazil = team.team_name.includes("Brazil")
            return (
              <div key={team.team_id} className={`flex items-center gap-3 ${isBrazil ? "bg-[var(--color-green-light)] rounded-lg px-2 py-1 -mx-2" : ""}`}>
                <span className="font-[family-name:var(--font-data)] text-xs text-gray-400 w-5 text-right">
                  {i + 1}
                </span>
                {team.team_logo && (
                  <img src={team.team_logo} alt={team.team_name} className="w-6 h-6 object-contain" />
                )}
                <span className={`text-sm w-32 truncate ${isBrazil ? "font-bold text-[var(--color-green-primary)]" : "text-gray-700"}`}>
                  {team.team_name}
                </span>
                <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 w-10">
                  #{team.fifa_ranking}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isBrazil ? "bg-[var(--color-green-primary)]" : "bg-[var(--color-yellow-accent)]"}`}
                    style={{ width: `${(team.probability_champion / maxChampProb) * 100}%` }}
                  />
                </div>
                <span className="font-[family-name:var(--font-heading)] text-base text-gray-900 w-14 text-right">
                  {team.probability_champion.toFixed(1)}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Groups advancement */}
      <div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900 mb-4">
          PROBABILIDADE DE AVANÇO POR GRUPO
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groupNames.map(groupName => {
            const groupTeams = wcGroups
              .filter(g => g.group_name === groupName)
              .sort((a, b) => a.rank - b.rank)

            return (
              <div key={groupName} className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-3">
                  {groupName.replace("Group ", "GRUPO ")}
                </h3>
                <div className="space-y-2">
                  {groupTeams.map(team => {
                    const stats = wcTeamStats.find(s => s.team_id === team.team_id)
                    const advanceProb = stats?.probability_advance || 0
                    const isBrazil = team.team_name.includes("Brazil")

                    return (
                      <div key={team.team_id} className="flex items-center gap-2">
                        {team.team_logo && (
                          <img src={team.team_logo} alt={team.team_name} className="w-5 h-5 object-contain" />
                        )}
                        <span className={`text-xs flex-1 truncate ${isBrazil ? "font-bold text-[var(--color-green-primary)]" : "text-gray-600"}`}>
                          {team.team_name}
                        </span>
                        <div className="w-16 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${advanceProb >= 70 ? "bg-green-500" : advanceProb >= 40 ? "bg-yellow-500" : "bg-red-400"}`}
                            style={{ width: `${advanceProb}%` }}
                          />
                        </div>
                        <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-700 w-10 text-right">
                          {advanceProb.toFixed(0)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════
   METODOLOGIA
   ═══════════════════════════════════════════ */

function Metodologia() {
  return (
    <div className="space-y-6 max-w-3xl">
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900 mb-6">
          METODOLOGIA
        </h2>
        <p className="text-sm text-gray-600 leading-relaxed mb-6">
          Todas as projeções do Futedata são baseadas em modelos estatísticos alimentados por dados reais de jogos.
          Nenhuma projeção é opinativa — os números falam.
        </p>

        <div className="space-y-8">
          {/* Brasileirão model */}
          <div>
            <h3 className="font-[family-name:var(--font-heading)] text-xl text-[var(--color-green-primary)] mb-3">
              1. BRASILEIRÃO — PROJEÇÃO xPTS
            </h3>
            <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
              <p>
                A projeção de final de temporada usa o conceito de <strong>xPTS (pontos esperados)</strong> — uma métrica derivada
                do xG (gols esperados) de cada time que indica quantos pontos um time <em>deveria</em> ter baseado na qualidade
                das chances criadas e concedidas.
              </p>
              <div className="bg-gray-50 rounded-lg p-4 font-[family-name:var(--font-data)] text-xs">
                <p className="text-gray-500 mb-1">Fórmula:</p>
                <p className="text-gray-900 font-medium">
                  Pontos Projetados = Pontos Atuais + (xPTS / Jogos) × (38 - Jogos)
                </p>
              </div>
              <p>
                A classificação final é reordenada pela pontuação projetada, e as zonas (Libertadores, Sul-Americana,
                Rebaixamento) são atribuídas pela nova posição.
              </p>
              <p className="text-gray-400 text-xs">
                Limitações: não considera calendário restante, mando de campo específico, contratações ou suspensões.
              </p>
            </div>
          </div>

          {/* Copa do Brasil model */}
          <div>
            <h3 className="font-[family-name:var(--font-heading)] text-xl text-[var(--color-green-primary)] mb-3">
              2. COPA DO BRASIL — MODELO DE 4 FATORES
            </h3>
            <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
              <p>
                A probabilidade de classificação em cada confronto é calculada por um modelo que pondera quatro fatores:
              </p>
              <div className="space-y-2">
                {[
                  { weight: "40%", name: "Tradição Histórica", desc: "Peso baseado em títulos, tradição e divisão do clube. Tier 1 (Flamengo, Palmeiras): 90-95. Tier 5 (divisões inferiores): 10-25." },
                  { weight: "35%", name: "Desempenho no Brasileirão", desc: "Posição na tabela, diferencial de xG por jogo e forma nos últimos 5 jogos. Normalizado para 0-100." },
                  { weight: "15%", name: "Mando de Campo", desc: "Vantagem de jogar em casa no jogo decisivo (volta). Bônus de 12% na probabilidade para o mandante." },
                  { weight: "10%", name: "Resultado da Ida", desc: "Vantagem no placar agregado. Usa função sigmoide para escalar o impacto de cada gol de diferença." },
                ].map(factor => (
                  <div key={factor.name} className="flex gap-3 items-start">
                    <span className="font-[family-name:var(--font-heading)] text-lg text-[var(--color-green-primary)] w-12 flex-shrink-0">
                      {factor.weight}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900">{factor.name}</p>
                      <p className="text-gray-500 text-xs">{factor.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <p>
                A combinação ponderada produz uma probabilidade clampeada entre 3% e 97%.
                Cada confronto também exibe o <strong>fator dominante</strong> — qual dos 4 fatores mais influencia o resultado.
              </p>
            </div>
          </div>

          {/* Copa do Mundo model */}
          <div>
            <h3 className="font-[family-name:var(--font-heading)] text-xl text-[var(--color-green-primary)] mb-3">
              3. COPA DO MUNDO — MODELO ELO PREDITIVO
            </h3>
            <div className="space-y-3 text-sm text-gray-600 leading-relaxed">
              <p>
                As probabilidades da Copa do Mundo 2026 são calculadas com um modelo Elo preditivo que considera:
              </p>
              <ul className="list-disc pl-5 space-y-1 text-xs text-gray-500">
                <li>Ranking FIFA atual de cada seleção</li>
                <li>Desempenho nas eliminatórias (pontos, vitórias, saldo de gols)</li>
                <li>Força do grupo sorteado (adversários diretos)</li>
                <li>Simulação Monte Carlo com 10.000 iterações para cada cenário</li>
              </ul>
              <p>
                O modelo gera duas métricas principais: <strong>probabilidade de avançar da fase de grupos</strong> e
                <strong> probabilidade de ser campeão</strong>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
