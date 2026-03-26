import { fetchAllGames, fetchPlayerStats } from "@/lib/data"
import { calcStandings } from "@/lib/calculations"
import { generateInsight } from "@/lib/ai"
import { RankingsClient } from "@/components/RankingsClient"
import { Breadcrumb } from "@/components/Breadcrumb"
import { SeeAlso } from "@/components/SeeAlso"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Rankings do Brasileirão 2026 — Quem é o melhor? | Futedata",
  description: "Os rankings mais polêmicos do Brasileirão 2026: ataque mais perigoso, defesa mais sólida, times mais consistentes e muito mais. Baseado em xG, xGA e dados reais.",
  openGraph: {
    title: "Rankings do Brasileirão 2026 — Quem é o melhor?",
    description: "Ataque mais perigoso, defesa mais sólida, times mais consistentes. Rankings baseados em xG e dados reais.",
    images: [{ url: "/api/og?title=RANKINGS+DO+BRASILEIR%C3%83O&subtitle=Quem+%C3%A9+o+melhor%3F+Dados+reais+de+xG+e+xGA", width: 1200, height: 630 }],
  },
}

export const revalidate = 300

export default async function RankingsPage() {
  const [games, playerStats] = await Promise.all([
    fetchAllGames(),
    fetchPlayerStats(),
  ])

  const standings = calcStandings(games)

  // 1. Most consistent (lowest |deltaPTS|)
  const consistent = standings
    .filter(s => s.played >= 3)
    .map(s => ({ team: s.team, value: Math.abs(s.deltaPTS), points: s.points, xPTS: s.xPTS }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 5)

  // 2. Most dangerous attack (highest xG)
  const attack = standings
    .filter(s => s.played >= 3)
    .map(s => ({ team: s.team, value: s.xG, goalsFor: s.goalsFor, played: s.played }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  // 3. Solidest defense (lowest xGA)
  const defense = standings
    .filter(s => s.played >= 3)
    .map(s => ({ team: s.team, value: s.xGA, goalsAgainst: s.goalsAgainst, played: s.played }))
    .sort((a, b) => a.value - b.value)
    .slice(0, 5)

  // 4. Most wasteful (highest xG - actual goals)
  const wasteful = standings
    .filter(s => s.played >= 3)
    .map(s => ({ team: s.team, value: s.xG - s.goalsFor, xG: s.xG, goalsFor: s.goalsFor }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)

  // 5. Most decisive goalkeepers (saves per game)
  const gkMap = new Map<string, { name: string; team: string; saves: number; games: number }>()
  for (const s of playerStats) {
    if (s.position !== 'G' || s.saves === 0) continue
    const key = s.player_id
    if (!gkMap.has(String(key))) {
      gkMap.set(String(key), { name: s.player_name, team: s.team, saves: 0, games: 0 })
    }
    const gk = gkMap.get(String(key))!
    gk.saves += s.saves
    gk.games++
  }
  const goalkeepers = Array.from(gkMap.values())
    .filter(gk => gk.games >= 3)
    .map(gk => ({ ...gk, savesPerGame: gk.saves / gk.games }))
    .sort((a, b) => b.savesPerGame - a.savesPerGame)
    .slice(0, 5)

  // Generate insights
  const rankingsData = {
    consistent: consistent.map(c => ({ team: c.team, absDeviation: c.value, pts: c.points, xPTS: c.xPTS })),
    attack: attack.map(a => ({ team: a.team, xG: a.value, goals: a.goalsFor })),
    defense: defense.map(d => ({ team: d.team, xGA: d.value, goalsAgainst: d.goalsAgainst })),
    wasteful: wasteful.map(w => ({ team: w.team, waste: w.value, xG: w.xG, goals: w.goalsFor })),
    goalkeepers: goalkeepers.map(g => ({ name: g.name, team: g.team, savesPerGame: g.savesPerGame })),
  }

  const insightPromises = [
    generateInsight('ranking-consistentes', `Analise os times mais consistentes do Brasileirão 2026 (menor desvio entre pontos reais e xPTS):\n${rankingsData.consistent.map((c, i) => `${i+1}. ${c.team} — desvio de ${c.absDeviation.toFixed(1)} pts (real: ${c.pts}, xPTS: ${c.xPTS.toFixed(1)})`).join('\n')}\n\nComente sobre quem merece a posição que tem.`),
    generateInsight('ranking-ataque', `Analise os ataques mais perigosos do Brasileirão 2026 por xG:\n${rankingsData.attack.map((a, i) => `${i+1}. ${a.team} — xG: ${a.xG.toFixed(1)}, gols reais: ${a.goals}`).join('\n')}\n\nDestaque quem é mais letal.`),
    generateInsight('ranking-defesa', `Analise as defesas mais sólidas do Brasileirão 2026 por xGA:\n${rankingsData.defense.map((d, i) => `${i+1}. ${d.team} — xGA: ${d.xGA.toFixed(1)}, gols sofridos: ${d.goalsAgainst}`).join('\n')}\n\nDestaque quem mais surpreende defensivamente.`),
    generateInsight('ranking-desperdicio', `Analise quem mais desperdiça chances no Brasileirão 2026 (diferença entre xG e gols):\n${rankingsData.wasteful.map((w, i) => `${i+1}. ${w.team} — desperdiça ${w.waste.toFixed(1)} gols (xG: ${w.xG.toFixed(1)}, gols: ${w.goals})`).join('\n')}\n\nComente sobre a ineficiência.`),
    generateInsight('ranking-goleiros', `Analise os goleiros mais decisivos do Brasileirão 2026 por defesas/jogo:\n${rankingsData.goalkeepers.map((g, i) => `${i+1}. ${g.name} (${g.team}) — ${g.savesPerGame.toFixed(1)} defesas/jogo`).join('\n')}\n\nDestaque quem segura o time.`),
  ]

  const [consistentInsight, attackInsight, defenseInsight, wastefulInsight, gkInsight] = await Promise.all(insightPromises)

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6">
      <Breadcrumb items={[{ label: "Rankings" }]} />
      <RankingsClient
        consistent={consistent.map(c => ({ team: c.team, value: c.value, label: `${c.points}pts reais, ${c.xPTS.toFixed(1)} xPTS` }))}
        attack={attack.map(a => ({ team: a.team, value: a.value, label: `${a.goalsFor} gols em ${a.played} jogos` }))}
        defense={defense.map(d => ({ team: d.team, value: d.value, label: `${d.goalsAgainst} gols sofridos em ${d.played} jogos` }))}
        wasteful={wasteful.map(w => ({ team: w.team, value: w.value, label: `xG: ${w.xG.toFixed(1)}, gols: ${w.goalsFor}` }))}
        goalkeepers={goalkeepers.map(g => ({ team: `${g.name} (${g.team})`, value: g.savesPerGame, label: `${g.saves} defesas em ${g.games} jogos` }))}
        insights={{
          consistent: consistentInsight,
          attack: attackInsight,
          defense: defenseInsight,
          wasteful: wastefulInsight,
          goalkeepers: gkInsight,
        }}
      />
      <SeeAlso items={[
        { href: "/times", title: "Todos os Times", description: "Veja a análise completa de cada clube do Brasileirão" },
        { href: "/cartola", title: "Cartola FC", description: "Quem escalar na próxima rodada do Cartola" },
        { href: "/copa-brasil", title: "Copa do Brasil", description: "Confrontos e probabilidades da Copa do Brasil 2026" },
      ]} />
    </div>
  )
}
