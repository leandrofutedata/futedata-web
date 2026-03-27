import { fetchCopaBrasilGames, fetchAllGames } from "@/lib/data"
import { CopaBrasilClient } from "@/components/CopaBrasilClient"
import { generateInsight } from "@/lib/ai"
import { calcStandings } from "@/lib/calculations"
import { Breadcrumb } from "@/components/Breadcrumb"
import { SeeAlso } from "@/components/SeeAlso"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Copa do Brasil 2026 — Confrontos e Análise | Futedata",
  description: "Chaveamento, confrontos, probabilidades e análise estatística da Copa do Brasil 2026. Quem avança? Dados reais + modelo preditivo.",
  openGraph: {
    title: "Copa do Brasil 2026 — Confrontos e Análise | Futedata",
    description: "Chaveamento completo com probabilidades e análise de cada confronto.",
    images: [{ url: "/api/og?title=COPA+DO+BRASIL+2026&subtitle=Confrontos%2C+Probabilidades+e+An%C3%A1lise", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Copa do Brasil 2026 — Confrontos e Análise | Futedata",
    description: "Chaveamento, probabilidades e análise de cada confronto da Copa do Brasil 2026.",
  },
}

export const revalidate = 60

export default async function CopaBrasilPage() {
  const [copaGames, brasileiraoGames] = await Promise.all([
    fetchCopaBrasilGames(),
    fetchAllGames(),
  ])

  // Find the most advanced phase with pending games
  const phases = ["Final", "Semifinal", "Quartas de Final", "Oitavas de Final", "3a Fase", "2a Fase", "1a Fase"]
  const activePhase = phases.find(p => copaGames.some(g => g.fase === p && g.status !== 'FT')) || phases.find(p => copaGames.some(g => g.fase === p)) || ''

  const phaseGames = copaGames.filter(g => g.fase === activePhase)
  const standings = calcStandings(brasileiraoGames)

  const confrontos = phaseGames.map(g => {
    const homeStanding = standings.find(s => s.team === g.home_team)
    const awayStanding = standings.find(s => s.team === g.away_team)
    return `${g.home_team}${homeStanding ? ` (${homeStanding.points}pts, xG:${homeStanding.xG.toFixed(1)})` : ''} vs ${g.away_team}${awayStanding ? ` (${awayStanding.points}pts, xG:${awayStanding.xG.toFixed(1)})` : ''}${g.status === 'FT' ? ` — ${g.home_score}x${g.away_score}` : ''}`
  }).slice(0, 6)

  const dataContext = `Analise os confrontos da ${activePhase} da Copa do Brasil 2026:
${confrontos.join('\n')}

Identifique o confronto mais desequilibrado e dê sua opinião sobre quem avança. Tom opinativo.`

  const copaInsight = await generateInsight(`copa-brasil-${activePhase.replace(/\s/g, '-').toLowerCase()}`, dataContext)

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumb items={[{ label: "Copa do Brasil" }]} />
        <p className="text-sm text-gray-600 leading-relaxed mt-2 mb-4">
          Acompanhe o chaveamento completo da Copa do Brasil 2026, com resultados, datas dos jogos e confrontos de cada fase.
        </p>
      </div>

      {copaInsight && (
        <div className="max-w-7xl mx-auto px-4 mt-2 mb-6">
          <div className="bg-[var(--color-green-dark)] rounded-xl p-6 md:p-8 shadow-lg">
            <span className="font-[family-name:var(--font-data)] text-[10px] font-bold tracking-[0.2em] text-[var(--color-yellow-accent)] uppercase block mb-3">
              Copa do Brasil 2026 · {activePhase.toUpperCase()}
            </span>
            <p className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl text-white leading-tight">
              {copaInsight.split(".")[0]}.
            </p>
            {copaInsight.split(".").length > 2 && (
              <p className="text-[var(--color-green-light)] text-sm mt-3 leading-relaxed max-w-3xl">
                {copaInsight.split(".").slice(1).join(".").trim()}
              </p>
            )}
          </div>
        </div>
      )}

      <CopaBrasilClient copaGames={copaGames} brasileiraoGames={brasileiraoGames} copaInsight={copaInsight} />
      <div className="max-w-7xl mx-auto px-4">
        <SeeAlso items={[
          { href: "/projecoes", title: "Projeções", description: "Probabilidades de classificação e projeções de temporada" },
          { href: "/times", title: "Times do Brasileirão", description: "Análise completa de cada clube da Série A" },
          { href: "/rankings", title: "Rankings", description: "Os rankings mais polêmicos do Brasileirão 2026" },
        ]} />
      </div>
    </>
  )
}
