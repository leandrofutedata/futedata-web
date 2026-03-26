"use client"

import { useMemo } from "react"
import type { WcGroup, WcGame, WcTeamStats } from "@/lib/types"

interface Props {
  groups: WcGroup[]
  games: WcGame[]
  teamStats: WcTeamStats[]
}

/* ─── Team name translations for display ─── */
const TEAM_PT: Record<string, string> = {
  "France": "Franca", "Brazil": "Brasil", "Argentina": "Argentina",
  "Spain": "Espanha", "England": "Inglaterra", "Germany": "Alemanha",
  "Portugal": "Portugal", "Netherlands": "Holanda", "Belgium": "Belgica",
  "Croatia": "Croacia", "Uruguay": "Uruguai", "Colombia": "Colombia",
  "Morocco": "Marrocos", "Ecuador": "Equador", "Switzerland": "Suica",
  "Japan": "Japao", "South Korea": "Coreia do Sul", "USA": "EUA",
  "Mexico": "Mexico", "Senegal": "Senegal", "Austria": "Austria",
  "Norway": "Noruega", "Scotland": "Escocia", "Canada": "Canada",
  "Australia": "Australia", "Iran": "Ira", "Tunisia": "Tunisia",
  "Egypt": "Egito", "Ivory Coast": "Costa do Marfim",
  "Ghana": "Gana", "South Africa": "Africa do Sul",
  "Algeria": "Argelia", "Cape Verde Islands": "Cabo Verde",
  "Saudi Arabia": "Arabia Saudita", "Qatar": "Catar",
  "Jordan": "Jordania", "Uzbekistan": "Uzbequistao",
  "New Zealand": "Nova Zelandia", "Panama": "Panama",
  "Paraguay": "Paraguai", "Haiti": "Haiti", "Curaçao": "Curacao",
  "Team will be confirmed": "A definir",
  "Bolivia": "Bolivia", "Venezuela": "Venezuela",
  "Peru": "Peru", "Chile": "Chile",
}
function ptName(name: string): string { return TEAM_PT[name] || name }

/* ─── Countdown ─── */
function daysUntilCup(): number {
  const cupDate = new Date("2026-06-11T00:00:00Z")
  const now = new Date()
  return Math.max(0, Math.ceil((cupDate.getTime() - now.getTime()) / 86400000))
}

/* ─── Confederation badge colors (light theme) ─── */
const CONF_COLORS: Record<string, string> = {
  "UEFA": "bg-blue-100 text-blue-700",
  "CONMEBOL": "bg-green-100 text-green-700",
  "CONCACAF": "bg-orange-100 text-orange-700",
  "CAF": "bg-yellow-100 text-yellow-700",
  "AFC": "bg-red-100 text-red-700",
  "OFC": "bg-cyan-100 text-cyan-700",
}

/* ─── Probability bar color (green/yellow Brazilian palette) ─── */
function probColor(prob: number): string {
  if (prob >= 10) return "from-[#009C3B] to-emerald-500"
  if (prob >= 5) return "from-emerald-500/80 to-emerald-400/80"
  if (prob >= 2) return "from-yellow-500 to-amber-400"
  return "from-gray-400 to-gray-300"
}

/* ─── Strength indicator dots ─── */
function StrengthDots({ prob }: { prob: number }) {
  const filled = prob >= 15 ? 5 : prob >= 8 ? 4 : prob >= 3 ? 3 : prob >= 1 ? 2 : 1
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className={`w-1.5 h-1.5 rounded-full ${
            i <= filled ? "bg-[#009C3B]" : "bg-gray-200"
          }`}
        />
      ))}
    </div>
  )
}

/* ═══════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════ */

