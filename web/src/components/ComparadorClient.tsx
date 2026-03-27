"use client"

import { useState, useMemo, useEffect } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import type { TeamStanding } from "@/lib/types"
import type { TeamInfo } from "@/lib/teams"

interface PlayerSummary {
  name: string
  goals: number
  assists: number
  games: number
  avgRating: number
}

interface ComparadorClientProps {
  standings: TeamStanding[]
  teams: TeamInfo[]
  playerStatsMap: Record<string, PlayerSummary[]>
}

type MetricDef = {
  label: string
  key: string
  getValue: (s: TeamStanding) => number | string
  getNumeric: (s: TeamStanding) => number
  higherIsBetter: boolean
  highlight?: boolean
}

const METRICS: MetricDef[] = [
  { label: "Pontos", key: "pts", getValue: s => s.points, getNumeric: s => s.points, higherIsBetter: true },
  { label: "Jogos", key: "played", getValue: s => s.played, getNumeric: s => s.played, higherIsBetter: false },
  { label: "Vitórias", key: "wins", getValue: s => s.wins, getNumeric: s => s.wins, higherIsBetter: true },
  { label: "Empates", key: "draws", getValue: s => s.draws, getNumeric: s => s.draws, higherIsBetter: false },
  { label: "Derrotas", key: "losses", getValue: s => s.losses, getNumeric: s => s.losses, higherIsBetter: false },
  { label: "Gols Pró", key: "gf", getValue: s => s.goalsFor, getNumeric: s => s.goalsFor, higherIsBetter: true },
  { label: "Gols Contra", key: "ga", getValue: s => s.goalsAgainst, getNumeric: s => s.goalsAgainst, higherIsBetter: false },
  { label: "Saldo", key: "gd", getValue: s => s.goalDifference, getNumeric: s => s.goalDifference, higherIsBetter: true },
  { label: "xG", key: "xg", getValue: s => s.xG.toFixed(1), getNumeric: s => s.xG, higherIsBetter: true, highlight: true },
  { label: "xGA", key: "xga", getValue: s => s.xGA.toFixed(1), getNumeric: s => s.xGA, higherIsBetter: false, highlight: true },
  { label: "xPTS", key: "xpts", getValue: s => s.xPTS.toFixed(1), getNumeric: s => s.xPTS, higherIsBetter: true, highlight: true },
  { label: "±PTS", key: "delta", getValue: s => `${s.deltaPTS > 0 ? '+' : ''}${s.deltaPTS.toFixed(1)}`, getNumeric: s => Math.abs(s.deltaPTS), higherIsBetter: false, highlight: true },
  { label: "Aproveit.", key: "pct", getValue: s => `${Math.round((s.points / (s.played * 3)) * 100)}%`, getNumeric: s => s.played > 0 ? (s.points / (s.played * 3)) * 100 : 0, higherIsBetter: true },
  { label: "GP/jogo", key: "gpg", getValue: s => s.played > 0 ? (s.goalsFor / s.played).toFixed(2) : '0', getNumeric: s => s.played > 0 ? s.goalsFor / s.played : 0, higherIsBetter: true },
  { label: "GC/jogo", key: "gcg", getValue: s => s.played > 0 ? (s.goalsAgainst / s.played).toFixed(2) : '0', getNumeric: s => s.played > 0 ? s.goalsAgainst / s.played : 0, higherIsBetter: false },
]

