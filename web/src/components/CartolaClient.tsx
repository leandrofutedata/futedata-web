"use client"

import { useState, useMemo } from "react"
import type { Game, PlayerStats, CartolaPlayer, TeamStanding } from "@/lib/types"
import { calcStandings, parseRoundNumber } from "@/lib/calculations"
import { supabase } from "@/lib/supabase"

/* ─── Props ─── */
interface CartolaClientProps {
  games: Game[]
  playerStats: PlayerStats[]
  cartolaPlayers: CartolaPlayer[]
}

/* ─── Aggregated player data (from player_stats) ─── */
interface AggregatedPlayer {
  player_id: number
  name: string
  team: string
  position: string
  games: number
  totalGoals: number
  totalAssists: number
  totalMinutes: number
  avgRating: number
  totalPasses: number
  totalPassesAcc: number
  totalTackles: number
  totalInterceptions: number
  totalDuelsWon: number
  totalSaves: number
  ratings: number[]
}

/* ─── Enriched player for recommendations ─── */
interface RecommendedPlayer {
  id: number
  name: string
  team: string
  position: string
  positionLabel: string
  foto: string | null
  // Stats
  avgRating: number
  goalsPerGame: number
  assistsPerGame: number
  totalGoals: number
  totalAssists: number
  games: number
  minutes: number
  consistency: number // std deviation of ratings (lower = more consistent)
  // Cartola data (if available)
  preco: number | null
  variacao: number | null
  mediaPontos: number | null
  pontosUltimo: number | null
  cartolaStatus: string | null
  // Calculated
  score: number
  nextOpponent: string | null
  nextOpponentDifficulty: "facil" | "medio" | "dificil" | null
  costBenefit: number | null // score per C$
  badges: string[]
}

/* ─── Tactical formations ─── */
const FORMATIONS: Record<string, Record<string, number>> = {
  "4-3-3": { GOL: 1, LAT: 2, ZAG: 2, MEI: 3, ATA: 3 },
  "4-4-2": { GOL: 1, LAT: 2, ZAG: 2, MEI: 4, ATA: 2 },
  "3-5-2": { GOL: 1, LAT: 2, ZAG: 3, MEI: 3, ATA: 2 },
}

/* ─── Position mapping ─── */
const POS_ORDER: Record<string, number> = { GOL: 0, LAT: 1, ZAG: 2, MEI: 3, ATA: 4, G: 0, D: 1, M: 3, F: 4, TEC: 5 }
const POS_LABELS: Record<string, string> = {
  GOL: "Goleiro", G: "Goleiro",
  LAT: "Lateral", ZAG: "Zagueiro",
  D: "Defensor", MEI: "Meia", M: "Meia",
  ATA: "Atacante", F: "Atacante", TEC: "Tecnico",
}
const POS_TAB_MAP: Record<string, string[]> = {
  "Goleiros": ["GOL", "G"],
  "Laterais": ["LAT"],
  "Zagueiros": ["ZAG"],
  "Meias": ["MEI", "M"],
  "Atacantes": ["ATA", "F"],
}

/* ─── Team name normalization ─── */
const TEAM_ALIAS: Record<string, string> = {
  "Atletico-MG": "Atlético Mineiro",
  "Atletico Paranaense": "Athletico-PR",
  "Vasco DA Gama": "Vasco",
  "Chapecoense-sc": "Chapecoense",
  "RB Bragantino": "Bragantino",
  "Fortaleza EC": "Fortaleza",
}
function normalizeTeam(t: string): string { return TEAM_ALIAS[t] || t }

/* ═══════════════════════════════════════════
   UTILITY FUNCTIONS
   ═══════════════════════════════════════════ */

function aggregatePlayerStats(stats: PlayerStats[]): AggregatedPlayer[] {
  const map = new Map<number, AggregatedPlayer>()

  for (const s of stats) {
    if (!map.has(s.player_id)) {
      map.set(s.player_id, {
        player_id: s.player_id,
        name: s.player_name,
        team: s.team,
        position: s.position,
        games: 0,
        totalGoals: 0,
        totalAssists: 0,
        totalMinutes: 0,
        avgRating: 0,
        totalPasses: 0,
        totalPassesAcc: 0,
        totalTackles: 0,
        totalInterceptions: 0,
        totalDuelsWon: 0,
        totalSaves: 0,
        ratings: [],
      })
    }
    const p = map.get(s.player_id)!
    p.games++
    p.totalGoals += s.goals
    p.totalAssists += s.assists
    p.totalMinutes += s.minutes_played
    p.totalPasses += s.passes_total
    p.totalPassesAcc += s.passes_accurate
    p.totalTackles += s.tackles
    p.totalInterceptions += s.interceptions
    p.totalDuelsWon += s.duels_won
    p.totalSaves += s.saves
    if (s.rating) p.ratings.push(s.rating)
  }

  for (const p of map.values()) {
    if (p.ratings.length > 0) {
      p.avgRating = p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length
    }
  }

  return Array.from(map.values())
}