export function CopaMundoClient({ groups, games, teamStats }: Props) {
  const days = daysUntilCup()

  // Group data organized
  const groupedTeams = useMemo(() => {
    const map = new Map<string, WcGroup[]>()
    for (const g of groups) {
      if (!map.has(g.group_name)) map.set(g.group_name, [])
      map.get(g.group_name)!.push(g)
    }
    return map
  }, [groups])

  // Team stats lookup
  const statsMap = useMemo(() => {
    const map = new Map<string, WcTeamStats>()
    for (const s of teamStats) map.set(s.team_name, s)
    return map
  }, [teamStats])

  // Top favorites
  const favorites = useMemo(
    () => teamStats.filter((t) => t.probability_champion > 0).slice(0, 12),
    [teamStats]
  )

  // Brazil games
  const brazilGames = useMemo(
    () => games.filter((g) => g.home_team === "Brazil" || g.away_team === "Brazil"),
    [games]
  )

  // CONMEBOL teams (from team_stats with elim data)
  const conmebolTeams = useMemo(
    () =>
      teamStats
        .filter((t) => t.confederation === "CONMEBOL" && t.elim_played > 0)
        .sort((a, b) => b.elim_points - a.elim_points),
    [teamStats]
  )

  // Venues grouped
  const venueStats = useMemo(() => {
    const map = new Map<string, { venue: string; city: string; country: string; count: number; hasBrazil: boolean }>()
    for (const g of games) {
      if (!g.venue) continue
      const key = g.venue
      if (!map.has(key)) {
        map.set(key, { venue: g.venue, city: g.city || "", country: g.country || "", count: 0, hasBrazil: false })
      }
      const v = map.get(key)!
      v.count++
      if (g.home_team === "Brazil" || g.away_team === "Brazil") v.hasBrazil = true
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }, [games])

  // Sorted group names
  const sortedGroupNames = useMemo(
    () => Array.from(groupedTeams.keys()).sort(),
    [groupedTeams]
  )

  const brazilStats = statsMap.get("Brazil")

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* ═══════ HERO — Green gradient card with Brazilian identity ═══════ */}
      <div className="relative overflow-hidden rounded-xl shadow-lg mb-8 bg-gradient-to-br from-[#00552B] via-[#009C3B] to-[#007A30]">
        {/* Subtle yellow radial glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(255,223,0,0.12)_0%,_transparent_50%)]" />

        <div className="relative p-6 md:p-8">
          <div className="text-center mb-6">
            <p className="font-[family-name:var(--font-data)] text-[10px] text-white/70 uppercase tracking-[0.3em] mb-3">
              Estados Unidos • Mexico • Canada
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-7xl text-white mb-1">
              COPA DO MUNDO
            </h1>
            <p className="font-[family-name:var(--font-heading)] text-3xl md:text-4xl text-[#FFDF00]">
              2026
            </p>
          </div>

          {/* Countdown */}
          <div className="flex justify-center mb-6">
            <div className="bg-white/10 border border-white/20 rounded-2xl px-8 py-5 text-center backdrop-blur-sm">
              <div className="font-[family-name:var(--font-heading)] text-6xl md:text-8xl text-[#FFDF00] leading-none">
                {days}
              </div>
              <p className="font-[family-name:var(--font-data)] text-xs text-white/60 uppercase tracking-wide mt-2">
                dias para o inicio
              </p>
              <p className="font-[family-name:var(--font-data)] text-[10px] text-white/40 mt-1">
                11 de junho de 2026
              </p>
            </div>
          </div>

          {/* Brazil highlight strip */}
          {brazilStats && (
            <div className="bg-white/10 border border-[#FFDF00]/30 rounded-xl p-4 max-w-2xl mx-auto">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-3">
                  {brazilStats.team_logo && (
                    <img src={brazilStats.team_logo} alt="Brasil" className="w-10 h-10 object-contain" />
                  )}
                  <div>
                    <p className="font-[family-name:var(--font-heading)] text-lg text-[#FFDF00]">BRASIL</p>
                    <p className="font-[family-name:var(--font-data)] text-[10px] text-white/60">
                      {brazilStats.wc_group} • {brazilGames.length} jogos na fase de grupos
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <p className="font-[family-name:var(--font-heading)] text-xl text-white">{brazilStats.probability_advance}%</p>
                    <p className="font-[family-name:var(--font-data)] text-[8px] text-white/50 uppercase">Avanca</p>
                  </div>
                  <div className="text-center">
                    <p className="font-[family-name:var(--font-heading)] text-xl text-[#FFDF00]">{brazilStats.probability_champion}%</p>
                    <p className="font-[family-name:var(--font-data)] text-[8px] text-white/50 uppercase">Campeao</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ═══════ CONTENT ═══════ */}
      <div className="space-y-12">

        {/* ═══════ SECTION 1: GRUPOS ═══════ */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#009C3B] to-[#FFDF00]" />
            <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
              FASE DE GRUPOS
            </h2>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
              48 selecoes • 12 grupos
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {sortedGroupNames.map((groupName) => {
              const teams = groupedTeams.get(groupName) || []
              const isBrazilGroup = teams.some((t) => t.team_name === "Brazil")

              return (
                <div
                  key={groupName}
                  className={`rounded-xl p-4 border shadow-sm ${
                    isBrazilGroup
                      ? "bg-gradient-to-br from-green-50 to-yellow-50 border-[#009C3B]/30"
                      : "bg-white border-gray-200"
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-[family-name:var(--font-heading)] text-lg text-gray-900">
                      {groupName.replace("Group ", "GRUPO ")}
                    </span>
                    {isBrazilGroup && (
                      <span className="font-[family-name:var(--font-data)] text-[8px] px-2 py-0.5 rounded-full bg-[#009C3B]/10 text-[#009C3B] font-medium">
                        BRASIL
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {teams.map((team) => {
                      const stats = statsMap.get(team.team_name)
                      const isBrazil = team.team_name === "Brazil"
                      return (
                        <div
                          key={team.team_id}
                          className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg ${
                            isBrazil ? "bg-[#009C3B]/5" : ""
                          }`}
                        >
                          {team.team_logo ? (
                            <img src={team.team_logo} alt="" className="w-6 h-6 object-contain" loading="lazy" />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[8px] text-gray-400">
                              ?
                            </div>
                          )}
                          <span className={`text-xs flex-1 truncate ${isBrazil ? "text-[#009C3B] font-bold" : "text-gray-700"}`}>
                            {ptName(team.team_name)}
                          </span>
                          {stats && <StrengthDots prob={stats.probability_champion} />}
                        </div>
                      )
                    })}
                  </div>

                  {/* Group points (when tournament starts) */}
                  {teams.some((t) => t.played > 0) && (
                    <div className="mt-3 pt-2 border-t border-gray-100">
                      <div className="grid grid-cols-5 gap-1 font-[family-name:var(--font-data)] text-[8px] text-gray-400 text-center">
                        <span>J</span><span>V</span><span>E</span><span>D</span><span>Pts</span>
                      </div>
                      {teams.map((t) => (
                        <div key={t.team_id} className="grid grid-cols-5 gap-1 font-[family-name:var(--font-data)] text-[10px] text-gray-500 text-center">
                          <span>{t.played}</span><span>{t.won}</span><span>{t.drawn}</span><span>{t.lost}</span>
                          <span className="text-gray-900 font-bold">{t.points}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>

        {/* ═══════ SECTION 2: PROBABILIDADES ═══════ */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#009C3B] to-[#FFDF00]" />
            <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
              FAVORITOS AO TITULO
            </h2>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
            <div className="space-y-3">
              {favorites.map((team, i) => {
                const maxProb = favorites[0]?.probability_champion || 1
                const barWidth = (team.probability_champion / maxProb) * 100
                const isBrazil = team.team_name === "Brazil"
                const confColor = CONF_COLORS[team.confederation] || "bg-gray-100 text-gray-500"

                return (
                  <div
                    key={team.team_id}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                      isBrazil ? "bg-green-50 border border-[#009C3B]/20" : "hover:bg-gray-50"
                    }`}
                  >
                    <span className={`font-[family-name:var(--font-heading)] text-lg w-7 text-center ${
                      i === 0 ? "text-[#009C3B]" : i === 1 ? "text-gray-400" : i === 2 ? "text-yellow-600" : "text-gray-300"
                    }`}>
                      {i + 1}
                    </span>

                    {team.team_logo && (
                      <img src={team.team_logo} alt="" className="w-8 h-8 object-contain" loading="lazy" />
                    )}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isBrazil ? "text-[#009C3B]" : "text-gray-900"}`}>
                          {ptName(team.team_name)}
                        </span>
                        <span className={`font-[family-name:var(--font-data)] text-[8px] px-1.5 py-0.5 rounded-full ${confColor}`}>
                          {team.confederation}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full bg-gradient-to-r ${probColor(team.probability_champion)}`}
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                        <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 w-12 text-right hidden sm:inline">
                          avanca {team.probability_advance}%
                        </span>
                      </div>
                    </div>

                    <span className={`font-[family-name:var(--font-heading)] text-xl shrink-0 ${
                      isBrazil ? "text-[#009C3B]" : "text-gray-900"
                    }`}>
                      {team.probability_champion}%
                    </span>
                  </div>
                )
              })}
            </div>

            <p className="font-[family-name:var(--font-data)] text-[8px] text-gray-300 text-center mt-4">
              Modelo Elo com 10.000 simulacoes Monte Carlo do torneio completo (grupos + mata-mata)
            </p>
          </div>
        </section>

        {/* ═══════ SECTION 3: CALENDARIO DO BRASIL ═══════ */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#009C3B] to-[#FFDF00]" />
            <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
              JOGOS DO BRASIL
            </h2>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
              {brazilStats?.wc_group || "Grupo C"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {brazilGames.map((game, i) => {
              const opponent = game.home_team === "Brazil" ? game.away_team : game.home_team
              const oppLogo = game.home_team === "Brazil" ? game.away_logo : game.home_logo
              const isHome = game.home_team === "Brazil"
              const oppStats = statsMap.get(opponent)
              const date = new Date(game.date)
              const dateStr = date.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "long",
                timeZone: "America/Sao_Paulo",
              })
              const timeStr = date.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "America/Sao_Paulo",
              })

              return (
                <div
                  key={game.id}
                  className="bg-white border-l-4 border-l-[#009C3B] border border-gray-200 rounded-xl shadow-sm p-5 relative overflow-hidden"
                >
                  {/* Match number */}
                  <div className="absolute top-3 right-3">
                    <span className="font-[family-name:var(--font-data)] text-[9px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">
                      JOGO {i + 1}
                    </span>
                  </div>

                  <p className="font-[family-name:var(--font-data)] text-[10px] text-[#009C3B] uppercase mb-4 font-medium">
                    {dateStr} — {timeStr} (Brasilia)
                  </p>

                  <div className="flex items-center gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      {brazilStats?.team_logo && (
                        <img src={brazilStats.team_logo} alt="Brasil" className="w-10 h-10 object-contain" />
                      )}
                      <span className="font-[family-name:var(--font-heading)] text-lg text-[#009C3B]">BRA</span>
                    </div>

                    <span className="font-[family-name:var(--font-heading)] text-xl text-gray-300">VS</span>

                    <div className="flex items-center gap-2">
                      <span className="font-[family-name:var(--font-heading)] text-lg text-gray-700">
                        {ptName(opponent).slice(0, 3).toUpperCase()}
                      </span>
                      {oppLogo && (
                        <img src={oppLogo} alt={opponent} className="w-10 h-10 object-contain" loading="lazy" />
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mb-1">
                    {isHome ? "Brasil" : ptName(opponent)} vs {isHome ? ptName(opponent) : "Brasil"}
                  </p>

                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-3 h-3 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">
                      {game.venue}{game.city ? `, ${game.city}` : ""}
                    </span>
                  </div>

                  {oppStats && (
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                      <span className={`font-[family-name:var(--font-data)] text-[8px] px-1.5 py-0.5 rounded-full ${
                        CONF_COLORS[oppStats.confederation] || "bg-gray-100 text-gray-500"
                      }`}>
                        {oppStats.confederation}
                      </span>
                      <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">
                        Ranking #{oppStats.fifa_ranking}
                      </span>
                      <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">
                        Titulo: {oppStats.probability_champion}%
                      </span>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Group C analysis */}
          {brazilStats && (
            <div className="mt-4 bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 uppercase mb-2">
                Analise do {brazilStats.wc_group?.replace("Group", "Grupo")}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(groupedTeams.get(brazilStats.wc_group) || []).map((team) => {
                  const ts = statsMap.get(team.team_name)
                  return (
                    <div key={team.team_id} className="flex items-center gap-2">
                      {team.team_logo && <img src={team.team_logo} alt="" className="w-5 h-5 object-contain" />}
                      <span className={`text-xs ${team.team_name === "Brazil" ? "text-[#009C3B] font-bold" : "text-gray-600"}`}>
                        {ptName(team.team_name)}
                      </span>
                      {ts && (
                        <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 ml-auto">
                          {ts.probability_advance}%
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </section>

        {/* ═══════ SECTION 4: ELIMINATORIAS CONMEBOL ═══════ */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#009C3B] to-[#FFDF00]" />
            <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
              ELIMINATORIAS CONMEBOL
            </h2>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
              Encerradas — 18 rodadas
            </span>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-x-auto">
            <div className="min-w-[540px]">
            {/* Header */}
            <div className="grid grid-cols-12 gap-1 px-4 py-2 bg-gray-50 font-[family-name:var(--font-data)] text-[9px] text-gray-400 uppercase">
              <span className="col-span-1">#</span>
              <span className="col-span-4">Selecao</span>
              <span className="col-span-1 text-center">J</span>
              <span className="col-span-1 text-center">V</span>
              <span className="col-span-1 text-center">E</span>
              <span className="col-span-1 text-center">D</span>
              <span className="col-span-1 text-center">GF</span>
              <span className="col-span-1 text-center">GC</span>
              <span className="col-span-1 text-center font-bold">Pts</span>
            </div>

            {conmebolTeams.map((team, i) => {
              const pos = i + 1
              const isBrazil = team.team_name === "Brazil"
              const isClassified = pos <= 6
              const isPlayoff = pos === 7

              return (
                <div
                  key={team.team_id}
                  className={`grid grid-cols-12 gap-1 px-4 py-2.5 border-t border-gray-100 items-center ${
                    isBrazil
                      ? "bg-green-50"
                      : isClassified
                        ? "bg-green-50/50"
                        : isPlayoff
                          ? "bg-yellow-50/50"
                          : ""
                  }`}
                >
                  <span className={`col-span-1 font-[family-name:var(--font-data)] text-xs ${
                    isClassified ? "text-green-600" : isPlayoff ? "text-yellow-600" : "text-red-500"
                  }`}>
                    {pos}
                  </span>
                  <div className="col-span-4 flex items-center gap-2">
                    {team.team_logo && <img src={team.team_logo} alt="" className="w-5 h-5 object-contain" />}
                    <span className={`text-xs truncate ${isBrazil ? "text-[#009C3B] font-bold" : "text-gray-700"}`}>
                      {ptName(team.team_name)}
                    </span>
                    {isClassified && (
                      <span className="font-[family-name:var(--font-data)] text-[7px] px-1 py-0.5 rounded bg-green-100 text-green-700 shrink-0 hidden sm:inline">
                        CLASS.
                      </span>
                    )}
                  </div>
                  <span className="col-span-1 font-[family-name:var(--font-data)] text-[10px] text-gray-500 text-center">{team.elim_played}</span>
                  <span className="col-span-1 font-[family-name:var(--font-data)] text-[10px] text-gray-500 text-center">{team.elim_won}</span>
                  <span className="col-span-1 font-[family-name:var(--font-data)] text-[10px] text-gray-500 text-center">{team.elim_drawn}</span>
                  <span className="col-span-1 font-[family-name:var(--font-data)] text-[10px] text-gray-500 text-center">{team.elim_lost}</span>
                  <span className="col-span-1 font-[family-name:var(--font-data)] text-[10px] text-gray-500 text-center">{team.elim_gf}</span>
                  <span className="col-span-1 font-[family-name:var(--font-data)] text-[10px] text-gray-500 text-center">{team.elim_ga}</span>
                  <span className={`col-span-1 font-[family-name:var(--font-heading)] text-sm text-center ${
                    isBrazil ? "text-[#009C3B]" : "text-gray-900"
                  }`}>
                    {team.elim_points}
                  </span>
                </div>
              )
            })}

            {/* Legend */}
            <div className="px-4 py-2 bg-gray-50 flex items-center gap-3 sm:gap-4 flex-wrap font-[family-name:var(--font-data)] text-[8px] text-gray-400">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span>Classificado direto (1-6)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>Repescagem (7)</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>Eliminado (8-10)</span>
              </div>
            </div>
            </div>{/* close min-w wrapper */}
          </div>
        </section>

        {/* ═══════ SECTION 5: SEDES ═══════ */}
        <section>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1 h-6 rounded-full bg-gradient-to-b from-[#009C3B] to-[#FFDF00]" />
            <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
              SEDES DA COPA
            </h2>
            <div className="flex-1 h-px bg-gray-200" />
            <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
              {venueStats.length} estadios • 3 paises
            </span>
          </div>

          {["EUA", "Mexico", "Canada"].map((country) => {
            const venues = venueStats.filter((v) => v.country === country)
            if (venues.length === 0) return null

            return (
              <div key={country} className="mb-4">
                <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 uppercase tracking-wide mb-2">
                  {country}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {venues.map((v) => (
                    <div
                      key={v.venue}
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl border shadow-sm ${
                        v.hasBrazil
                          ? "bg-green-50 border-[#009C3B]/20"
                          : "bg-white border-gray-200"
                      }`}
                    >
                      <svg className={`w-4 h-4 shrink-0 ${v.hasBrazil ? "text-[#009C3B]" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                      </svg>
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs truncate ${v.hasBrazil ? "text-[#009C3B] font-medium" : "text-gray-700"}`}>
                          {v.venue}
                        </p>
                        <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">
                          {v.city}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-[family-name:var(--font-heading)] text-sm text-gray-500">
                          {v.count}
                        </span>
                        <p className="font-[family-name:var(--font-data)] text-[8px] text-gray-300">jogos</p>
                      </div>
                      {v.hasBrazil && (
                        <span className="font-[family-name:var(--font-data)] text-[7px] px-1.5 py-0.5 rounded-full bg-[#009C3B]/10 text-[#009C3B]">
                          BRA
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </section>

        {/* ═══════ METHODOLOGY ═══════ */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
          <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-3">METODOLOGIA</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-[family-name:var(--font-data)] text-[10px] text-gray-500">
            <div>
              <p className="text-[#009C3B] font-bold mb-1">Modelo Elo</p>
              <p>Rating base por selecao ajustado pelo desempenho nas Eliminatorias. Times CONMEBOL recebem bonus/penalidade baseado em pontos/jogo e saldo de gols.</p>
            </div>
            <div>
              <p className="text-[#009C3B] font-bold mb-1">Simulacao Monte Carlo</p>
              <p>10.000 simulacoes completas do torneio: fase de grupos (6 jogos por grupo) + mata-mata (R32 ate a final). Resultado de cada jogo determinado por probabilidade Elo.</p>
            </div>
            <div>
              <p className="text-[#009C3B] font-bold mb-1">Fontes de dados</p>
              <p>API-Football (fixtures, grupos, resultados). Eliminatorias CONMEBOL (18 rodadas completas). Dados atualizados em tempo real.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