export function ComparadorClient({ standings, teams, playerStatsMap }: ComparadorClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()

  const initialTeam1 = searchParams.get('time1') || ''
  const initialTeam2 = searchParams.get('time2') || ''

  const [slug1, setSlug1] = useState(initialTeam1)
  const [slug2, setSlug2] = useState(initialTeam2)

  const team1 = useMemo(() => teams.find(t => t.slug === slug1), [teams, slug1])
  const team2 = useMemo(() => teams.find(t => t.slug === slug2), [teams, slug2])

  const standing1 = useMemo(() => team1 ? standings.find(s => s.team === team1.apiName) : null, [standings, team1])
  const standing2 = useMemo(() => team2 ? standings.find(s => s.team === team2.apiName) : null, [standings, team2])

  const pos1 = standing1 ? standings.indexOf(standing1) + 1 : 0
  const pos2 = standing2 ? standings.indexOf(standing2) + 1 : 0

  // Update URL when teams change
  useEffect(() => {
    const params = new URLSearchParams()
    if (slug1) params.set('time1', slug1)
    if (slug2) params.set('time2', slug2)
    const newUrl = params.toString() ? `/comparar?${params.toString()}` : '/comparar'
    router.replace(newUrl, { scroll: false })
  }, [slug1, slug2, router])

  const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'))

  return (
    <div className="space-y-6">
      {/* Team selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <TeamSelector
          label="TIME 1"
          selected={slug1}
          onChange={setSlug1}
          teams={sortedTeams}
          teamInfo={team1}
          standing={standing1}
          position={pos1}
        />
        <TeamSelector
          label="TIME 2"
          selected={slug2}
          onChange={setSlug2}
          teams={sortedTeams}
          teamInfo={team2}
          standing={standing2}
          position={pos2}
        />
      </div>

      {/* Comparison table */}
      {standing1 && standing2 && (
        <>
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="grid grid-cols-3 bg-gray-50 border-b border-gray-200 py-3 px-4">
              <div className="text-left">
                <span className="font-[family-name:var(--font-heading)] text-lg" style={{ color: team1?.color }}>{team1?.name.toUpperCase()}</span>
              </div>
              <div className="text-center">
                <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase">Métrica</span>
              </div>
              <div className="text-right">
                <span className="font-[family-name:var(--font-heading)] text-lg" style={{ color: team2?.color }}>{team2?.name.toUpperCase()}</span>
              </div>
            </div>

            {/* Position row */}
            <div className="grid grid-cols-3 py-2.5 px-4 border-b border-gray-50">
              <div className="text-left flex items-center gap-2">
                {pos1 < pos2 && <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />}
                <span className={`font-[family-name:var(--font-heading)] text-lg ${pos1 < pos2 ? 'text-green-600' : 'text-gray-900'}`}>{pos1}º</span>
              </div>
              <div className="text-center flex items-center justify-center">
                <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase">Posição</span>
              </div>
              <div className="text-right flex items-center justify-end gap-2">
                <span className={`font-[family-name:var(--font-heading)] text-lg ${pos2 < pos1 ? 'text-green-600' : 'text-gray-900'}`}>{pos2}º</span>
                {pos2 < pos1 && <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />}
              </div>
            </div>

            {METRICS.map((metric) => {
              const v1 = metric.getNumeric(standing1)
              const v2 = metric.getNumeric(standing2)
              const display1 = metric.getValue(standing1)
              const display2 = metric.getValue(standing2)

              let winner1 = false, winner2 = false
              if (v1 !== v2) {
                if (metric.higherIsBetter) {
                  winner1 = v1 > v2
                  winner2 = v2 > v1
                } else {
                  winner1 = v1 < v2
                  winner2 = v2 < v1
                }
              }

              return (
                <div
                  key={metric.key}
                  className={`grid grid-cols-3 py-2.5 px-4 border-b border-gray-50 last:border-0 ${metric.highlight ? 'bg-[var(--color-green-light)]/30' : ''}`}
                >
                  <div className="text-left flex items-center gap-2">
                    {winner1 && <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />}
                    <span className={`font-[family-name:var(--font-heading)] text-lg ${winner1 ? 'text-green-600' : 'text-gray-900'}`}>{display1}</span>
                  </div>
                  <div className="text-center flex items-center justify-center">
                    <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase">{metric.label}</span>
                  </div>
                  <div className="text-right flex items-center justify-end gap-2">
                    <span className={`font-[family-name:var(--font-heading)] text-lg ${winner2 ? 'text-green-600' : 'text-gray-900'}`}>{display2}</span>
                    {winner2 && <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />}
                  </div>
                </div>
              )
            })}

            {/* Form comparison */}
            <div className="grid grid-cols-3 py-3 px-4 bg-gray-50 border-t border-gray-200">
              <div className="flex gap-0.5">
                {standing1.form.map((r, i) => (
                  <span key={i} className={`form-${r} w-6 h-6 flex items-center justify-center rounded text-xs font-[family-name:var(--font-data)] font-bold`}>{r}</span>
                ))}
              </div>
              <div className="text-center flex items-center justify-center">
                <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase">Forma</span>
              </div>
              <div className="flex gap-0.5 justify-end">
                {standing2.form.map((r, i) => (
                  <span key={i} className={`form-${r} w-6 h-6 flex items-center justify-center rounded text-xs font-[family-name:var(--font-data)] font-bold`}>{r}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Visual bar comparison */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">COMPARAÇÃO VISUAL</h2>
            <div className="space-y-4">
              {[
                { label: "xG", v1: standing1.xG, v2: standing2.xG },
                { label: "xGA", v1: standing1.xGA, v2: standing2.xGA },
                { label: "xPTS", v1: standing1.xPTS, v2: standing2.xPTS },
                { label: "Pontos", v1: standing1.points, v2: standing2.points },
                { label: "Gols Pró", v1: standing1.goalsFor, v2: standing2.goalsFor },
                { label: "Saldo", v1: standing1.goalDifference, v2: standing2.goalDifference },
              ].map(item => {
                const max = Math.max(Math.abs(item.v1), Math.abs(item.v2), 1)
                return (
                  <div key={item.label}>
                    <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 text-center mb-1">{item.label}</p>
                    <div className="flex items-center gap-2">
                      <span className="font-[family-name:var(--font-data)] text-xs font-bold w-10 text-right" style={{ color: team1?.color }}>
                        {typeof item.v1 === 'number' && !Number.isInteger(item.v1) ? item.v1.toFixed(1) : item.v1}
                      </span>
                      <div className="flex-1 flex h-4">
                        <div className="flex-1 flex justify-end">
                          <div className="h-full rounded-l" style={{
                            width: `${(Math.abs(item.v1) / max) * 100}%`,
                            backgroundColor: team1?.color || '#1A1A1A',
                            opacity: 0.6,
                          }} />
                        </div>
                        <div className="w-px bg-gray-300" />
                        <div className="flex-1">
                          <div className="h-full rounded-r" style={{
                            width: `${(Math.abs(item.v2) / max) * 100}%`,
                            backgroundColor: team2?.color || '#1A1A1A',
                            opacity: 0.6,
                          }} />
                        </div>
                      </div>
                      <span className="font-[family-name:var(--font-data)] text-xs font-bold w-10" style={{ color: team2?.color }}>
                        {typeof item.v2 === 'number' && !Number.isInteger(item.v2) ? item.v2.toFixed(1) : item.v2}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Top players comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <TopPlayersCard
              teamName={team1?.name || ''}
              teamColor={team1?.color || '#1A1A1A'}
              players={playerStatsMap[team1?.name || ''] || []}
            />
            <TopPlayersCard
              teamName={team2?.name || ''}
              teamColor={team2?.color || '#1A1A1A'}
              players={playerStatsMap[team2?.name || ''] || []}
            />
          </div>

          {/* Share */}
          <div className="text-center">
            <button
              onClick={() => {
                const url = window.location.href
                if (navigator.share) {
                  navigator.share({ title: `${team1?.name} vs ${team2?.name} — Futedata`, url })
                } else {
                  navigator.clipboard.writeText(url)
                }
              }}
              className="inline-flex items-center gap-2 bg-[var(--color-green-primary)] text-white px-6 py-2.5 rounded-lg font-[family-name:var(--font-heading)] text-sm hover:bg-[var(--color-green-dark)] transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              COMPARTILHAR COMPARAÇÃO
            </button>
          </div>
        </>
      )}

      {/* Error: team selected but no data */}
      {(slug1 && team1 && !standing1) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <p className="font-[family-name:var(--font-heading)] text-lg text-orange-700">Dados insuficientes para {team1.name}</p>
          <p className="font-[family-name:var(--font-data)] text-xs text-orange-500 mt-1">Não há jogos registrados para este time na temporada atual.</p>
        </div>
      )}
      {(slug2 && team2 && !standing2) && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <p className="font-[family-name:var(--font-heading)] text-lg text-orange-700">Dados insuficientes para {team2.name}</p>
          <p className="font-[family-name:var(--font-data)] text-xs text-orange-500 mt-1">Não há jogos registrados para este time na temporada atual.</p>
        </div>
      )}

      {(!slug1 || !slug2 || !standing1 || !standing2) && !((slug1 && team1 && !standing1) || (slug2 && team2 && !standing2)) && (
        <div className="text-center py-12">
          <p className="font-[family-name:var(--font-heading)] text-2xl text-gray-300 mb-2">
            SELECIONE DOIS TIMES
          </p>
          <p className="text-gray-400 text-sm">
            Escolha dois times acima para ver a comparação completa
          </p>
        </div>
      )}
    </div>
  )
}

function TeamSelector({ label, selected, onChange, teams, teamInfo, standing, position }: {
  label: string
  selected: string
  onChange: (slug: string) => void
  teams: TeamInfo[]
  teamInfo?: TeamInfo
  standing?: TeamStanding | null
  position: number
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <label className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase block mb-2">{label}</label>
      <select
        value={selected}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-900 focus:outline-none focus:border-[var(--color-green-primary)] focus:ring-1 focus:ring-[var(--color-green-primary)] appearance-none cursor-pointer"
      >
        <option value="">Selecionar time...</option>
        {teams.map(t => (
          <option key={t.slug} value={t.slug}>{t.name}</option>
        ))}
      </select>
      {teamInfo && (
        <div className="mt-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: teamInfo.color }}>
            <span className="font-[family-name:var(--font-heading)] text-sm text-white">{teamInfo.abbr}</span>
          </div>
          <div>
            <p className="font-[family-name:var(--font-heading)] text-lg">{teamInfo.name.toUpperCase()}</p>
            {standing ? (
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                {position}º · {standing.points}pts · {standing.wins}V {standing.draws}E {standing.losses}D
              </p>
            ) : (
              <p className="font-[family-name:var(--font-data)] text-[10px] text-orange-500">
                Dados insuficientes para este time
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function TopPlayersCard({ teamName, teamColor, players }: { teamName: string; teamColor: string; players: PlayerSummary[] }) {
  if (players.length === 0) return null
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-3" style={{ color: teamColor }}>
        {teamName.toUpperCase()}
      </h3>
      <div className="space-y-2">
        {players.map((p, i) => (
          <div key={i} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
            <div>
              <p className="text-sm font-medium text-gray-900">{p.name}</p>
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">{p.games} jogos · {p.goals}G {p.assists}A</p>
            </div>
            <span className="font-[family-name:var(--font-heading)] text-lg text-[var(--color-green-primary)]">{p.avgRating.toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
