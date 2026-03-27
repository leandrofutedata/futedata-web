"use client"

import { useState, useMemo } from "react"
import type { Game, TeamStanding, PlayerStats } from "@/lib/types"
import { getTeamByName } from "@/lib/teams"

interface SidebarProps {
  standings: TeamStanding[]
  upcomingGames: Game[]
  playerStats: PlayerStats[]
}

/* ─── Player aggregation for sidebar ─── */
interface PlayerAgg {
  player_id: number
  name: string
  team: string
  position: string
  games: number
  goals: number
  assists: number
  avgRating: number
  passesTotal: number
  passesAccurate: number
  passAccuracy: number
  tackles: number
  interceptions: number
  defensiveActions: number
  saves: number
}

type HighlightTab = "artilharia" | "assistencias" | "avaliacao" | "passes" | "defesa" | "goleiros"

const HIGHLIGHT_TABS: { id: HighlightTab; label: string }[] = [
  { id: "artilharia", label: "Gols" },
  { id: "assistencias", label: "Assist" },
  { id: "avaliacao", label: "Rating" },
  { id: "passes", label: "Passes" },
  { id: "defesa", label: "Defesa" },
  { id: "goleiros", label: "Goleiros" },
]

const TEAM_COLORS: Record<string, string> = {
  Flamengo: "#B71C1C", Palmeiras: "#1B5E20", "Atletico-MG": "#212121",
  Fluminense: "#880E4F", Corinthians: "#212121", "Sao Paulo": "#B71C1C",
  Internacional: "#C62828", Gremio: "#0D47A1", Santos: "#212121",
  Botafogo: "#212121", "Vasco DA Gama": "#212121", Cruzeiro: "#1565C0",
  Bahia: "#0D47A1", "Fortaleza EC": "#B71C1C", "Atletico Paranaense": "#B71C1C",
  "RB Bragantino": "#212121", Coritiba: "#1B5E20", Vitoria: "#B71C1C",
  Mirassol: "#F9A825", "Chapecoense-sc": "#1B5E20", Remo: "#0D47A1",
}

function aggregateStats(stats: PlayerStats[]): PlayerAgg[] {
  const map = new Map<number, PlayerAgg>()
  for (const s of stats) {
    if (!map.has(s.player_id)) {
      map.set(s.player_id, {
        player_id: s.player_id, name: s.player_name, team: s.team,
        position: s.position, games: 0, goals: 0, assists: 0,
        avgRating: 0, passesTotal: 0, passesAccurate: 0, passAccuracy: 0,
        tackles: 0, interceptions: 0, defensiveActions: 0, saves: 0,
      })
    }
    const p = map.get(s.player_id)!
    p.games++
    p.goals += s.goals
    p.assists += s.assists
    p.passesTotal += s.passes_total
    p.passesAccurate += s.passes_accurate
    p.tackles += s.tackles
    p.interceptions += s.interceptions
    p.saves += s.saves
    if (s.rating) p.avgRating += s.rating
  }
  for (const p of map.values()) {
    if (p.games > 0 && p.avgRating > 0) p.avgRating = p.avgRating / p.games
    p.passAccuracy = p.passesTotal > 0 ? (p.passesAccurate / p.passesTotal) * 100 : 0
    p.defensiveActions = p.tackles + p.interceptions
  }
  return Array.from(map.values())
}

function getTabData(agg: PlayerAgg[], tab: HighlightTab): { players: PlayerAgg[]; valueLabel: string; getValue: (p: PlayerAgg) => string } {
  switch (tab) {
    case "artilharia":
      return {
        players: agg.filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals),
        valueLabel: "Gols",
        getValue: (p) => String(p.goals),
      }
    case "assistencias":
      return {
        players: agg.filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists),
        valueLabel: "Assist",
        getValue: (p) => String(p.assists),
      }
    case "avaliacao":
      return {
        players: agg.filter(p => p.avgRating > 0 && p.games >= 2).sort((a, b) => b.avgRating - a.avgRating),
        valueLabel: "Rating",
        getValue: (p) => p.avgRating.toFixed(1),
      }
    case "passes":
      return {
        players: agg.filter(p => p.passesTotal > 0 && p.games >= 2).sort((a, b) => b.passAccuracy - a.passAccuracy),
        valueLabel: "Precisao",
        getValue: (p) => `${p.passAccuracy.toFixed(0)}%`,
      }
    case "defesa":
      return {
        players: agg.filter(p => p.defensiveActions > 0 && p.position !== "G").sort((a, b) => b.defensiveActions - a.defensiveActions),
        valueLabel: "Des+Int",
        getValue: (p) => String(p.defensiveActions),
      }
    case "goleiros":
      return {
        players: agg.filter(p => p.position === "G" && p.games >= 1).sort((a, b) => b.saves - a.saves),
        valueLabel: "Defesas",
        getValue: (p) => String(p.saves),
      }
  }
}