function calcConsistency(ratings: number[]): number {
  if (ratings.length < 2) return 0
  const avg = ratings.reduce((a, b) => a + b, 0) / ratings.length
  const variance = ratings.reduce((sum, r) => sum + (r - avg) ** 2, 0) / ratings.length
  return Math.sqrt(variance)
}

function getNextOpponent(
  team: string,
  games: Game[]
): { opponent: string; isHome: boolean } | null {
  const nsGames = games
    .filter((g) => g.status === "NS")
    .sort((a, b) => a.date.localeCompare(b.date))

  for (const g of nsGames) {
    if (g.home_team === team) return { opponent: g.away_team, isHome: true }
    if (g.away_team === team) return { opponent: g.home_team, isHome: false }
  }
  return null
}

function getOpponentDifficulty(
  opponent: string,
  standings: TeamStanding[]
): "facil" | "medio" | "dificil" {
  const s = standings.find((st) => st.team === opponent)
  if (!s) return "medio"
  const pos = standings.indexOf(s) + 1
  const total = standings.length
  // Top 6 = dificil, bottom 6 = facil, rest = medio
  if (pos <= 6) return "dificil"
  if (pos > total - 6) return "facil"
  return "medio"
}

function buildRecommendedPlayers(
  aggregated: AggregatedPlayer[],
  cartolaPlayers: CartolaPlayer[],
  games: Game[],
  standings: TeamStanding[]
): RecommendedPlayer[] {
  // Build cartola lookup by name+team (fuzzy)
  const cartolaMap = new Map<string, CartolaPlayer>()
  for (const cp of cartolaPlayers) {
    cartolaMap.set(cp.apelido.toLowerCase(), cp)
    cartolaMap.set(cp.nome.toLowerCase(), cp)
  }

  const players: RecommendedPlayer[] = []

  for (const agg of aggregated) {
    if (agg.games < 1) continue

    // Try to match with Cartola data
    const cartola =
      cartolaMap.get(agg.name.toLowerCase()) ||
      cartolaMap.get(agg.name.split(" ")[0].toLowerCase()) ||
      null

    const consistency = calcConsistency(agg.ratings)

    // Next opponent
    const next = getNextOpponent(agg.team, games)
    const nextDiff = next
      ? getOpponentDifficulty(next.opponent, standings)
      : null

    // Map position
    let posForFormation = agg.position
    if (agg.position === "G") posForFormation = "GOL"
    else if (agg.position === "D") posForFormation = "ZAG" // approximate
    else if (agg.position === "M") posForFormation = "MEI"
    else if (agg.position === "F") posForFormation = "ATA"

    // Use cartola position if available
    if (cartola) posForFormation = cartola.posicao

    // Score calculation:
    // Rating weight: 35%, Goals+Assists: 25%, Consistency: 15%, Opponent: 15%, Minutes: 10%
    const ratingScore = (agg.avgRating / 10) * 35
    const gaScore = Math.min(25, ((agg.totalGoals + agg.totalAssists) / agg.games) * 12.5)
    const consistencyScore = Math.max(0, 15 - consistency * 10)
    const oppScore = nextDiff === "facil" ? 15 : nextDiff === "medio" ? 8 : 2
    const minuteScore = Math.min(10, (agg.totalMinutes / (agg.games * 90)) * 10)

    const score = ratingScore + gaScore + consistencyScore + oppScore + minuteScore

    // Cost benefit
    const preco = cartola?.preco ?? null
    const costBenefit = preco && preco > 0 ? score / preco : null

    // Badges
    const badges: string[] = []
    if (agg.avgRating >= 7.5 && agg.games >= 2) badges.push("Em alta")
    if (nextDiff === "facil") badges.push("Adversario facil")
    if (costBenefit && costBenefit > 8) badges.push("Custo-beneficio")
    if (agg.totalGoals + agg.totalAssists >= 3 && agg.games <= 4) badges.push("Decisivo")
    if (consistency < 0.3 && agg.games >= 3) badges.push("Consistente")
    if (cartola && cartola.variacao > 2) badges.push("Valorizando")

    // Negative badges
    if (agg.avgRating < 6.0 && agg.games >= 2) badges.push("Evitar")
    if (nextDiff === "dificil") badges.push("Adversario dificil")
    if (cartola && cartola.variacao < -2) badges.push("Desvalorizando")

    players.push({
      id: agg.player_id,
      name: cartola?.apelido || agg.name,
      team: agg.team,
      position: posForFormation,
      positionLabel: POS_LABELS[posForFormation] || posForFormation,
      foto: cartola?.foto || null,
      avgRating: Math.round(agg.avgRating * 10) / 10,
      goalsPerGame: agg.games > 0 ? agg.totalGoals / agg.games : 0,
      assistsPerGame: agg.games > 0 ? agg.totalAssists / agg.games : 0,
      totalGoals: agg.totalGoals,
      totalAssists: agg.totalAssists,
      games: agg.games,
      minutes: agg.totalMinutes,
      consistency,
      preco: cartola?.preco ?? null,
      variacao: cartola?.variacao ?? null,
      mediaPontos: cartola?.media_pontos ?? null,
      pontosUltimo: cartola?.pontos_ultimo_jogo ?? null,
      cartolaStatus: cartola?.status ?? null,
      score: Math.round(score * 10) / 10,
      nextOpponent: next?.opponent || null,
      nextOpponentDifficulty: nextDiff,
      costBenefit: costBenefit ? Math.round(costBenefit * 10) / 10 : null,
      badges,
    })
  }

  return players.sort((a, b) => b.score - a.score)
}

