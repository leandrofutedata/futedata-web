"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"

export interface HighlightPlayer {
  id: number
  name: string
  photo: string | null
  position: string
  slug: string | null
  rating: number | null
  value: string
}

export interface HighlightCategory {
  title: string
  players: HighlightPlayer[]
}

interface Props {
  categories: HighlightCategory[]
  teamColor: string
}

const positionBadge: Record<string, { label: string; color: string }> = {
  Attacker: { label: "ATA", color: "bg-red-100 text-red-700" },
  Midfielder: { label: "MEI", color: "bg-blue-100 text-blue-700" },
  Defender: { label: "DEF", color: "bg-amber-100 text-amber-700" },
  Goalkeeper: { label: "GOL", color: "bg-green-100 text-green-700" },
}

export function SquadHighlights({ categories, teamColor }: Props) {
  const [activeTab, setActiveTab] = useState(0)

  const validCategories = categories.filter(c => c.players.length > 0)
  if (validCategories.length === 0) return null

  const current = validCategories[activeTab] || validCategories[0]

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">DESTAQUES DO ELENCO</h2>

      <div className="flex gap-1 mb-4 overflow-x-auto">
        {validCategories.map((cat, i) => (
          <button
            key={cat.title}
            onClick={() => setActiveTab(i)}
            className={`font-[family-name:var(--font-data)] text-[10px] px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              i === activeTab
                ? "text-white"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
            style={i === activeTab ? { backgroundColor: teamColor } : undefined}
          >
            {cat.title}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {current.players.map((p, i) => {
          const badge = positionBadge[p.position] || { label: p.position.slice(0, 3).toUpperCase(), color: "bg-gray-100 text-gray-600" }
          const inner = (
            <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0 group hover:bg-gray-50 rounded -mx-2 px-2 transition-colors">
              <span className="font-[family-name:var(--font-data)] text-xs text-gray-300 w-4">{i + 1}</span>
              {p.photo ? (
                <Image src={p.photo} alt={p.name} width={32} height={32} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold font-[family-name:var(--font-data)]" style={{ backgroundColor: teamColor }}>
                  {p.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium group-hover:text-[var(--color-green-primary)] transition-colors truncate">{p.name}</p>
                <span className={`font-[family-name:var(--font-data)] text-[9px] font-bold px-1.5 py-0.5 rounded ${badge.color}`}>{badge.label}</span>
              </div>
              {p.rating && (
                <span className="font-[family-name:var(--font-heading)] text-sm text-[var(--color-green-primary)]">{p.rating.toFixed(1)}</span>
              )}
              <span className="font-[family-name:var(--font-data)] text-xs text-gray-500 whitespace-nowrap">{p.value}</span>
            </div>
          )

          return p.slug ? (
            <Link key={p.id} href={`/jogadores/${p.slug}`}>{inner}</Link>
          ) : (
            <div key={p.id}>{inner}</div>
          )
        })}
      </div>
    </div>
  )
}
