import { TEAMS } from "@/lib/teams"
import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Times do Brasileirão 2026 — Todos os 20 Clubes | Futedata",
  description: "Todos os 20 times da Série A do Brasileirão 2026. Acesse o perfil completo com estatísticas, análise e desempenho de cada clube.",
  openGraph: {
    title: "Times do Brasileirão 2026 — Todos os 20 Clubes",
    description: "Acesse o perfil completo de cada time com xG, xPTS e análise detalhada.",
    images: [{ url: "/api/og?title=TIMES&subtitle=Brasileir%C3%A3o+S%C3%A9rie+A+2026", width: 1200, height: 630 }],
  },
}

export const revalidate = 300

export default function TimesPage() {
  const sorted = [...TEAMS].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="bg-[var(--color-green-dark)] rounded-xl p-6 md:p-8 shadow-lg mb-8">
        <p className="font-[family-name:var(--font-data)] text-[10px] text-green-300 uppercase tracking-widest mb-1">
          Brasileirão Série A 2026
        </p>
        <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-6xl text-white">
          TIMES
        </h1>
        <p className="text-green-200 text-sm mt-2">
          Selecione um time para ver estatísticas, análise e desempenho completo
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {sorted.map((team) => (
          <Link
            key={team.slug}
            href={`/times/${team.slug}`}
            className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-lg hover:border-[var(--color-green-primary)]/30 transition-all group flex flex-col items-center text-center"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110"
              style={{ backgroundColor: team.color }}
            >
              <span className="font-[family-name:var(--font-heading)] text-2xl text-white tracking-wider">
                {team.abbr}
              </span>
            </div>
            <h2 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 group-hover:text-[var(--color-green-primary)] transition-colors leading-tight">
              {team.name.toUpperCase()}
            </h2>
            <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 mt-0.5">
              {team.city}/{team.state}
            </p>
          </Link>
        ))}
      </div>
    </div>
  )
}