/* ─── Sub-components ─── */

function TeamBadge({ team }: { team: string }) {
  const color = TEAM_COLORS[team] || "#00843D"
  const initials = team.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase()
  return (
    <div
      className="w-5 h-5 rounded-full flex items-center justify-center text-white text-[7px] font-bold shrink-0"
      style={{ backgroundColor: color }}
    >
      {initials}
    </div>
  )
}

function PlayerHighlights({ playerStats }: { playerStats: PlayerStats[] }) {
  const [activeTab, setActiveTab] = useState<HighlightTab>("artilharia")

  const agg = useMemo(() => aggregateStats(playerStats), [playerStats])

  const { players, valueLabel, getValue } = useMemo(
    () => getTabData(agg, activeTab),
    [agg, activeTab]
  )

  const top10 = players.slice(0, 10)
  const leaderValue = top10.length > 0 ? parseFloat(getValue(top10[0])) : 1

  if (playerStats.length === 0) return null

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-5 pt-4 pb-2">
        <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900">
          DESTAQUES INDIVIDUAIS
        </h3>
      </div>

      {/* Tabs */}
      <div className="px-4 pb-2 flex gap-1 flex-wrap">
        {HIGHLIGHT_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`font-[family-name:var(--font-data)] text-[10px] px-2 py-1 rounded-full transition-colors ${
              activeTab === tab.id
                ? "bg-[var(--color-green-primary)] text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Player list */}
      <div className="px-4 pb-4">
        {top10.length === 0 ? (
          <p className="text-xs text-gray-400 py-4 text-center">Sem dados disponiveis</p>
        ) : (
          <div className="space-y-0.5">
            {top10.map((p, i) => {
              const val = parseFloat(getValue(p))
              const barPct = leaderValue > 0 ? (val / leaderValue) * 100 : 0
              return (
                <div key={p.player_id} className="flex items-center gap-2 py-1.5 group">
                  <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 w-4 text-right">
                    {i + 1}
                  </span>
                  <TeamBadge team={p.team} />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-gray-800 font-medium truncate leading-tight">
                      {p.name}
                    </p>
                    <div className="flex items-center gap-1.5">
                      <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 truncate">
                        {p.team}
                      </span>
                      <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-300">
                        {p.games}j
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-12 h-1 bg-gray-100 rounded-full overflow-hidden hidden sm:block">
                      <div
                        className="h-full bg-[var(--color-green-primary)] rounded-full transition-all"
                        style={{ width: `${barPct}%` }}
                      />
                    </div>
                    <span className="font-[family-name:var(--font-heading)] text-sm text-[var(--color-green-primary)] w-8 text-right">
                      {getValue(p)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
        <p className="font-[family-name:var(--font-data)] text-[8px] text-gray-300 text-center mt-2 uppercase">
          {valueLabel} | Dados de {new Set(playerStats.map(s => s.game_id)).size} jogos
        </p>
      </div>
    </div>
  )
}

/* ─── Main Sidebar ─── */

export function Sidebar({ standings, upcomingGames, playerStats }: SidebarProps) {
  const leader = standings[0]
  const bestDefense = standings.length > 0
    ? standings.reduce((best, t) =>
        t.xGA / (t.played || 1) < best.xGA / (best.played || 1) ? t : best,
        standings[0]
      )
    : null
  const bestAttack = standings.length > 0
    ? standings.reduce((best, t) =>
        t.xG / (t.played || 1) > best.xG / (best.played || 1) ? t : best,
        standings[0]
      )
    : null
  const mostUnlucky = standings.length > 0
    ? standings.reduce((best, t) => (t.deltaPTS < best.deltaPTS ? t : best), standings[0])
    : null
  const mostLucky = standings.length > 0
    ? standings.reduce((best, t) => (t.deltaPTS > best.deltaPTS ? t : best), standings[0])
    : null

  return (
    <aside className="space-y-6">
      {/* Stats compacto — Melhor Ataque + Mais Azarado side-by-side */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-3">
          <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900">
            DESTAQUES DO MODELO
          </h3>
        </div>
        <div className="grid grid-cols-2">
          {bestAttack && (
            <div className="border-t-4 border-t-[var(--color-green-primary)] p-4">
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase tracking-wide">
                Melhor Ataque
              </p>
              <p className="font-[family-name:var(--font-heading)] text-2xl text-[var(--color-green-primary)] leading-tight">
                {bestAttack.xG.toFixed(1)}
              </p>
              <p className="text-xs font-medium text-gray-900 mt-0.5">{getTeamByName(bestAttack.team)?.name || bestAttack.team}</p>
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                {(bestAttack.goalsFor / (bestAttack.played || 1)).toFixed(2)}/jogo
              </p>
            </div>
          )}
          {mostUnlucky && mostUnlucky.deltaPTS < 0 && (
            <div className="border-t-4 border-t-[var(--color-yellow-accent)] p-4">
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase tracking-wide">
                Mais Azarado
              </p>
              <p className="font-[family-name:var(--font-heading)] text-2xl text-[var(--color-alert-red)] leading-tight">
                {mostUnlucky.deltaPTS.toFixed(1)}
              </p>
              <p className="text-xs font-medium text-gray-900 mt-0.5">{getTeamByName(mostUnlucky.team)?.name || mostUnlucky.team}</p>
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                merecia +{Math.abs(mostUnlucky.deltaPTS).toFixed(1)} pts
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ═══ DESTAQUES DA RODADA (Player highlights) ═══ */}
      <PlayerHighlights playerStats={playerStats} />

      {/* Upcoming games */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-4">
          PROXIMOS JOGOS
        </h3>
        <div className="space-y-3">
          {upcomingGames.length === 0 && (
            <p className="text-sm text-gray-400">Nenhum jogo agendado</p>
          )}
          {upcomingGames.slice(0, 7).map((game) => (
            <div
              key={game.id}
              className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-800 text-xs">
                  {getTeamByName(game.home_team)?.name || game.home_team} vs {getTeamByName(game.away_team)?.name || game.away_team}
                </p>
                <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                  {new Date(game.date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-4">
          INSIGHTS DO MODELO
        </h3>
        <div className="space-y-3">
          {leader && (
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <span className="text-lg">🏆</span>
              <div>
                <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 uppercase">
                  Lider
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {getTeamByName(leader.team)?.name || leader.team} ({leader.points} pts)
                </p>
              </div>
            </div>
          )}
          {mostUnlucky && mostUnlucky.deltaPTS < 0 && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <span className="text-lg">🍀</span>
              <div>
                <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 uppercase">
                  Mais Azarado
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {getTeamByName(mostUnlucky.team)?.name || mostUnlucky.team} ({mostUnlucky.deltaPTS.toFixed(1)} ±PTS)
                </p>
              </div>
            </div>
          )}
          {mostLucky && mostLucky.deltaPTS > 0 && (
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <span className="text-lg">⚠</span>
              <div>
                <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 uppercase">
                  Mais Sortudo
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {getTeamByName(mostLucky.team)?.name || mostLucky.team} (+{mostLucky.deltaPTS.toFixed(1)} ±PTS)
                </p>
              </div>
            </div>
          )}
          {bestDefense && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-lg">🛡</span>
              <div>
                <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 uppercase">
                  Melhor Defesa (xGA)
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {getTeamByName(bestDefense.team)?.name || bestDefense.team} ({(bestDefense.xGA / (bestDefense.played || 1)).toFixed(2)}/jogo)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Glossary */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-4">
          GLOSSARIO
        </h3>
        <div className="space-y-3">
          <div>
            <p className="font-[family-name:var(--font-data)] text-xs font-medium text-[var(--color-green-primary)]">
              xG (Expected Goals)
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Gols esperados com base na qualidade das chances criadas. Mede o quanto um time deveria ter feito de gol.
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-data)] text-xs font-medium text-[var(--color-green-primary)]">
              xGA (Expected Goals Against)
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Gols esperados sofridos. Quanto menor, melhor a defesa do time.
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-data)] text-xs font-medium text-[var(--color-green-primary)]">
              xPTS (Expected Points)
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Quantos pontos o time deveria ter baseado no seu desempenho real de xG e xGA.
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-data)] text-xs font-medium text-[var(--color-green-primary)]">
              ±PTS (Delta Points)
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Diferenca entre pontos reais e xPTS. Positivo = sortudo (fez mais pontos do que merecia). Negativo = azarado (merecia mais pontos).
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
