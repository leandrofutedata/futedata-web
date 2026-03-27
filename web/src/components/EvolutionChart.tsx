"use client"

import { useState } from "react"

export interface EvolutionPoint {
  round: number
  pts: number
  xpts: number
}

interface EvolutionChartProps {
  data: EvolutionPoint[]
}

export function EvolutionChart({ data }: EvolutionChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)

  if (data.length < 2) return null

  const W = 600
  const H = 260
  const PAD_LEFT = 36
  const PAD_RIGHT = 16
  const PAD_TOP = 24
  const PAD_BOTTOM = 32

  const chartW = W - PAD_LEFT - PAD_RIGHT
  const chartH = H - PAD_TOP - PAD_BOTTOM

  const maxVal = Math.max(...data.map(d => Math.max(d.pts, d.xpts)), 1)
  const yMax = Math.ceil(maxVal / 3) * 3 // Round up to nearest multiple of 3

  const xScale = (i: number) => PAD_LEFT + (i / (data.length - 1)) * chartW
  const yScale = (v: number) => PAD_TOP + chartH - (v / yMax) * chartH

  // Build path strings
  const ptsPoints = data.map((d, i) => `${xScale(i)},${yScale(d.pts)}`).join(' ')
  const xptsPoints = data.map((d, i) => `${xScale(i)},${yScale(d.xpts)}`).join(' ')

  // Shaded area between lines
  const areaPath = [
    `M ${xScale(0)},${yScale(data[0].pts)}`,
    ...data.slice(1).map((d, i) => `L ${xScale(i + 1)},${yScale(d.pts)}`),
    ...data.map((d, i) => `L ${xScale(data.length - 1 - i)},${yScale(data[data.length - 1 - i].xpts)}`).reverse(),
    'Z'
  ].join(' ')

  // Proper area path: go forward on PTS line, backward on xPTS line
  const areaPathCorrect = [
    `M ${xScale(0)},${yScale(data[0].pts)}`,
    ...data.slice(1).map((_, i) => `L ${xScale(i + 1)},${yScale(data[i + 1].pts)}`),
    `L ${xScale(data.length - 1)},${yScale(data[data.length - 1].xpts)}`,
    ...data.slice(0, -1).reverse().map((d, i) => `L ${xScale(data.length - 2 - i)},${yScale(d.xpts)}`),
    'Z'
  ].join(' ')

  // Y-axis grid lines
  const yTicks: number[] = []
  const step = yMax <= 12 ? 3 : yMax <= 30 ? 5 : 10
  for (let v = 0; v <= yMax; v += step) yTicks.push(v)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">EVOLUÇÃO PTS vs xPTS</h2>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" style={{ maxHeight: '280px' }}>
          {/* Grid lines */}
          {yTicks.map(v => (
            <g key={v}>
              <line x1={PAD_LEFT} y1={yScale(v)} x2={W - PAD_RIGHT} y2={yScale(v)} stroke="#e5e7eb" strokeWidth="0.5" />
              <text x={PAD_LEFT - 6} y={yScale(v) + 3} textAnchor="end" fontSize="9" fill="#9ca3af" fontFamily="var(--font-data)">{v}</text>
            </g>
          ))}

          {/* Shaded area between lines */}
          <path d={areaPathCorrect} fill="var(--color-green-primary)" opacity="0.08" />

          {/* xPTS line (dashed) */}
          <polyline
            points={xptsPoints}
            fill="none"
            stroke="var(--color-green-primary)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
            opacity="0.5"
          />

          {/* PTS line (solid) */}
          <polyline
            points={ptsPoints}
            fill="none"
            stroke="var(--color-green-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points and hover areas */}
          {data.map((d, i) => (
            <g key={i}>
              {/* Invisible hover area */}
              <rect
                x={xScale(i) - chartW / data.length / 2}
                y={PAD_TOP}
                width={chartW / data.length}
                height={chartH}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />

              {/* PTS dot */}
              <circle
                cx={xScale(i)}
                cy={yScale(d.pts)}
                r={hoveredIdx === i ? 5 : 3}
                fill="var(--color-green-primary)"
                stroke="white"
                strokeWidth="1.5"
              />

              {/* xPTS dot */}
              <circle
                cx={xScale(i)}
                cy={yScale(d.xpts)}
                r={hoveredIdx === i ? 4 : 2}
                fill="white"
                stroke="var(--color-green-primary)"
                strokeWidth="1.5"
                opacity="0.6"
              />

              {/* Round label */}
              {(i === 0 || i === data.length - 1 || (i + 1) % 3 === 0 || hoveredIdx === i) && (
                <text x={xScale(i)} y={H - 8} textAnchor="middle" fontSize="8" fill="#9ca3af" fontFamily="var(--font-data)">R{d.round}</text>
              )}

              {/* Hover vertical line */}
              {hoveredIdx === i && (
                <>
                  <line x1={xScale(i)} y1={PAD_TOP} x2={xScale(i)} y2={PAD_TOP + chartH} stroke="#d1d5db" strokeWidth="0.5" strokeDasharray="3 2" />
                </>
              )}
            </g>
          ))}
        </svg>

        {/* Tooltip */}
        {hoveredIdx !== null && (
          <div
            className="absolute pointer-events-none bg-gray-900 text-white px-2.5 py-1.5 rounded-lg shadow-lg text-xs"
            style={{
              left: `${(xScale(hoveredIdx) / W) * 100}%`,
              top: '0px',
              transform: hoveredIdx > data.length / 2 ? 'translateX(-100%)' : 'translateX(0)',
            }}
          >
            <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">Rodada {data[hoveredIdx].round}</p>
            <p className="font-[family-name:var(--font-heading)]">
              PTS: <span className="text-green-400">{data[hoveredIdx].pts}</span>
              {' · '}
              xPTS: <span className="text-green-300">{data[hoveredIdx].xpts.toFixed(1)}</span>
            </p>
            <p className="font-[family-name:var(--font-data)] text-[10px]">
              {data[hoveredIdx].pts > data[hoveredIdx].xpts
                ? `+${(data[hoveredIdx].pts - data[hoveredIdx].xpts).toFixed(1)} acima`
                : data[hoveredIdx].pts < data[hoveredIdx].xpts
                  ? `${(data[hoveredIdx].pts - data[hoveredIdx].xpts).toFixed(1)} abaixo`
                  : 'Alinhado'}
            </p>
          </div>
        )}
      </div>

      <div className="flex gap-4 mt-3">
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 bg-[var(--color-green-primary)] rounded" />
          <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">PTS reais</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-6 h-0.5 bg-[var(--color-green-primary)]/40 rounded" style={{ borderBottom: '1.5px dashed var(--color-green-primary)' }} />
          <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">xPTS</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-3 bg-[var(--color-green-primary)]/10 rounded" />
          <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">Diferença</span>
        </div>
      </div>
    </div>
  )
}
