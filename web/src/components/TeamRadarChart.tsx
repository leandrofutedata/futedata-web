import type { TeamGameStats } from "@/lib/types"

function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
}

interface Props {
  teamStats: TeamGameStats
  leagueStats: TeamGameStats
}

interface RadarDim {
  label: string
  team: number
  league: number
}

export function TeamRadarChart({ teamStats, leagueStats }: Props) {
  if (teamStats.gamesWithStats === 0) return null

  const dimensions: RadarDim[] = [
    {
      label: "ATAQUE",
      team: normalize(teamStats.goalsPerGame + teamStats.shotsOnTarget / 5, 0, 3.5),
      league: normalize(leagueStats.goalsPerGame + leagueStats.shotsOnTarget / 5, 0, 3.5),
    },
    {
      label: "CRIAÇÃO",
      team: normalize(teamStats.passes / 100 + teamStats.passAccuracy / 25, 0, 10),
      league: normalize(leagueStats.passes / 100 + leagueStats.passAccuracy / 25, 0, 10),
    },
    {
      label: "POSSE",
      team: normalize(teamStats.possession, 30, 70),
      league: normalize(leagueStats.possession, 30, 70),
    },
    {
      label: "PRESSÃO",
      team: normalize(teamStats.fouls, 5, 25),
      league: normalize(leagueStats.fouls, 5, 25),
    },
    {
      label: "EFICIÊNCIA",
      team: normalize(teamStats.shotConversion, 0, 25),
      league: normalize(leagueStats.shotConversion, 0, 25),
    },
    {
      label: "SOLIDEZ",
      team: normalize(2.5 - teamStats.goalsConcededPerGame, 0, 2.5),
      league: normalize(2.5 - leagueStats.goalsConcededPerGame, 0, 2.5),
    },
  ]

  const size = 220
  const center = size / 2
  const radius = 80
  const n = dimensions.length
  const angleStep = (2 * Math.PI) / n

  const getPoint = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2
    const r = (value / 100) * radius
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) }
  }

  const gridLevels = [25, 50, 75, 100]

  const teamPoints = dimensions.map((d, i) => getPoint(i, d.team))
  const teamPath = teamPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z"

  const leaguePoints = dimensions.map((d, i) => getPoint(i, d.league))
  const leaguePath = leaguePoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z"

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-1">ESTILO DE JOGO</h2>
      <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 mb-4">
        Baseado em {teamStats.gamesWithStats} jogos com estatísticas
      </p>

      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[300px] mx-auto">
        {/* Grid */}
        {gridLevels.map((level) => {
          const pts = Array.from({ length: n }, (_, i) => getPoint(i, level))
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z"
          return <path key={level} d={d} fill="none" stroke="#E5E7EB" strokeWidth={0.5} />
        })}
        {/* Axes */}
        {dimensions.map((_, i) => {
          const end = getPoint(i, 100)
          return <line key={i} x1={center} y1={center} x2={end.x} y2={end.y} stroke="#E5E7EB" strokeWidth={0.5} />
        })}
        {/* League average (gray dashed) */}
        <path d={leaguePath} fill="none" stroke="#9CA3AF" strokeWidth={1} strokeDasharray="4 3" opacity={0.6} />
        {/* Team data (green filled) */}
        <path d={teamPath} fill="var(--color-green-primary)" fillOpacity={0.15} stroke="var(--color-green-primary)" strokeWidth={2} />
        {teamPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--color-green-primary)" />
        ))}
        {/* Labels */}
        {dimensions.map((d, i) => {
          const labelPoint = getPoint(i, 128)
          return (
            <text
              key={i}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-gray-500"
              fontSize={7.5}
              fontFamily="var(--font-data)"
            >
              {d.label}
            </text>
          )
        })}
        {/* Value labels */}
        {dimensions.map((d, i) => {
          const valPoint = getPoint(i, d.team + 14)
          return (
            <text
              key={`v-${i}`}
              x={valPoint.x}
              y={valPoint.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-gray-700 font-bold"
              fontSize={7}
              fontFamily="var(--font-data)"
            >
              {Math.round(d.team)}
            </text>
          )
        })}
      </svg>

      <div className="flex items-center justify-center gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-[var(--color-green-primary)]" />
          <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-500">Time</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-gray-400 border-dashed" style={{ borderTop: '1px dashed #9CA3AF', height: 0 }} />
          <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-500">Média liga</span>
        </div>
      </div>
    </div>
  )
}