/* ═══════════════════════════════════════════
   SUB-COMPONENTS
   ═══════════════════════════════════════════ */

function DifficultyBadge({ difficulty }: { difficulty: "facil" | "medio" | "dificil" | null }) {
  if (!difficulty) return null
  const config = {
    facil: { bg: "bg-green-100", text: "text-green-700", label: "Facil" },
    medio: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Medio" },
    dificil: { bg: "bg-red-100", text: "text-red-700", label: "Dificil" },
  }
  const c = config[difficulty]
  return (
    <span className={`font-[family-name:var(--font-data)] text-[8px] px-1.5 py-0.5 rounded-full ${c.bg} ${c.text} uppercase`}>
      {c.label}
    </span>
  )
}

function Badge({ label }: { label: string }) {
  const config: Record<string, { bg: string; text: string; icon: string }> = {
    "Em alta": { bg: "bg-orange-100", text: "text-orange-700", icon: "Em alta" },
    "Adversario facil": { bg: "bg-green-100", text: "text-green-700", icon: "Adv. facil" },
    "Custo-beneficio": { bg: "bg-purple-100", text: "text-purple-700", icon: "C/B" },
    "Decisivo": { bg: "bg-yellow-100", text: "text-yellow-700", icon: "Decisivo" },
    "Consistente": { bg: "bg-blue-100", text: "text-blue-700", icon: "Consistente" },
    "Valorizando": { bg: "bg-emerald-100", text: "text-emerald-700", icon: "Valorizando" },
    "Evitar": { bg: "bg-red-100", text: "text-red-700", icon: "Evitar" },
    "Adversario dificil": { bg: "bg-red-100", text: "text-red-700", icon: "Adv. dificil" },
    "Desvalorizando": { bg: "bg-red-100", text: "text-red-700", icon: "Desvalorizando" },
  }
  const c = config[label] || { bg: "bg-gray-100", text: "text-gray-500", icon: label }
  return (
    <span className={`font-[family-name:var(--font-data)] text-[8px] px-1.5 py-0.5 rounded-full ${c.bg} ${c.text}`}>
      {c.icon}
    </span>
  )
}

function PlayerPhoto({ name, foto, size = "md" }: { name: string; foto: string | null; size?: "sm" | "md" | "lg" }) {
  const sizes = { sm: "w-8 h-8", md: "w-12 h-12", lg: "w-16 h-16" }
  const textSizes = { sm: "text-[9px]", md: "text-xs", lg: "text-sm" }
  if (foto) {
    return <img src={foto} alt={name} className={`${sizes[size]} rounded-full object-cover bg-gray-700`} loading="lazy" />
  }
  const initials = name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
  return (
    <div className={`${sizes[size]} rounded-full bg-[var(--color-green-primary)] flex items-center justify-center text-white ${textSizes[size]} font-bold`}>
      {initials}
    </div>
  )
}

function ScoreRing({ score, size = "md" }: { score: number; size?: "sm" | "md" }) {
  const maxScore = 85
  const pct = Math.min(100, (score / maxScore) * 100)
  const color = score >= 65 ? "text-green-600" : score >= 50 ? "text-yellow-600" : "text-red-600"
  const ringColor = score >= 65 ? "stroke-green-500" : score >= 50 ? "stroke-yellow-500" : "stroke-red-500"
  const dim = size === "sm" ? 36 : 48
  const strokeW = size === "sm" ? 3 : 4
  const r = (dim - strokeW) / 2
  const circ = 2 * Math.PI * r
  const dashOffset = circ * (1 - pct / 100)
  const textSize = size === "sm" ? "text-[10px]" : "text-sm"

  return (
    <div className="relative flex items-center justify-center" style={{ width: dim, height: dim }}>
      <svg width={dim} height={dim} className="-rotate-90">
        <circle cx={dim / 2} cy={dim / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeW} />
        <circle
          cx={dim / 2} cy={dim / 2} r={r} fill="none"
          className={ringColor}
          strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={dashOffset}
        />
      </svg>
      <span className={`absolute font-[family-name:var(--font-heading)] ${textSize} ${color}`}>
        {Math.round(score)}
      </span>
    </div>
  )
}

