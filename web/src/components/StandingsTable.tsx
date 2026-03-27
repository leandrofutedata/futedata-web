"use client"

import { useState } from "react"
import Link from "next/link"
import type { TeamStanding } from "@/lib/types"
import { getTeamLabel, getZoneColor } from "@/lib/calculations"
import { getTeamSlug } from "@/lib/teams"
import { TeamSpotlight } from "./TeamSpotlight"

const METRIC_TOOLTIPS: Record<string, string> = {
  xG: "Gols esperados — quantos gols o time deveria ter marcado baseado na qualidade das chances criadas",
  xGA: "Gols esperados sofridos — quantos gols o time deveria ter sofrido baseado nas chances que permitiu",
  xPTS: "Pontos esperados — quantos pontos o time mereceria com base no seu desempenho real em campo",
  "±PTS": "Diferença entre pontos reais e esperados. Positivo = time com sorte ou eficiente. Negativo = time que merecia mais",
}

function MetricTooltip({ label }: { label: string }) {
  const [open, setOpen] = useState(false)
  const tooltip = METRIC_TOOLTIPS[label]
  if (!tooltip) return <>{label}</>

  return (
    <span className="relative inline-flex items-center gap-0.5">
      {label}
      <button
        type="button"
        className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full bg-gray-300 text-[8px] font-bold text-gray-600 hover:bg-[var(--color-green-primary)] hover:text-white transition-colors leading-none"
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        aria-label={`Explicação de ${label}`}
      >
        ?
      </button>
      {open && (
        <span className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 px-3 py-2 bg-gray-900 text-white text-[11px] leading-snug rounded-lg shadow-lg pointer-events-none">
          {tooltip}
          <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </span>
      )}
    </span>
  )
}

interface StandingsTableProps {
  standings: TeamStanding[]
  standingsInsight?: string
}

