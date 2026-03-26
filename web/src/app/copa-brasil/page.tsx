import { fetchCopaBrasilGames, fetchAllGames } from "@/lib/data"
import { CopaBrasilClient } from "@/components/CopaBrasilClient"
import { generateInsight } from "@/lib/ai"
import { calcStandings } from "@/lib/calculations"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Copa do Brasil 2026 — Futedata",
  description: "Chaveamento, confrontos, probabilidades e analise estatistica da Copa do Brasil 2026.",
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

  return <CopaBrasilClient copaGames={copaGames} brasileiraoGames={brasileiraoGames} copaInsight={copaInsight} />
}
