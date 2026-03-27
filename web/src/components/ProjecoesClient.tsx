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

function TeamLogo({ name, logo, size = 8 }: { name: string; logo: string | null; size?: number }) {
  if (logo) {
    return <img src={logo} alt={name} className={`w-${size} h-${size} object-contain`} style={{ width: size * 4, height: size * 4 }} loading="lazy" />
  }
  const initials = name.split(" ").length >= 2
    ? (name.split(" ")[0][0] + name.split(" ").slice(-1)[0][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase()
  return (
    <div className="rounded-full bg-gray-300 flex items-center justify-center text-white font-bold" style={{ width: size * 4, height: size * 4, fontSize: size * 1.5 }}>
      {initials}
    </div>
  )
}

function CopaBrasilProjection({ copaGames, standings }: { copaGames: CopaBrasilGame[]; standings: TeamStanding[] }) {
  const gamesByFase = useMemo(() => {
    const map = new Map<string, CopaBrasilGame[]>()
    for (const g of copaGames) {
      if (!map.has(g.fase)) map.set(g.fase, [])
      map.get(g.fase)!.push(g)
    }
    return map
  }, [copaGames])

  const activeFase = useMemo(() => {
    const all = [...MAIN_PHASES].reverse()
    for (const fase of all) {
      if (gamesByFase.get(fase)?.some((g) => g.status !== "FT")) return fase
    }
    for (const fase of all) {
      if (gamesByFase.has(fase)) return fase
    }
    return MAIN_PHASES[0]
  }, [gamesByFase])

  const teamAnalysisCache = useMemo(() => {
    const cache = new Map<string, ReturnType<typeof buildTeamAnalysis>>()
    const allTeams = new Set<string>()
    for (const g of copaGames) { allTeams.add(g.home_team); allTeams.add(g.away_team) }
    for (const team of allTeams) cache.set(team, buildTeamAnalysis(team, standings))
    return cache
  }, [copaGames, standings])

  const getAnalysis = (team: string) => teamAnalysisCache.get(team) || buildTeamAnalysis(team, standings)

  // Build projected results for the active phase
  const projectedTeams = useMemo(() => {
    const faseGames = gamesByFase.get(activeFase) || []
    const confrontos = groupConfrontos(faseGames)

    return confrontos.map(c => {
      const hA = getAnalysis(c.homeTeam)
      const aA = getAnalysis(c.awayTeam)
      const prob = calcProbability(c, hA, aA)

      // Find logos from games data
      const homeLogo = copaGames.find(g => g.home_team === c.homeTeam)?.home_logo || c.homeLogo
      const awayLogo = copaGames.find(g => g.away_team === c.awayTeam)?.away_logo || c.awayLogo

      if (c.status === "finalizado") {
        return {
          team: c.winner || c.homeTeam,
          logo: c.winner === c.awayTeam ? awayLogo : homeLogo,
          badge: "CLASSIFICADO" as const,
          status: "finalizado" as const,
        }
      }

      const favorite = prob.homeClassify >= prob.awayClassify ? c.homeTeam : c.awayTeam
      const favoriteLogo = favorite === c.awayTeam ? awayLogo : homeLogo
      return {
        team: favorite,
        logo: favoriteLogo,
        badge: "FAVORITO" as const,
        status: "pendente" as const,
      }
    })
  }, [gamesByFase, activeFase, teamAnalysisCache, copaGames])

  if (copaGames.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-sm">Nenhum jogo da Copa do Brasil encontrado.</p>
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
        <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">
          Projeção de classificados para a próxima fase
        </span>
      </div>

      {/* Projected teams grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {projectedTeams.map((item, i) => (
          <div
            key={i}
            className={`flex items-center gap-3 rounded-xl border p-4 ${
              item.badge === "CLASSIFICADO"
                ? "bg-green-50 border-green-200"
                : "bg-white border-gray-200 shadow-sm"
            }`}
          >
            <TeamLogo name={item.team} logo={item.logo} size={8} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{item.team}</p>
            </div>
            <span className={`font-[family-name:var(--font-data)] text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
              item.badge === "CLASSIFICADO"
                ? "bg-green-600 text-white"
                : "bg-[var(--color-yellow-accent)] text-[#0d1117]"
            }`}>
              {item.badge === "CLASSIFICADO" ? "CLASSIFICADO" : "FAVORITO"}
            </span>
          </div>
        ))}
      </div>

      {/* Link to full details */}
      <a
        href="/copa-brasil"
        className="inline-flex items-center gap-1 font-[family-name:var(--font-data)] text-xs text-[var(--color-green-primary)] hover:underline"
      >
        Ver probabilidades detalhadas →
      </a>
    </div>
  )
}

/* ═══════════════════════════════════════════
   COPA DO MUNDO PROJECTION — BRACKET
   ═══════════════════════════════════════════ */

interface BracketTeam {
  name: string
  logo: string | null
  teamId: number
  rank: number
  probAdvance: number
  probChampion: number
  isBrazil: boolean
}

function CopaMundoProjection({ wcTeamStats, wcGroups }: { wcTeamStats: WcTeamStats[]; wcGroups: WcGroup[] }) {
  const bracket = useMemo(() => {
    if (wcTeamStats.length === 0 || wcGroups.length === 0) return null

    // Project group stage: top 2 from each group by rank
    const groupNames = [...new Set(wcGroups.map(g => g.group_name))].sort()
    const groups = groupNames.map(name => {
      const teams = wcGroups
        .filter(g => g.group_name === name)
        .sort((a, b) => a.rank - b.rank)
        .map((g): BracketTeam => {
          const stats = wcTeamStats.find(s => s.team_id === g.team_id)
          return {
            name: g.team_name,
            logo: g.team_logo,
            teamId: g.team_id,
            rank: g.rank,
            probAdvance: stats?.probability_advance ?? 0,
            probChampion: stats?.probability_champion ?? 0,
            isBrazil: g.team_name.includes("Brazil") || g.team_name.includes("Brasil"),
          }
        })
      return { name, teams }
    })

    // Collect advancing teams: top 2 per group + 8 best 3rd-place
    const advancing: BracketTeam[] = []
    const thirdPlace: BracketTeam[] = []
    for (const group of groups) {
      if (group.teams[0]) advancing.push(group.teams[0])
      if (group.teams[1]) advancing.push(group.teams[1])
      if (group.teams[2]) thirdPlace.push(group.teams[2])
    }
    const best3rd = [...thirdPlace].sort((a, b) => b.probAdvance - a.probAdvance).slice(0, 8)
    const best3rdIds = new Set(best3rd.map(t => t.teamId))

    // All 32 advancing, seeded by probability_champion
    const all32 = [...advancing, ...best3rd].sort((a, b) => b.probChampion - a.probChampion)

    // Take top 16 for R16 bracket
    const seeded = all32.slice(0, 16)

    // Standard bracket seeding: 1v16, 8v9, 5v12, 4v13, 3v14, 6v11, 7v10, 2v15
    const bracketOrder: [number, number][] = [
      [0, 15], [7, 8], [4, 11], [3, 12],
      [2, 13], [5, 10], [6, 9], [1, 14],
    ]

    const oitavas = bracketOrder.map(([a, b]) => ({
      team1: seeded[a],
      team2: seeded[b],
    }))

    const pickWinner = (t1: BracketTeam, t2: BracketTeam) =>
      t1.probChampion >= t2.probChampion ? t1 : t2

    const oitavasWinners = oitavas.map(m => pickWinner(m.team1, m.team2))

    // Quartas: adjacent oitavas winners
    const quartas: { team1: BracketTeam; team2: BracketTeam }[] = []
    for (let i = 0; i < oitavasWinners.length; i += 2) {
      quartas.push({ team1: oitavasWinners[i], team2: oitavasWinners[i + 1] })
    }
    const quartasWinners = quartas.map(m => pickWinner(m.team1, m.team2))

    // Semi
    const semi: { team1: BracketTeam; team2: BracketTeam }[] = []
    for (let i = 0; i < quartasWinners.length; i += 2) {
      semi.push({ team1: quartasWinners[i], team2: quartasWinners[i + 1] })
    }
    const semiWinners = semi.map(m => pickWinner(m.team1, m.team2))

    // Final
    const final_ = semiWinners.length >= 2
      ? { team1: semiWinners[0], team2: semiWinners[1] }
      : null

    const champion = final_ ? pickWinner(final_.team1, final_.team2) : null

    return { groups, best3rdIds, oitavas, quartas, semi, final: final_, champion }
  }, [wcTeamStats, wcGroups])

  if (!bracket) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-sm">Dados da Copa do Mundo ainda não disponíveis.</p>
      </div>
    )
  }

  const brazil = wcTeamStats.find(t => t.team_name.includes("Brazil") || t.team_name.includes("Brasil"))

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

      {/* FASE DE GRUPOS */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">FASE DE GRUPOS</h2>
          <div className="flex-1 h-px bg-gray-200" />
          <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">12 grupos · Top 2 projetados</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {bracket.groups.map(group => (
            <div key={group.name} className="bg-white border border-gray-200 rounded-xl p-3">
              <h3 className="font-[family-name:var(--font-heading)] text-sm text-gray-900 mb-2">
                {group.name.replace("Group ", "GRUPO ")}
              </h3>
              <div className="space-y-1">
                {group.teams.map((team, i) => {
                  const advances = i < 2 || bracket.best3rdIds.has(team.teamId)
                  return (
                    <div key={team.teamId} className={`flex items-center gap-1.5 rounded px-1.5 py-0.5 ${
                      team.isBrazil ? "bg-green-50 border border-green-200" :
                      advances ? "bg-gray-50" : "opacity-35"
                    }`}>
                      {team.logo && <img src={team.logo} alt={team.name} className="w-4 h-4 object-contain" />}
                      <span className={`text-[11px] truncate flex-1 ${
                        team.isBrazil ? "text-green-700 font-bold" :
                        advances ? "text-gray-700" : "text-gray-400"
                      }`}>
                        {team.name}
                      </span>
                      {advances && (
                        <span className={`text-[8px] font-[family-name:var(--font-data)] ${
                          i < 2 ? "text-green-600" : "text-yellow-600"
                        }`}>
                          {team.probAdvance.toFixed(0)}%
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Connector */}
      <BracketConnector label="32 classificados" />

      {/* OITAVAS DE FINAL */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">OITAVAS DE FINAL</h2>
          <div className="flex-1 h-px bg-gray-200" />
          <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">8 confrontos · Favorito em destaque</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {bracket.oitavas.map((match, i) => (
            <BracketMatchCard key={i} team1={match.team1} team2={match.team2} />
          ))}
        </div>
      </div>

      <BracketConnector />

      {/* QUARTAS DE FINAL */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">QUARTAS DE FINAL</h2>
          <div className="flex-1 h-px bg-gray-200" />
          <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">4 confrontos</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {bracket.quartas.map((match, i) => (
            <BracketMatchCard key={i} team1={match.team1} team2={match.team2} large />
          ))}
        </div>
      </div>

      <BracketConnector />

      {/* SEMIFINAIS */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">SEMIFINAIS</h2>
          <div className="flex-1 h-px bg-gray-200" />
          <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">4 seleções · Probabilidade de título</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bracket.semi.map((match, i) => {
            const fav = match.team1.probChampion >= match.team2.probChampion ? match.team1 : match.team2
            const hasBrazil = match.team1.isBrazil || match.team2.isBrazil
            return (
              <div key={i} className={`rounded-xl border-2 p-5 ${
                hasBrazil ? "bg-green-50 border-green-300" : "bg-white border-gray-200 shadow-sm"
              }`}>
                <div className={`flex items-center gap-3 ${match.team1 !== fav ? "opacity-60" : ""}`}>
                  {match.team1.logo && <img src={match.team1.logo} alt={match.team1.name} className="w-8 h-8 object-contain" />}
                  <span className={`flex-1 ${match.team1.isBrazil ? "text-green-700 font-bold" : "text-gray-900"}`}>
                    {match.team1.name}
                  </span>
                  <span className="font-[family-name:var(--font-heading)] text-lg text-gray-900">
                    {match.team1.probChampion.toFixed(1)}%
                  </span>
                </div>
                <div className="flex items-center gap-2 my-3">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[9px] text-gray-300">VS</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <div className={`flex items-center gap-3 ${match.team2 !== fav ? "opacity-60" : ""}`}>
                  {match.team2.logo && <img src={match.team2.logo} alt={match.team2.name} className="w-8 h-8 object-contain" />}
                  <span className={`flex-1 ${match.team2.isBrazil ? "text-green-700 font-bold" : "text-gray-900"}`}>
                    {match.team2.name}
                  </span>
                  <span className="font-[family-name:var(--font-heading)] text-lg text-gray-900">
                    {match.team2.probChampion.toFixed(1)}%
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <BracketConnector />

      {/* FINAL */}
      {bracket.final && (
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">FINAL</h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          <div className={`rounded-xl border-2 p-6 max-w-md mx-auto ${
            bracket.final.team1.isBrazil || bracket.final.team2.isBrazil
              ? "bg-green-50 border-green-400"
              : "bg-white border-[var(--color-yellow-accent)]"
          }`}>
            <div className="flex items-center justify-center gap-6">
              <div className="flex flex-col items-center gap-2">
                {bracket.final.team1.logo && (
                  <img src={bracket.final.team1.logo} alt={bracket.final.team1.name} className="w-12 h-12 object-contain" />
                )}
                <span className={`text-sm font-medium ${bracket.final.team1.isBrazil ? "text-green-700 font-bold" : "text-gray-900"}`}>
                  {bracket.final.team1.name}
                </span>
              </div>
              <span className="font-[family-name:var(--font-heading)] text-3xl text-gray-300">x</span>
              <div className="flex flex-col items-center gap-2">
                {bracket.final.team2.logo && (
                  <img src={bracket.final.team2.logo} alt={bracket.final.team2.name} className="w-12 h-12 object-contain" />
                )}
                <span className={`text-sm font-medium ${bracket.final.team2.isBrazil ? "text-green-700 font-bold" : "text-gray-900"}`}>
                  {bracket.final.team2.name}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <BracketConnector />

      {/* CAMPEAO */}
      {bracket.champion && (
        <div className="flex flex-col items-center">
          <div className={`rounded-2xl border-2 px-10 py-8 text-center shadow-lg ${
            bracket.champion.isBrazil
              ? "bg-gradient-to-b from-green-600 to-green-800 border-[var(--color-yellow-accent)]"
              : "bg-gradient-to-b from-[var(--color-green-dark)] to-[#0a1628] border-[var(--color-yellow-accent)]"
          }`}>
            <p className="font-[family-name:var(--font-data)] text-[10px] text-[var(--color-yellow-accent)] uppercase tracking-[0.2em] mb-3">
              Campeão projetado
            </p>
            {bracket.champion.logo && (
              <img src={bracket.champion.logo} alt={bracket.champion.name} className="w-20 h-20 object-contain mx-auto mb-3" />
            )}
            <p className="font-[family-name:var(--font-heading)] text-4xl text-white">
              {bracket.champion.name.toUpperCase()}
            </p>
            <p className="font-[family-name:var(--font-data)] text-sm text-white/60 mt-2">
              {bracket.champion.probChampion.toFixed(1)}% de probabilidade
            </p>
          </div>
        </div>
      )}

      {/* Link */}
      <div className="text-center pt-2">
        <a
          href="/copa-mundo-2026"
          className="inline-flex items-center gap-1 font-[family-name:var(--font-data)] text-xs text-[var(--color-green-primary)] hover:underline"
        >
          Ver grupos e estatísticas completas →
        </a>
      </div>
    </div>
  )
}

/* Bracket helper components */

function BracketConnector({ label }: { label?: string }) {
  return (
    <div className="flex justify-center">
      <div className="flex flex-col items-center gap-1">
        <div className="w-px h-6 bg-gray-300" />
        {label && <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">{label}</span>}
        {label && <div className="w-px h-6 bg-gray-300" />}
      </div>
    </div>
  )
}

function BracketMatchCard({ team1, team2, large = false }: { team1: BracketTeam; team2: BracketTeam; large?: boolean }) {
  const fav = team1.probChampion >= team2.probChampion ? team1 : team2
  const hasBrazil = team1.isBrazil || team2.isBrazil

  const TeamRow = ({ team, isFav }: { team: BracketTeam; isFav: boolean }) => (
    <div className={`flex items-center gap-2 ${!isFav ? "opacity-50" : ""}`}>
      {team.logo ? (
        <img src={team.logo} alt={team.name} className={`object-contain ${large ? "w-6 h-6" : "w-5 h-5"}`} />
      ) : (
        <div className={`rounded-full bg-gray-300 ${large ? "w-6 h-6" : "w-5 h-5"}`} />
      )}
      <span className={`truncate flex-1 ${large ? "text-sm" : "text-xs"} ${
        team.isBrazil ? "text-green-700 font-bold" : isFav ? "text-gray-900 font-medium" : "text-gray-500"
      }`}>
        {team.name}
      </span>
      {large && (
        <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
          {team.probChampion.toFixed(1)}%
        </span>
      )}
    </div>
  )

  return (
    <div className={`rounded-lg border ${large ? "p-3" : "p-2"} ${
      hasBrazil ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
    }`}>
      <TeamRow team={team1} isFav={team1 === fav} />
      <div className="flex items-center gap-1.5 my-1">
        <div className="flex-1 h-px bg-gray-200" />
        <span className="text-[8px] text-gray-300">VS</span>
        <div className="flex-1 h-px bg-gray-200" />
      </div>
      <TeamRow team={team2} isFav={team2 === fav} />
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