export function StandingsTable({ standings, standingsInsight }: StandingsTableProps) {
  const [expandedTeam, setExpandedTeam] = useState<string | null>(null)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
          CLASSIFICAÇÃO — BRASILEIRÃO SÉRIE A
        </h2>
        {standingsInsight && (
          <div className="mt-3 border-l-4 border-[var(--color-green-primary)] pl-4 py-2">
            <p className="font-[family-name:var(--font-data)] text-[10px] uppercase tracking-wide text-[var(--color-green-primary)] font-medium mb-1.5">
              O que os dados dizem desta rodada
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">
              {standingsInsight}
            </p>
          </div>
        )}
      </div>
      <div className="overflow-x-auto table-scroll">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-2 py-3 font-[family-name:var(--font-data)] text-xs text-gray-500 font-medium w-8">
                #
              </th>
              <th className="text-left px-2 py-3 font-[family-name:var(--font-data)] text-xs text-gray-500 font-medium min-w-[160px]">
                Time
              </th>
              <th className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs text-gray-500 font-medium">
                J
              </th>
              <th className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs text-gray-500 font-medium font-bold">
                PTS
              </th>
              <th className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs text-gray-500 font-medium">
                V
              </th>
              <th className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs text-gray-500 font-medium">
                E
              </th>
              <th className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs text-gray-500 font-medium">
                D
              </th>
              <th className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs text-gray-500 font-medium">
                GF
              </th>
              <th className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs text-gray-500 font-medium">
                GC
              </th>
              <th className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs text-gray-500 font-medium">
                SG
              </th>
              <th className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs text-gray-500 font-medium bg-[var(--color-green-light)]">
                <MetricTooltip label="xG" />
              </th>
              <th className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs text-gray-500 font-medium bg-[var(--color-green-light)]">
                <MetricTooltip label="xGA" />
              </th>
              <th className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs text-gray-500 font-medium bg-[var(--color-green-light)]">
                <MetricTooltip label="xPTS" />
              </th>
              <th className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs text-gray-500 font-medium bg-[var(--color-green-light)]">
                <MetricTooltip label="±PTS" />
              </th>
              <th className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs text-gray-500 font-medium">
                Forma
              </th>
            </tr>
          </thead>
          {standings.map((team, index) => {
            const position = index + 1
            const label = getTeamLabel(team, position, standings.length)
            const zoneColor = getZoneColor(position, standings.length)
            const isExpanded = expandedTeam === team.team

            return (
              <tbody key={team.team}>
                <tr
                  className={`border-b border-gray-100 cursor-pointer transition-colors hover:bg-[var(--color-green-light)]/40 ${
                    isExpanded ? "bg-[var(--color-green-light)]" : index % 2 === 1 ? "bg-[#FAFAF9]" : ""
                  }`}
                  onClick={() =>
                    setExpandedTeam(isExpanded ? null : team.team)
                  }
                >
                  <td className="px-2 py-3 relative">
                    <div
                      className={`zone-strip absolute left-0 top-0 bottom-0 ${zoneColor}`}
                    />
                    <span className="font-[family-name:var(--font-data)] text-xs text-gray-500 pl-2">
                      {position}
                    </span>
                  </td>
                  <td className="px-2 py-3">
                    <div className="flex items-center gap-2">
                      <Link
                        href={`/times/${getTeamSlug(team.team)}`}
                        className="font-medium text-gray-900 hover:text-[var(--color-green-primary)] transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {team.team}
                      </Link>
                      {label && (
                        <span
                          className={`font-[family-name:var(--font-data)] text-[10px] ${label.color} bg-opacity-10 px-1.5 py-0.5 rounded whitespace-nowrap`}
                        >
                          {label.emoji} {label.label}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs">
                    {team.played}
                  </td>
                  <td className="text-center px-2 py-3 font-[family-name:var(--font-heading)] text-lg font-bold">
                    {team.points}
                  </td>
                  <td className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs text-green-600">
                    {team.wins}
                  </td>
                  <td className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs text-gray-500">
                    {team.draws}
                  </td>
                  <td className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs text-red-500">
                    {team.losses}
                  </td>
                  <td className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs">
                    {team.goalsFor}
                  </td>
                  <td className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs">
                    {team.goalsAgainst}
                  </td>
                  <td className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs font-medium">
                    {team.goalDifference > 0
                      ? `+${team.goalDifference}`
                      : team.goalDifference}
                  </td>
                  <td className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs bg-[var(--color-green-light)]/50">
                    {team.xG.toFixed(1)}
                  </td>
                  <td className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs bg-[var(--color-green-light)]/50">
                    {team.xGA.toFixed(1)}
                  </td>
                  <td className="text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs bg-[var(--color-green-light)]/50">
                    {team.xPTS.toFixed(1)}
                  </td>
                  <td
                    className={`text-center px-2 py-3 font-[family-name:var(--font-data)] text-xs font-bold bg-[var(--color-green-light)]/50 ${
                      team.deltaPTS > 0
                        ? "text-orange-500"
                        : team.deltaPTS < 0
                          ? "text-green-600"
                          : "text-gray-500"
                    }`}
                  >
                    {team.deltaPTS > 0
                      ? `+${team.deltaPTS.toFixed(1)}`
                      : team.deltaPTS.toFixed(1)}
                  </td>
                  <td className="text-center px-2 py-3">
                    <div className="flex gap-0.5 justify-center">
                      {team.form.map((result, i) => (
                        <span
                          key={i}
                          className={`form-${result} w-5 h-5 flex items-center justify-center rounded text-[10px] font-[family-name:var(--font-data)] font-bold`}
                        >
                          {result}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
                {isExpanded && (
                  <tr>
                    <td colSpan={15} className="p-0">
                      <TeamSpotlight team={team} position={position} />
                    </td>
                  </tr>
                )}
              </tbody>
            )
          })}
        </table>
      </div>

      {/* Zone legend */}
      <div className="px-6 py-3 border-t border-gray-100 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-4 rounded text-[9px] font-bold text-white bg-blue-600 flex items-center justify-center font-[family-name:var(--font-data)]">L</span>
          <span className="text-gray-500">Libertadores</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-4 rounded text-[9px] font-bold text-white bg-green-600 flex items-center justify-center font-[family-name:var(--font-data)]">S</span>
          <span className="text-gray-500">Sul-Americana</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-5 h-4 rounded text-[9px] font-bold text-white bg-red-600 flex items-center justify-center font-[family-name:var(--font-data)]">Z</span>
          <span className="text-gray-500">Rebaixamento</span>
        </div>
        <div className="flex items-center gap-1.5 ml-auto font-[family-name:var(--font-data)] text-gray-400">
          Clique no time para ver detalhes
        </div>
      </div>
    </div>
  )
}