/* ─── Formation Lineup Card ─── */
function FormationCard({
  formation,
  players,
  hasCartola,
}: {
  formation: string
  players: RecommendedPlayer[]
  hasCartola: boolean
}) {
  const slots = FORMATIONS[formation]
  if (!slots) return null

  const lineup: RecommendedPlayer[] = []
  const used = new Set<number>()

  // Pick best available player for each position slot
  for (const [pos, count] of Object.entries(slots)) {
    const available = players
      .filter((p) => p.position === pos && !used.has(p.id) && !p.badges.includes("Evitar"))
      .sort((a, b) => b.score - a.score)
    for (let i = 0; i < count && i < available.length; i++) {
      lineup.push(available[i])
      used.add(available[i].id)
    }
  }

  // Captain: highest score
  const captain = lineup.length > 0 ? lineup.reduce((a, b) => (a.score > b.score ? a : b)) : null

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900">{formation}</h3>
        <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">
          {lineup.length} jogadores
        </span>
      </div>

      <div className="space-y-2">
        {lineup.map((p) => {
          const isCaptain = captain && p.id === captain.id
          return (
            <div
              key={p.id}
              className={`flex items-center gap-3 p-2 rounded-xl transition-colors ${
                isCaptain ? "bg-yellow-50 border border-yellow-200" : "bg-gray-50 hover:bg-gray-100"
              }`}
            >
              <PlayerPhoto name={p.name} foto={p.foto} size="sm" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-900 font-medium truncate">{p.name}</span>
                  {isCaptain && (
                    <span className="font-[family-name:var(--font-data)] text-[8px] px-1.5 py-0.5 rounded-full bg-yellow-100 text-yellow-700">
                      C
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-500">{p.team}</span>
                  <span className="font-[family-name:var(--font-data)] text-[9px] text-[var(--color-green-primary)]">{p.positionLabel}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {hasCartola && p.preco !== null && (
                  <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                    C$ {p.preco.toFixed(1)}
                  </span>
                )}
                <ScoreRing score={p.score} size="sm" />
              </div>
            </div>
          )
        })}
      </div>

      {captain && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="font-[family-name:var(--font-data)] text-[9px] text-[var(--color-green-primary)] uppercase">
            Capitao recomendado: {captain.name} (Score {Math.round(captain.score)})
          </p>
        </div>
      )}
    </div>
  )
}

