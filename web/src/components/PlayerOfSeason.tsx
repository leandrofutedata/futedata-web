import Link from "next/link"
import Image from "next/image"

export interface RadarDim {
  label: string
  value: number
}

interface Props {
  player: {
    id: number
    name: string
    photo: string | null
    slug: string
    position: string
    games: number
    goals: number
    assists: number
    avgRating: number
  }
  radarDimensions: RadarDim[]
  aiInsight: string
  teamColor: string
}

export function PlayerOfSeason({ player, radarDimensions, aiInsight, teamColor }: Props) {
  const size = 160
  const center = size / 2
  const radius = 55
  const n = radarDimensions.length
  const angleStep = (2 * Math.PI) / n

  const getPoint = (index: number, value: number) => {
    const angle = index * angleStep - Math.PI / 2
    const r = (value / 100) * radius
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) }
  }

  const gridLevels = [33, 66, 100]
  const dataPoints = radarDimensions.map((d, i) => getPoint(i, d.value))
  const pathData = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z"

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
      <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-3">JOGADOR DA TEMPORADA</h3>

      <div className="flex items-center gap-3 mb-3">
        {player.photo ? (
          <Image src={player.photo} alt={player.name} width={48} height={48} className="w-12 h-12 rounded-full object-cover" />
        ) : (
          <div className="w-12 h-12 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: teamColor }}>
            {player.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{player.name}</p>
          <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
            {player.position} · {player.games} jogos · {player.goals}G {player.assists}A
          </p>
        </div>
        <div className="text-center">
          <p className="font-[family-name:var(--font-heading)] text-2xl" style={{ color: teamColor }}>{player.avgRating.toFixed(1)}</p>
          <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">RATING</p>
        </div>
      </div>

      {/* Mini radar */}
      <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[180px] mx-auto my-2">
        {gridLevels.map((level) => {
          const pts = Array.from({ length: n }, (_, i) => getPoint(i, level))
          const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z"
          return <path key={level} d={d} fill="none" stroke="#E5E7EB" strokeWidth={0.5} />
        })}
        {radarDimensions.map((_, i) => {
          const end = getPoint(i, 100)
          return <line key={i} x1={center} y1={center} x2={end.x} y2={end.y} stroke="#E5E7EB" strokeWidth={0.5} />
        })}
        <path d={pathData} fill={teamColor} fillOpacity={0.15} stroke={teamColor} strokeWidth={1.5} />
        {dataPoints.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={2.5} fill={teamColor} />
        ))}
        {radarDimensions.map((d, i) => {
          const labelPoint = getPoint(i, 130)
          return (
            <text
              key={i}
              x={labelPoint.x}
              y={labelPoint.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-gray-500"
              fontSize={6.5}
              fontFamily="var(--font-data)"
            >
              {d.label}
            </text>
          )
        })}
      </svg>

      {aiInsight && (
        <p className="text-xs text-gray-600 leading-relaxed mt-2 mb-3">{aiInsight}</p>
      )}

      <Link
        href={`/jogadores/${player.slug}`}
        className="block text-center font-[family-name:var(--font-data)] text-[10px] text-[var(--color-green-primary)] hover:underline"
      >
        Ver perfil completo →
      </Link>
    </div>
  )
}
