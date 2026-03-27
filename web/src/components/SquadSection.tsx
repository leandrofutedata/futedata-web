"use client"

import { useState } from "react"
import Image from "next/image"
import Link from "next/link"

export interface SquadPlayerData {
  player_id: number
  player_name: string
  age: number | null
  number: number | null
  position: string
  photo: string | null
  slug: string | null
  stats: {
    goals: number
    assists: number
    games: number
    avgRating: number
    minutes: number
    passesTotal: number
    passesAccurate: number
    tackles: number
    interceptions: number
    duelsWon: number
    saves: number
  } | null
}

interface SquadSectionProps {
  squadByPosition: { position: string; label: string; players: SquadPlayerData[] }[]
  teamColor: string
  totalPlayers: number
}

export function SquadSection({ squadByPosition, teamColor, totalPlayers }: SquadSectionProps) {
  const [expanded, setExpanded] = useState<number | null>(null)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">ELENCO</h2>
      <div className="space-y-5">
        {squadByPosition.map((group) => (
          <div key={group.position}>
            <h3 className="font-[family-name:var(--font-data)] text-[11px] text-gray-400 uppercase tracking-widest mb-2">{group.label}</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {group.players.map((p) => {
                const isExpanded = expanded === p.player_id
                const hasStats = p.stats && p.stats.games > 0

                const card = (
                  <div className={`rounded-lg border transition-colors ${isExpanded ? 'border-[var(--color-green-primary)]/30 bg-[var(--color-green-light)]/30' : 'border-gray-100 hover:bg-gray-50 hover:border-gray-200'}`}>
                    <div
                      className="flex items-center gap-3 p-2.5 cursor-pointer"
                      onClick={(e) => {
                        if (hasStats) {
                          e.preventDefault()
                          e.stopPropagation()
                          setExpanded(isExpanded ? null : p.player_id)
                        }
                      }}
                    >
                      {p.photo ? (
                        <Image src={p.photo} alt={p.player_name} width={36} height={36} className="rounded-full object-cover" />
                      ) : (
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold font-[family-name:var(--font-data)]" style={{ backgroundColor: teamColor }}>
                          {p.player_name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {p.number && <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">#{p.number}</span>}
                          <p className="text-sm font-medium truncate">{p.player_name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {p.age && <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">{p.age} anos</span>}
                          {p.stats && p.stats.games > 0 && (
                            <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                              {p.stats.games}J{p.stats.goals > 0 ? ` ${p.stats.goals}G` : ''}{p.stats.assists > 0 ? ` ${p.stats.assists}A` : ''}
                            </span>
                          )}
                          {p.stats && p.stats.avgRating > 0 && (
                            <span className="font-[family-name:var(--font-data)] text-[10px] text-[var(--color-green-primary)] font-bold">{p.stats.avgRating.toFixed(1)}</span>
                          )}
                        </div>
                      </div>
                      {hasStats && (
                        <span className={`text-gray-400 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                      )}
                    </div>

                    {isExpanded && p.stats && (
                      <div className="px-3 pb-3 border-t border-gray-100 mt-0">
                        <div className="grid grid-cols-3 gap-2 pt-2.5">
                          <StatCell label="Jogos" value={String(p.stats.games)} />
                          <StatCell label="Minutos" value={String(p.stats.minutes)} />
                          <StatCell label="Min/jogo" value={p.stats.games > 0 ? (p.stats.minutes / p.stats.games).toFixed(0) : '0'} />
                          <StatCell label="Gols" value={String(p.stats.goals)} highlight={p.stats.goals > 0} />
                          <StatCell label="Assistências" value={String(p.stats.assists)} highlight={p.stats.assists > 0} />
                          <StatCell label="Nota Média" value={p.stats.avgRating > 0 ? p.stats.avgRating.toFixed(2) : '-'} highlight={p.stats.avgRating >= 7} />
                          <StatCell label="Passes" value={String(p.stats.passesTotal)} />
                          <StatCell label="Passes Certos" value={p.stats.passesTotal > 0 ? `${Math.round((p.stats.passesAccurate / p.stats.passesTotal) * 100)}%` : '-'} />
                          <StatCell label="Desarmes" value={String(p.stats.tackles)} />
                          <StatCell label="Interceptações" value={String(p.stats.interceptions)} />
                          <StatCell label="Duelos Ganhos" value={String(p.stats.duelsWon)} />
                          {p.position === 'Goalkeeper' && <StatCell label="Defesas" value={String(p.stats.saves)} highlight={p.stats.saves > 0} />}
                        </div>
                        {p.slug && (
                          <Link
                            href={`/jogadores/${p.slug}`}
                            className="mt-2.5 block text-center font-[family-name:var(--font-data)] text-[10px] text-[var(--color-green-primary)] hover:underline"
                          >
                            Ver perfil completo →
                          </Link>
                        )}
                      </div>
                    )}
                  </div>
                )

                // Wrap in Link only if NOT expanded and has a page
                if (!isExpanded && p.slug) {
                  return (
                    <div key={p.player_id}>
                      {card}
                    </div>
                  )
                }
                return <div key={p.player_id}>{card}</div>
              })}
            </div>
          </div>
        ))}
      </div>
      <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-300 mt-4 text-center">{totalPlayers} jogadores no elenco</p>
    </div>
  )
}

function StatCell({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center p-1">
      <p className="font-[family-name:var(--font-data)] text-[8px] text-gray-400 uppercase">{label}</p>
      <p className={`font-[family-name:var(--font-heading)] text-sm ${highlight ? 'text-[var(--color-green-primary)]' : 'text-gray-800'}`}>{value}</p>
    </div>
  )
}