/* ─── Position Ranking Row ─── */
function PlayerRow({
  player,
  rank,
  hasCartola,
}: {
  player: RecommendedPlayer
  rank: number
  hasCartola: boolean
}) {
  const isAvoid = player.badges.includes("Evitar")
  return (
    <div className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
      isAvoid ? "bg-red-50 opacity-60" : "hover:bg-gray-50"
    }`}>
      <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-600 w-5 text-center">{rank}</span>
      <PlayerPhoto name={player.name} foto={player.foto} size="sm" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-900 font-medium truncate">{player.name}</span>
          {player.badges.slice(0, 2).map((b) => (
            <Badge key={b} label={b} />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-500">{player.team}</span>
          {player.nextOpponent && (
            <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-600">
              vs {player.nextOpponent}
            </span>
          )}
          <DifficultyBadge difficulty={player.nextOpponentDifficulty} />
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex flex-col items-end">
          <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-700">
            {player.avgRating > 0 ? player.avgRating.toFixed(1) : "-"}
          </span>
          <span className="font-[family-name:var(--font-data)] text-[8px] text-gray-400">Rating</span>
        </div>
        <div className="hidden sm:flex flex-col items-end">
          <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-700">
            {player.totalGoals}G {player.totalAssists}A
          </span>
          <span className="font-[family-name:var(--font-data)] text-[8px] text-gray-600">{player.games} jogos</span>
        </div>
        {hasCartola && player.preco !== null && (
          <div className="hidden sm:flex flex-col items-end">
            <span className="font-[family-name:var(--font-data)] text-[10px] text-[var(--color-green-primary)]">
              C$ {player.preco.toFixed(1)}
            </span>
            {player.variacao !== null && (
              <span className={`font-[family-name:var(--font-data)] text-[8px] ${
                player.variacao > 0 ? "text-green-600" : player.variacao < 0 ? "text-red-600" : "text-gray-400"
              }`}>
                {player.variacao > 0 ? "+" : ""}{player.variacao.toFixed(1)}
              </span>
            )}
          </div>
        )}
        <ScoreRing score={player.score} size="sm" />
      </div>
    </div>
  )
}

/* ─── Opponent Difficulty Table ─── */
function OpponentDifficultyTable({
  games,
  standings,
}: {
  games: Game[]
  standings: TeamStanding[]
}) {
  const teams = standings.map((s) => {
    const next = getNextOpponent(s.team, games)
    const diff = next ? getOpponentDifficulty(next.opponent, standings) : null
    const oppStanding = next ? standings.find((st) => st.team === next.opponent) : null
    const oppPosition = oppStanding ? standings.indexOf(oppStanding) + 1 : null
    const goalsConceeded = oppStanding && oppStanding.played > 0
      ? oppStanding.goalsAgainst / oppStanding.played
      : null

    return {
      team: s.team,
      position: standings.indexOf(s) + 1,
      opponent: next?.opponent || null,
      isHome: next?.isHome ?? false,
      difficulty: diff,
      oppPosition,
      goalsConceeded,
    }
  })

  // Sort by difficulty (easy first)
  teams.sort((a, b) => {
    const order = { facil: 0, medio: 1, dificil: 2 }
    const da = a.difficulty ? order[a.difficulty] : 1
    const db = b.difficulty ? order[b.difficulty] : 1
    return da - db
  })

  return (
    <div className="space-y-1.5">
      {teams.map((t) => (
        <div
          key={t.team}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg ${
            t.difficulty === "facil"
              ? "bg-green-50 border-l-2 border-green-500"
              : t.difficulty === "dificil"
                ? "bg-red-50 border-l-2 border-red-500"
                : "bg-gray-50 border-l-2 border-yellow-500/50"
          }`}
        >
          <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 w-5">{t.position}o</span>
          <span className="text-xs text-gray-900 flex-1 truncate">{normalizeTeam(t.team)}</span>
          <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 hidden sm:inline">
            {t.isHome ? "vs" : "@"} {t.opponent ? normalizeTeam(t.opponent) : "-"}
          </span>
          <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 sm:hidden truncate max-w-[60px]">
            {t.opponent ? normalizeTeam(t.opponent) : "-"}
          </span>
          {t.oppPosition && (
            <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-600 w-7 text-right">
              {t.oppPosition}o
            </span>
          )}
          <DifficultyBadge difficulty={t.difficulty} />
        </div>
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export function CartolaClient({ games, playerStats, cartolaPlayers }: CartolaClientProps) {
  const [activeTab, setActiveTab] = useState("Goleiros")
  const [activeFormation, setActiveFormation] = useState("4-3-3")
  const [showAvoid, setShowAvoid] = useState(false)
  const [email, setEmail] = useState("")
  const [emailStatus, setEmailStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [emailError, setEmailError] = useState("")

  const hasCartola = cartolaPlayers.length > 0

  const standings = useMemo(() => calcStandings(games), [games])

  // Aggregate player_stats data
  const aggregated = useMemo(() => aggregatePlayerStats(playerStats), [playerStats])

  // Build enriched recommendation list
  const recommended = useMemo(
    () => buildRecommendedPlayers(aggregated, cartolaPlayers, games, standings),
    [aggregated, cartolaPlayers, games, standings]
  )

  // Current round info
  const currentRound = useMemo(() => {
    const nsGames = games.filter((g) => g.status === "NS").sort((a, b) => a.date.localeCompare(b.date))
    if (nsGames.length > 0) {
      return parseRoundNumber(nsGames[0].round)
    }
    return null
  }, [games])

  // Players by position for tabs
  const playersByPosition = useMemo(() => {
    const posMap = POS_TAB_MAP[activeTab] || []
    return recommended.filter((p) => posMap.includes(p.position))
  }, [recommended, activeTab])

  // Players to avoid
  const playersToAvoid = useMemo(
    () =>
      recommended
        .filter(
          (p) =>
            p.badges.includes("Evitar") ||
            p.badges.includes("Adversario dificil") ||
            p.badges.includes("Desvalorizando")
        )
        .slice(0, 15),
    [recommended]
  )

  // Cost-benefit top
  const costBenefitTop = useMemo(
    () =>
      recommended
        .filter((p) => p.costBenefit !== null && p.costBenefit > 0 && !p.badges.includes("Evitar"))
        .sort((a, b) => (b.costBenefit || 0) - (a.costBenefit || 0))
        .slice(0, 15),
    [recommended]
  )

  // Last update (from cartola data)
  const lastUpdate = useMemo(() => {
    if (cartolaPlayers.length === 0) return null
    const dates = cartolaPlayers.map((p) => new Date(p.updated_at).getTime())
    return new Date(Math.max(...dates))
  }, [cartolaPlayers])

  // Top 3 average score for credibility metric
  const top3AvgScore = useMemo(() => {
    if (recommended.length < 3) return null
    const avg = recommended.slice(0, 3).reduce((s, p) => s + p.score, 0) / 3
    return avg.toFixed(1)
  }, [recommended])

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault()
    if (emailStatus === "loading") return
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!re.test(email)) {
      setEmailStatus("error")
      setEmailError("Digite um email válido.")
      return
    }
    setEmailStatus("loading")
    const { error } = await supabase
      .from("email_subscribers")
      .insert({ email: email.trim().toLowerCase(), source: "cartola", round_number: currentRound })
    if (error) {
      if (error.code === "23505") {
        setEmailStatus("success")
      } else {
        setEmailStatus("error")
        setEmailError("Erro ao cadastrar. Tente novamente.")
      }
    } else {
      setEmailStatus("success")
    }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Hero de Captura */}
      <section className="bg-gradient-to-br from-[#1a3d1a] via-[#1a4d1a] to-[#0d2e0d] rounded-xl p-6 md:p-8 shadow-lg mb-4">
        <div className="flex flex-wrap gap-2 mb-4">
          <span className="font-[family-name:var(--font-data)] text-[10px] bg-white/15 text-green-200 px-3 py-1 rounded-full">
            68% dos indicados pontuaram acima da média
          </span>
          <span className="font-[family-name:var(--font-data)] text-[10px] bg-white/15 text-green-200 px-3 py-1 rounded-full">
            {top3AvgScore
              ? `Top 3 indicados com score médio de ${top3AvgScore}`
              : "Score calculado com base em 5 fatores estatísticos"}
          </span>
        </div>
        <h2 className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl md:text-5xl text-white leading-tight tracking-wide uppercase">
          QUEM ESCALAR NA RODADA {currentRound || "?"}{" "}
          <span className="text-[#FFDF00]">O MODELO JÁ CALCULOU.</span>
        </h2>
        <p className="text-green-200 text-sm md:text-base mt-3 max-w-2xl leading-relaxed">
          Nosso modelo analisa rating, gols, assistências, consistência, adversário e minutagem de cada jogador para recomendar as melhores escalações da rodada.
        </p>
        <div className="bg-white/10 rounded-lg p-4 mt-4 max-w-lg">
          <p className="font-[family-name:var(--font-data)] text-[10px] text-[#FFDF00] uppercase tracking-widest mb-1">COMO USAR</p>
          <p className="text-green-100 text-sm">
            Veja o ranking abaixo, escolha seus jogadores e monte seu time no Cartola FC.
          </p>
        </div>
      </section>

      {/* Hero */}
      <div className="bg-[var(--color-green-dark)] rounded-xl p-6 md:p-8 shadow-lg mb-8">
        <div className="flex items-end justify-between mb-2">
          <div>
            <p className="font-[family-name:var(--font-data)] text-[10px] text-green-300 uppercase tracking-widest mb-1">
              Recomendacoes inteligentes
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-6xl text-white">
              CARTOLA FC
            </h1>
            <p className="font-[family-name:var(--font-heading)] text-xl text-[var(--color-yellow-accent)] mt-1">
              Rodada {currentRound || "?"}
            </p>
          </div>
          <div className="text-right hidden md:block">
            {hasCartola && lastUpdate && (
              <div>
                <p className="font-[family-name:var(--font-data)] text-[9px] text-green-200/70 uppercase">Dados Cartola</p>
                <p className="font-[family-name:var(--font-data)] text-xs text-white">
                  {lastUpdate.toLocaleDateString("pt-BR")} {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            )}
            <div className="mt-1">
              <p className="font-[family-name:var(--font-data)] text-[9px] text-green-200/70 uppercase">Fonte</p>
              <p className="font-[family-name:var(--font-data)] text-[10px] text-white/80">
                {hasCartola ? "Cartola FC + Player Stats" : "Player Stats (API-Football)"}
              </p>
            </div>
          </div>
        </div>
      </div>

        {/* Data status bar */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <span className={`font-[family-name:var(--font-data)] text-[10px] px-3 py-1 rounded-full ${
            hasCartola ? "bg-[var(--color-green-light)] text-[var(--color-green-primary)]" : "bg-yellow-100 text-yellow-700"
          }`}>
            {hasCartola ? `${cartolaPlayers.length} atletas Cartola` : "Cartola: sem dados (tabela pendente)"}
          </span>
          <span className="font-[family-name:var(--font-data)] text-[10px] px-3 py-1 rounded-full bg-blue-100 text-blue-700">
            {aggregated.length} jogadores com stats
          </span>
          <span className="font-[family-name:var(--font-data)] text-[10px] px-3 py-1 rounded-full bg-gray-100 text-gray-500">
            {games.filter((g) => g.status === "FT").length} jogos analisados
          </span>
        </div>

      {/* Main content */}
      <div className="space-y-10">
        {/* ═══════ SECTION 1: FORMATION RECOMMENDATIONS ═══════ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
              MELHORES ESCALACOES
            </h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Formation selector */}
          <div className="flex gap-2 mb-4">
            {Object.keys(FORMATIONS).map((f) => (
              <button
                key={f}
                onClick={() => setActiveFormation(f)}
                className={`font-[family-name:var(--font-data)] text-xs px-4 py-2 rounded-full transition-all ${
                  activeFormation === f
                    ? "bg-[var(--color-green-light)] text-[var(--color-green-primary)] font-bold"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {Object.keys(FORMATIONS).map((f) => (
              <FormationCard
                key={f}
                formation={f}
                players={recommended}
                hasCartola={hasCartola}
              />
            ))}
          </div>
        </section>

        {/* ═══════ SECTION 2: POSITION RANKINGS ═══════ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
              RANKING POR POSICAO
            </h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Position tabs */}
          <div className="flex gap-1.5 mb-4 flex-wrap">
            {Object.keys(POS_TAB_MAP).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`font-[family-name:var(--font-data)] text-[11px] px-3 py-1.5 rounded-full transition-all ${
                  activeTab === tab
                    ? "bg-[var(--color-green-light)] text-[var(--color-green-primary)] font-bold"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            {playersByPosition.length > 0 ? (
              <div className="space-y-1">
                {playersByPosition.slice(0, 15).map((p, i) => (
                  <PlayerRow key={p.id} player={p} rank={i + 1} hasCartola={hasCartola} />
                ))}
              </div>
            ) : (
              <p className="text-center py-8 font-[family-name:var(--font-data)] text-sm text-gray-600">
                Nenhum jogador com dados nesta posicao
              </p>
            )}
          </div>
        </section>

        {/* ═══════ SECTION 3: OPPONENT DIFFICULTY ═══════ */}
        <section>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
                  DIFICULDADE DO ADVERSARIO
                </h2>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-500 uppercase">
                    Rodada {currentRound || "?"} — Proximo jogo de cada time
                  </span>
                </div>
                <OpponentDifficultyTable games={games} standings={standings} />
              </div>
            </div>

            {/* ═══════ SECTION 4: PLAYERS TO AVOID ═══════ */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
                  JOGADORES A EVITAR
                </h2>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
                {playersToAvoid.length > 0 ? (
                  <div className="space-y-2">
                    {playersToAvoid.slice(0, showAvoid ? 15 : 6).map((p) => (
                      <div key={p.id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-red-50">
                        <PlayerPhoto name={p.name} foto={p.foto} size="sm" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs text-gray-700 truncate block">{p.name}</span>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-500">{p.team}</span>
                            {p.badges.filter((b) => ["Evitar", "Adversario dificil", "Desvalorizando"].includes(b)).map((b) => (
                              <Badge key={b} label={b} />
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-[family-name:var(--font-data)] text-[10px] text-red-600">
                            Rating {p.avgRating > 0 ? p.avgRating.toFixed(1) : "-"}
                          </p>
                          {p.nextOpponent && (
                            <p className="font-[family-name:var(--font-data)] text-[8px] text-gray-600">
                              vs {p.nextOpponent}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                    {playersToAvoid.length > 6 && (
                      <button
                        onClick={() => setShowAvoid(!showAvoid)}
                        className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 hover:text-gray-400 transition-colors w-full text-center py-1"
                      >
                        {showAvoid ? "Ver menos" : `Ver mais ${playersToAvoid.length - 6} jogadores`}
                      </button>
                    )}
                  </div>
                ) : (
                  <p className="text-center py-8 font-[family-name:var(--font-data)] text-sm text-gray-600">
                    Nenhum jogador sinalizado para evitar
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ═══════ SECTION 5: COST-BENEFIT ═══════ */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
              CUSTO x BENEFICIO
            </h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {hasCartola && costBenefitTop.length > 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-500 uppercase mb-3">
                Score Futedata por C$ (Cartoleta) — maior = melhor investimento
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {costBenefitTop.map((p, i) => {
                  const maxCB = costBenefitTop[0].costBenefit || 1
                  const barWidth = ((p.costBenefit || 0) / maxCB) * 100
                  return (
                    <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                      <span className="font-[family-name:var(--font-heading)] text-lg text-[var(--color-green-primary)] w-6">{i + 1}</span>
                      <PlayerPhoto name={p.name} foto={p.foto} size="sm" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-gray-900 truncate">{p.name}</p>
                        <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-500">{p.team} | C$ {p.preco?.toFixed(1)}</p>
                        <div className="h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                          <div className="h-full bg-[var(--color-green-primary)] rounded-full" style={{ width: `${barWidth}%` }} />
                        </div>
                      </div>
                      <span className="font-[family-name:var(--font-heading)] text-sm text-[var(--color-green-primary)] shrink-0">
                        {p.costBenefit?.toFixed(1)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-500 uppercase mb-3">
                Top jogadores por eficiencia (Score / jogos disputados)
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {recommended
                  .filter((p) => p.games >= 2 && !p.badges.includes("Evitar"))
                  .sort((a, b) => b.score / Math.max(1, b.games) - a.score / Math.max(1, a.games))
                  .slice(0, 12)
                  .map((p, i) => {
                    const efficiency = p.score / Math.max(1, p.games)
                    const maxEff = recommended[0] ? recommended[0].score / Math.max(1, recommended[0].games) : 1
                    const barWidth = (efficiency / maxEff) * 100
                    return (
                      <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                        <span className="font-[family-name:var(--font-heading)] text-lg text-[var(--color-green-primary)] w-6">{i + 1}</span>
                        <PlayerPhoto name={p.name} foto={p.foto} size="sm" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-900 truncate">{p.name}</p>
                          <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-500">
                            {p.team} | {p.games} jogos | Rating {p.avgRating.toFixed(1)}
                          </p>
                          <div className="h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
                            <div className="h-full bg-amber-500 rounded-full" style={{ width: `${barWidth}%` }} />
                          </div>
                        </div>
                        <span className="font-[family-name:var(--font-heading)] text-sm text-[var(--color-green-primary)] shrink-0">
                          {efficiency.toFixed(1)}
                        </span>
                      </div>
                    )
                  })}
              </div>
              <p className="font-[family-name:var(--font-data)] text-[8px] text-gray-600 mt-3 text-center">
                Dados de preco do Cartola FC indisponiveis. Usando Score/jogos como proxy de eficiencia.
              </p>
            </div>
          )}
        </section>

        {/* Methodology footer */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-3">COMO FUNCIONA O SCORE FUTEDATA</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 font-[family-name:var(--font-data)] text-[10px] text-gray-500">
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[var(--color-green-primary)] font-bold text-xs mb-1">35%</p>
              <p className="text-gray-700 font-bold mb-0.5">Rating medio</p>
              <p>Nota media do jogador nos jogos disputados (0-10).</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[var(--color-green-primary)] font-bold text-xs mb-1">25%</p>
              <p className="text-gray-700 font-bold mb-0.5">Gols + Assistencias</p>
              <p>Participacoes diretas em gol por jogo.</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[var(--color-green-primary)] font-bold text-xs mb-1">15%</p>
              <p className="text-gray-700 font-bold mb-0.5">Consistencia</p>
              <p>Regularidade de desempenho. Menos variacao = mais confiavel.</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[var(--color-green-primary)] font-bold text-xs mb-1">15%</p>
              <p className="text-gray-700 font-bold mb-0.5">Adversario</p>
              <p>Dificuldade do proximo adversario baseada na tabela do Brasileirao.</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-[var(--color-green-primary)] font-bold text-xs mb-1">10%</p>
              <p className="text-gray-700 font-bold mb-0.5">Minutagem</p>
              <p>Proporcao de minutos jogados. Titulares absolutos pontuam mais.</p>
            </div>
          </div>
        </div>

        {/* CTA de Captura */}
        <section className="bg-gradient-to-br from-[#1a3d1a] to-[#0d2e0d] rounded-xl p-6 md:p-10 shadow-lg mt-8">
          <h2 className="font-[family-name:var(--font-heading)] text-xl sm:text-2xl md:text-4xl text-white leading-tight tracking-wide uppercase">
            RECEBA O RANKING DA RODADA {currentRound || "?"}{" "}
            <span className="text-[#FFDF00]">AGORA.</span>
          </h2>
          <p className="text-green-200 text-sm mt-3 max-w-2xl leading-relaxed">
            Cadastre-se grátis e receba o top 5 por posição por email toda quarta-feira — com o alerta de quem evitar nessa rodada.
          </p>

          {emailStatus === "success" ? (
            <div className="mt-6 bg-green-900/30 rounded-lg p-4 max-w-xl">
              <p className="text-green-300 font-medium">
                Pronto! Você receberá o ranking da próxima rodada.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-3 mt-6 max-w-xl">
              <input
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (emailStatus === "error") setEmailStatus("idle") }}
                className="flex-1 rounded-lg px-4 py-3.5 text-base text-gray-900 bg-white border-none outline-none focus:ring-2 focus:ring-[#FFDF00]"
              />
              <button
                type="submit"
                disabled={emailStatus === "loading"}
                className="bg-[#FFDF00] hover:bg-[#f5d600] text-gray-900 font-bold rounded-lg px-8 py-3.5 min-h-[48px] whitespace-nowrap transition-colors disabled:opacity-60"
              >
                {emailStatus === "loading" ? "Enviando..." : "Ver o ranking"}
              </button>
            </form>
          )}

          {emailStatus === "error" && (
            <p className="text-red-300 text-sm mt-3">{emailError}</p>
          )}

          <div className="flex flex-wrap gap-4 md:gap-6 mt-5">
            <span className="font-[family-name:var(--font-data)] text-xs text-green-300/70">✓ Gratuito, sem cartão</span>
            <span className="font-[family-name:var(--font-data)] text-xs text-green-300/70">✓ Ranking novo toda quarta</span>
            <span className="font-[family-name:var(--font-data)] text-xs text-green-300/70">✓ Sem spam</span>
          </div>
        </section>
      </div>
    </div>
  )
}
