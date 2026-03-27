import { fetchAllGames, fetchPlayerStats } from "@/lib/data"
import { calcStandings, calcTeamGameStats } from "@/lib/calculations"
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

  // 6-13. Advanced game stats rankings
  const teamGameStatsAll = standings
    .filter(s => s.played >= 3)
    .map(s => ({ team: s.team, stats: calcTeamGameStats(games, s.team) }))
    .filter(t => t.stats.gamesWithStats > 0)

  const hasGameStats = teamGameStatsAll.length > 0

  const possession = hasGameStats
    ? teamGameStatsAll.map(t => ({ team: t.team, value: t.stats.possession, gamesWithStats: t.stats.gamesWithStats }))
        .sort((a, b) => b.value - a.value).slice(0, 5)
    : []

  const shots = hasGameStats
    ? teamGameStatsAll.map(t => ({ team: t.team, value: t.stats.shots, shotsOnTarget: t.stats.shotsOnTarget, gamesWithStats: t.stats.gamesWithStats }))
        .sort((a, b) => b.value - a.value).slice(0, 5)
    : []

  const shotsOnTarget = hasGameStats
    ? teamGameStatsAll.map(t => ({ team: t.team, value: t.stats.shotsOnTarget, shots: t.stats.shots, gamesWithStats: t.stats.gamesWithStats }))
        .sort((a, b) => b.value - a.value).slice(0, 5)
    : []

  const corners = hasGameStats
    ? teamGameStatsAll.map(t => ({ team: t.team, value: t.stats.corners, gamesWithStats: t.stats.gamesWithStats }))
        .sort((a, b) => b.value - a.value).slice(0, 5)
    : []

  const passes = hasGameStats
    ? teamGameStatsAll.map(t => ({ team: t.team, value: t.stats.passes, passAccuracy: t.stats.passAccuracy, gamesWithStats: t.stats.gamesWithStats }))
        .sort((a, b) => b.value - a.value).slice(0, 5)
    : []

  const passAccuracy = hasGameStats
    ? teamGameStatsAll.map(t => ({ team: t.team, value: t.stats.passAccuracy, passes: t.stats.passes, gamesWithStats: t.stats.gamesWithStats }))
        .sort((a, b) => b.value - a.value).slice(0, 5)
    : []

  const shotConversion = hasGameStats
    ? teamGameStatsAll.map(t => ({ team: t.team, value: t.stats.shotConversion, goalsPerGame: t.stats.goalsPerGame, shots: t.stats.shots, gamesWithStats: t.stats.gamesWithStats }))
        .sort((a, b) => b.value - a.value).slice(0, 5)
    : []

  const fouls = hasGameStats
    ? teamGameStatsAll.map(t => ({ team: t.team, value: t.stats.fouls, gamesWithStats: t.stats.gamesWithStats }))
        .sort((a, b) => a.value - b.value).slice(0, 5)
    : []

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
    ...(hasGameStats ? [
      generateInsight('ranking-posse', `Analise os times com maior posse de bola no Brasileirão 2026:\n${possession.map((p, i) => `${i+1}. ${p.team} — ${p.value}% de posse`).join('\n')}\n\nComente sobre estilo de jogo e domínio.`),
      generateInsight('ranking-finalizacoes', `Analise os times que mais finalizam no Brasileirão 2026:\n${shots.map((s, i) => `${i+1}. ${s.team} — ${s.value} finalizações/jogo (${s.shotsOnTarget} no gol)`).join('\n')}\n\nComente sobre volume ofensivo.`),
      generateInsight('ranking-chutes-gol', `Analise os times mais precisos nas finalizações do Brasileirão 2026:\n${shotsOnTarget.map((s, i) => `${i+1}. ${s.team} — ${s.value} chutes no gol/jogo (${s.shots} total)`).join('\n')}\n\nComente sobre a qualidade das finalizações.`),
      generateInsight('ranking-escanteios', `Analise os times que mais conseguem escanteios no Brasileirão 2026:\n${corners.map((c, i) => `${i+1}. ${c.team} — ${c.value} escanteios/jogo`).join('\n')}\n\nComente sobre pressão ofensiva.`),
      generateInsight('ranking-passes', `Analise os times que mais trocam passes no Brasileirão 2026:\n${passes.map((p, i) => `${i+1}. ${p.team} — ${Math.round(p.value)} passes/jogo (${p.passAccuracy}% precisão)`).join('\n')}\n\nComente sobre construção de jogo.`),
      generateInsight('ranking-precisao-passes', `Analise os times com melhor precisão de passes no Brasileirão 2026:\n${passAccuracy.map((p, i) => `${i+1}. ${p.team} — ${p.value}% de precisão (${Math.round(p.passes)} passes/jogo)`).join('\n')}\n\nComente sobre qualidade técnica.`),
      generateInsight('ranking-conversao', `Analise os times com melhor conversão de chutes em gol no Brasileirão 2026:\n${shotConversion.map((s, i) => `${i+1}. ${s.team} — ${s.value}% de conversão (${s.goalsPerGame.toFixed(1)} gols/jogo, ${s.shots} chutes/jogo)`).join('\n')}\n\nComente sobre eficiência.`),
      generateInsight('ranking-faltas', `Analise os times mais disciplinados do Brasileirão 2026 (menos faltas):\n${fouls.map((f, i) => `${i+1}. ${f.team} — ${f.value} faltas/jogo`).join('\n')}\n\nComente sobre disciplina e fair play.`),
    ] : []),
  ]

  const insightResults = await Promise.all(insightPromises)
  const [consistentInsight, attackInsight, defenseInsight, wastefulInsight, gkInsight] = insightResults
  const [possessionInsight, shotsInsight, shotsOnTargetInsight, cornersInsight, passesInsight, passAccuracyInsight, shotConversionInsight, foulsInsight] = hasGameStats ? insightResults.slice(5) : []

  return (
    <div className="max-w-7xl mx-auto px-4 pt-6">
      <Breadcrumb items={[{ label: "Rankings" }]} />
      <RankingsClient
        consistent={consistent.map(c => ({ team: c.team, value: c.value, label: `${c.points}pts reais, ${c.xPTS.toFixed(1)} xPTS` }))}
        attack={attack.map(a => ({ team: a.team, value: a.value, label: `${a.goalsFor} gols em ${a.played} jogos` }))}
        defense={defense.map(d => ({ team: d.team, value: d.value, label: `${d.goalsAgainst} gols sofridos em ${d.played} jogos` }))}
        wasteful={wasteful.map(w => ({ team: w.team, value: w.value, label: `xG: ${w.xG.toFixed(1)}, gols: ${w.goalsFor}` }))}
        goalkeepers={goalkeepers.map(g => ({ team: `${g.name} (${g.team})`, value: g.savesPerGame, label: `${g.saves} defesas em ${g.games} jogos` }))}
        possession={possession.map(p => ({ team: p.team, value: p.value, label: `${p.gamesWithStats} jogos analisados` }))}
        shots={shots.map(s => ({ team: s.team, value: s.value, label: `${s.shotsOnTarget} no gol/jogo em ${s.gamesWithStats} jogos` }))}
        shotsOnTarget={shotsOnTarget.map(s => ({ team: s.team, value: s.value, label: `${s.shots} finalizações totais/jogo` }))}
        corners={corners.map(c => ({ team: c.team, value: c.value, label: `${c.gamesWithStats} jogos analisados` }))}
        passes={passes.map(p => ({ team: p.team, value: p.value, label: `${p.passAccuracy}% de precisão` }))}
        passAccuracy={passAccuracy.map(p => ({ team: p.team, value: p.value, label: `${Math.round(p.passes)} passes/jogo` }))}
        shotConversion={shotConversion.map(s => ({ team: s.team, value: s.value, label: `${s.goalsPerGame.toFixed(1)} gols/jogo, ${s.shots} chutes/jogo` }))}
        fouls={fouls.map(f => ({ team: f.team, value: f.value, label: `${f.gamesWithStats} jogos analisados` }))}
        insights={{
          consistent: consistentInsight,
          attack: attackInsight,
          defense: defenseInsight,
          wasteful: wastefulInsight,
          goalkeepers: gkInsight,
          possession: possessionInsight || '',
          shots: shotsInsight || '',
          shotsOnTarget: shotsOnTargetInsight || '',
          corners: cornersInsight || '',
          passes: passesInsight || '',
          passAccuracy: passAccuracyInsight || '',
          shotConversion: shotConversionInsight || '',
          fouls: foulsInsight || '',
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
