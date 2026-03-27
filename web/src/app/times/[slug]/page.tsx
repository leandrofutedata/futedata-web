import { fetchAllGames, fetchPlayerStatsByTeam } from "@/lib/data"
import { calcStandings, parseRoundNumber, estimarXG, estimarXGA, calcXPTS } from "@/lib/calculations"
import { TEAMS, getTeamBySlug } from "@/lib/teams"
import { generateInsight } from "@/lib/ai"
import { Breadcrumb } from "@/components/Breadcrumb"
import { SeeAlso } from "@/components/SeeAlso"
import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"

export const revalidate = 300

export function generateStaticParams() {
  return TEAMS.map((team) => ({ slug: team.slug }))
}

function playerSlug(name: string, id: number): string {
  return `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${id}`
}

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const teamInfo = getTeamBySlug(slug)
  if (!teamInfo) return { title: "Time não encontrado — Futedata" }

  const games = await fetchAllGames()
  const standings = calcStandings(games)
  const standing = standings.find(s => s.team === teamInfo.name)
  const position = standing ? standings.indexOf(standing) + 1 : null

  const desc = standing
    ? `${teamInfo.name} no Brasileirão 2026: ${position}º lugar, ${standing.points} pontos. xG: ${standing.xG.toFixed(1)}, xPTS: ${standing.xPTS.toFixed(1)}. Análise completa com IA.`
    : `${teamInfo.fullName} — Perfil completo no Brasileirão 2026 | Futedata`

  return {
    title: `${teamInfo.name} 2026 — Perfil Completo | Futedata`,
    description: desc,
    openGraph: {
      title: `${teamInfo.name} 2026 — Perfil Completo | Futedata`,
      description: desc,
      images: [{ url: `/api/og?title=${encodeURIComponent(teamInfo.name.toUpperCase())}&subtitle=${encodeURIComponent(standing ? `${position}º · ${standing.points}pts · xPTS ${standing.xPTS.toFixed(1)}` : 'Brasileirão 2026')}`, width: 1200, height: 630 }],
    },
  }
}

export default async function TeamPage({ params }: PageProps) {
  const { slug } = await params
  const teamInfo = getTeamBySlug(slug)
  if (!teamInfo) notFound()

  const [games, playerStats] = await Promise.all([
    fetchAllGames(),
    fetchPlayerStatsByTeam(teamInfo.name),
  ])

  const standings = calcStandings(games)
  const standing = standings.find(s => s.team === teamInfo.name)
  const position = standing ? standings.indexOf(standing) + 1 : null

  // Team games
  const teamGames = games
    .filter(g => g.home_team === teamInfo.name || g.away_team === teamInfo.name)
    .sort((a, b) => a.date.localeCompare(b.date))

  const finishedGames = teamGames.filter(g => g.status === 'FT')
  const upcomingGames = teamGames.filter(g => g.status === 'NS').slice(0, 3)
  const lastGames = finishedGames.slice(-5).reverse()

  // Evolution: PTS vs xPTS per round
  const evolution: { round: number; pts: number; xpts: number; gf: number; xg: number }[] = []
  let cumPTS = 0, cumGF = 0, cumGC = 0, played = 0
  for (const game of finishedGames) {
    const round = parseRoundNumber(game.round)
    const isHome = game.home_team === teamInfo.name
    const gf = isHome ? (game.home_goals ?? 0) : (game.away_goals ?? 0)
    const gc = isHome ? (game.away_goals ?? 0) : (game.home_goals ?? 0)
    const gameXG = isHome ? (game.home_xg ?? gf) : (game.away_xg ?? gf)

    played++
    cumGF += gf
    cumGC += gc
    cumPTS += gf > gc ? 3 : gf === gc ? 1 : 0

    const xG = estimarXG(cumGF, played)
    const xGA = estimarXGA(cumGC, played)
    const xPTS = calcXPTS(xG, xGA, played)

    evolution.push({ round, pts: cumPTS, xpts: Math.round(xPTS * 10) / 10, gf, xg: Math.round(gameXG * 10) / 10 })
  }

  // League averages for comparison
  const avgGF = standings.length > 0 ? standings.reduce((s, t) => s + t.goalsFor, 0) / standings.reduce((s, t) => s + t.played, 0) : 1.15
  const avgGA = standings.length > 0 ? standings.reduce((s, t) => s + t.goalsAgainst, 0) / standings.reduce((s, t) => s + t.played, 0) : 1.15
  const avgXG = standings.length > 0 ? standings.reduce((s, t) => s + t.xG, 0) / standings.reduce((s, t) => s + t.played, 0) : 1.15
  const avgXGA = standings.length > 0 ? standings.reduce((s, t) => s + t.xGA, 0) / standings.reduce((s, t) => s + t.played, 0) : 1.15

  // Aggregate player stats
  const playerMap = new Map<number, { id: number; name: string; pos: string; goals: number; assists: number; games: number; ratings: number[]; minutes: number; saves: number; tackles: number; interceptions: number; passes: number; passesAcc: number; duelsWon: number }>()
  for (const s of playerStats) {
    if (!playerMap.has(s.player_id)) {
      playerMap.set(s.player_id, { id: s.player_id, name: s.player_name, pos: s.position, goals: 0, assists: 0, games: 0, ratings: [], minutes: 0, saves: 0, tackles: 0, interceptions: 0, passes: 0, passesAcc: 0, duelsWon: 0 })
    }
    const p = playerMap.get(s.player_id)!
    p.goals += s.goals
    p.assists += s.assists
    p.games++
    p.minutes += s.minutes_played
    p.saves += s.saves
    p.tackles += s.tackles
    p.interceptions += s.interceptions
    p.passes += s.passes_total
    p.passesAcc += s.passes_accurate
    p.duelsWon += s.duels_won
    if (s.rating) p.ratings.push(s.rating)
  }

  const topPlayers = Array.from(playerMap.values())
    .filter(p => p.ratings.length >= 2)
    .map(p => ({ ...p, avgRating: p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 5)

  // AI insights
  const xgPerGame = standing && standing.played > 0 ? standing.xG / standing.played : 0
  const xgaPerGame = standing && standing.played > 0 ? standing.xGA / standing.played : 0
  const gfPerGame = standing && standing.played > 0 ? standing.goalsFor / standing.played : 0
  const gcPerGame = standing && standing.played > 0 ? standing.goalsAgainst / standing.played : 0

  const headerInsight = standing ? await generateInsight(
    `team-header-${slug}-r${standing.played}`,
    `Analise o momento do ${teamInfo.name} (${teamInfo.fullName}) no Brasileirão 2026:
- ${position}º lugar com ${standing.points} pontos (${standing.wins}V ${standing.draws}E ${standing.losses}D)
- xG: ${standing.xG.toFixed(1)}, xGA: ${standing.xGA.toFixed(1)}, xPTS: ${standing.xPTS.toFixed(1)}, ±PTS: ${standing.deltaPTS > 0 ? '+' : ''}${standing.deltaPTS.toFixed(1)}
- Gols: ${standing.goalsFor} marcados (${gfPerGame.toFixed(2)}/jogo), ${standing.goalsAgainst} sofridos (${gcPerGame.toFixed(2)}/jogo)
- Forma: ${standing.form.join('')}
- Artilheiro: ${topPlayers[0]?.name || 'N/A'} (${topPlayers[0]?.goals || 0} gols)

Escreva 3-4 frases sobre o momento atual. Tom de colunista opinativo.`,
    { maxTokens: 300 }
  ) : ''

  const tacticalInsight = standing ? await generateInsight(
    `team-tactical-${slug}-r${standing.played}`,
    `Com base nos dados do ${teamInfo.name} no Brasileirão 2026, descreva como este time joga:
- xG/jogo: ${xgPerGame.toFixed(2)} (média liga: ${avgXG.toFixed(2)}), gols/jogo: ${gfPerGame.toFixed(2)} (média: ${avgGF.toFixed(2)})
- xGA/jogo: ${xgaPerGame.toFixed(2)} (média liga: ${avgXGA.toFixed(2)}), gols sofridos/jogo: ${gcPerGame.toFixed(2)} (média: ${avgGA.toFixed(2)})
- ±PTS: ${standing.deltaPTS > 0 ? '+' : ''}${standing.deltaPTS.toFixed(1)} (${standing.deltaPTS > 2 ? 'eficiente/sortudo' : standing.deltaPTS < -2 ? 'ineficiente/azarado' : 'justo'})
- SG: ${standing.goalDifference > 0 ? '+' : ''}${standing.goalDifference}
- Resultado: ${standing.wins}V ${standing.draws}E ${standing.losses}D

Escreva 3 parágrafos: (1) estilo de jogo baseado nos números, (2) pontos fortes e fracos, (3) comparação com a média da liga. Use dados concretos.`,
    {
      maxTokens: 500,
      systemPrompt: `Você é um analista tático do futebol brasileiro. Escreva em 3 parágrafos densos e informativos.
Regras:
- Baseie TUDO nos dados fornecidos
- Cite números concretos em cada parágrafo
- Compare com a média da liga quando relevante
- Português brasileiro natural, tom de análise tática profissional
- Sem bullet points, sem títulos — texto corrido`
    }
  ) : ''

  // Next opponent positions
  const opponentPositions = upcomingGames.map(g => {
    const opp = g.home_team === teamInfo.name ? g.away_team : g.home_team
    const oppIdx = standings.findIndex(s => s.team === opp)
    return { game: g, opponent: opp, isHome: g.home_team === teamInfo.name, position: oppIdx >= 0 ? oppIdx + 1 : null }
  })

  const maxPTS = evolution.length > 0 ? Math.max(...evolution.map(e => Math.max(e.pts, e.xpts))) : 1

  // SeeAlso neighbors
  const seeAlsoTeams = standings.filter(s => s.team !== teamInfo.name).slice(0, 3)

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: teamInfo.fullName,
    alternateName: teamInfo.name,
    sport: "Football",
    memberOf: { "@type": "SportsOrganization", name: "Brasileirão Série A 2026" },
    location: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: teamInfo.city, addressRegion: teamInfo.state, addressCountry: "BR" } },
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb items={[{ label: "Times", href: "/times" }, { label: teamInfo.name }]} />

      {/* BLOCO 1 - HEADER */}
      <div className="bg-[var(--color-green-dark)] rounded-xl p-6 md:p-8 shadow-lg mb-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-24 h-24 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: teamInfo.color }}>
            <span className="font-[family-name:var(--font-heading)] text-3xl text-white tracking-wider">{teamInfo.abbr}</span>
          </div>
          <div className="flex-1">
            <p className="font-[family-name:var(--font-data)] text-[10px] text-green-300 uppercase tracking-widest mb-1">
              {teamInfo.fullName} — {teamInfo.city}/{teamInfo.state}
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-6xl text-white">
              {teamInfo.name.toUpperCase()}
            </h1>
            {standing && position && (
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <span className="font-[family-name:var(--font-heading)] text-2xl text-[var(--color-yellow-accent)]">{position}º lugar</span>
                <span className="font-[family-name:var(--font-heading)] text-2xl text-white">{standing.points} pontos</span>
                <div className="flex gap-0.5">
                  {standing.form.map((r, i) => (
                    <span key={i} className={`form-${r} w-6 h-6 flex items-center justify-center rounded text-xs font-[family-name:var(--font-data)] font-bold`}>{r}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        {headerInsight && (
          <div className="mt-5 border-l-4 border-[var(--color-yellow-accent)] pl-4">
            <p className="text-green-100 text-sm leading-relaxed">{headerInsight}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* BLOCO 2 - ESTATÍSTICAS */}
          {standing && (
            <>
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">ESTATÍSTICAS DA TEMPORADA</h2>
                <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                  {[
                    { label: "Jogos", value: standing.played },
                    { label: "Vitórias", value: standing.wins, color: "text-green-600" },
                    { label: "Empates", value: standing.draws },
                    { label: "Derrotas", value: standing.losses, color: "text-red-500" },
                    { label: "Gols Pró", value: standing.goalsFor },
                    { label: "Gols Contra", value: standing.goalsAgainst },
                    { label: "Saldo", value: `${standing.goalDifference > 0 ? '+' : ''}${standing.goalDifference}` },
                    { label: "xG", value: standing.xG.toFixed(1), hl: true },
                    { label: "xGA", value: standing.xGA.toFixed(1), hl: true },
                    { label: "xPTS", value: standing.xPTS.toFixed(1), hl: true },
                    { label: "±PTS", value: `${standing.deltaPTS > 0 ? '+' : ''}${standing.deltaPTS.toFixed(1)}`, color: standing.deltaPTS > 0 ? "text-orange-500" : standing.deltaPTS < 0 ? "text-green-600" : undefined, hl: true },
                    { label: "Aproveit.", value: `${Math.round((standing.points / (standing.played * 3)) * 100)}%` },
                  ].map((s) => (
                    <div key={s.label} className={`text-center p-2 rounded-lg ${s.hl ? 'bg-[var(--color-green-light)]/50' : 'bg-gray-50'}`}>
                      <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase">{s.label}</p>
                      <p className={`font-[family-name:var(--font-heading)] text-xl ${s.color || 'text-gray-900'}`}>{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Evolution chart: PTS vs xPTS */}
              {evolution.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                  <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">EVOLUÇÃO PTS vs xPTS</h2>
                  <div className="space-y-1.5">
                    {evolution.map((e) => (
                      <div key={e.round} className="flex items-center gap-2">
                        <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 w-7 text-right">R{e.round}</span>
                        <div className="flex-1 relative h-5">
                          <div className="absolute top-0 left-0 h-full bg-[var(--color-green-primary)]/20 rounded" style={{ width: `${(e.xpts / maxPTS) * 100}%` }} />
                          <div className={`absolute top-0 left-0 h-full rounded ${e.pts >= e.xpts ? 'bg-[var(--color-green-primary)]/60' : 'bg-orange-400/60'}`} style={{ width: `${(e.pts / maxPTS) * 100}%` }} />
                          <div className="absolute top-0 left-0 h-full flex items-center px-1.5">
                            <span className="font-[family-name:var(--font-data)] text-[9px] font-bold text-gray-800">{e.pts}</span>
                          </div>
                        </div>
                        <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 w-8">x{e.xpts.toFixed(0)}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-4 mt-3">
                    <div className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-[var(--color-green-primary)]/60" /><span className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">PTS reais</span></div>
                    <div className="flex items-center gap-1"><span className="w-3 h-2 rounded bg-[var(--color-green-primary)]/20" /><span className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">xPTS</span></div>
                  </div>
                </div>
              )}

              {/* Goals vs xG per round */}
              {evolution.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                  <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">GOLS vs xG POR RODADA</h2>
                  <div className="flex items-end gap-1 h-32">
                    {evolution.slice(-12).map((e) => {
                      const max = Math.max(...evolution.slice(-12).map(x => Math.max(x.gf, x.xg, 1)))
                      return (
                        <div key={e.round} className="flex-1 flex flex-col items-center gap-0.5">
                          <span className="font-[family-name:var(--font-data)] text-[8px] text-gray-400">{e.gf}</span>
                          <div className="w-full flex gap-0.5" style={{ height: `${(Math.max(e.gf, e.xg) / max) * 100}%`, minHeight: '8px' }}>
                            <div className="flex-1 bg-[var(--color-green-primary)] rounded-t" style={{ height: `${(e.gf / Math.max(e.gf, e.xg, 0.1)) * 100}%` }} />
                            <div className="flex-1 bg-[var(--color-green-primary)]/30 rounded-t" style={{ height: `${(e.xg / Math.max(e.gf, e.xg, 0.1)) * 100}%` }} />
                          </div>
                          <span className="font-[family-name:var(--font-data)] text-[8px] text-gray-400">R{e.round}</span>
                        </div>
                      )
                    })}
                  </div>
                  <div className="flex gap-4 mt-3 justify-center">
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[var(--color-green-primary)]" /><span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">Gols reais</span></div>
                    <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[var(--color-green-primary)]/30" /><span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">xG</span></div>
                  </div>
                </div>
              )}

              {/* Last games */}
              {lastGames.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                  <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">ÚLTIMOS JOGOS</h2>
                  <div className="space-y-2">
                    {lastGames.map((game) => {
                      const isHome = game.home_team === teamInfo.name
                      const tg = isHome ? game.home_goals : game.away_goals
                      const og = isHome ? game.away_goals : game.home_goals
                      const opp = isHome ? game.away_team : game.home_team
                      const result = (tg ?? 0) > (og ?? 0) ? 'V' : (tg ?? 0) < (og ?? 0) ? 'D' : 'E'
                      return (
                        <div key={game.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                          <span className={`${result === 'V' ? 'bg-green-500' : result === 'D' ? 'bg-red-500' : 'bg-gray-400'} w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold font-[family-name:var(--font-data)]`}>{result}</span>
                          <span className="font-[family-name:var(--font-data)] text-xs text-gray-400 w-6">R{parseRoundNumber(game.round)}</span>
                          <span className="font-[family-name:var(--font-heading)] text-lg text-gray-900">{tg} × {og}</span>
                          <span className="text-sm font-medium flex-1">{opp}</span>
                          <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-300">{isHome ? 'Casa' : 'Fora'}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* BLOCO 3 - ANÁLISE TÁTICA */}
          {tacticalInsight && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900">COMO ESTE TIME JOGA</h2>
                <span className="font-[family-name:var(--font-data)] text-[10px] text-[var(--color-green-primary)] bg-[var(--color-green-light)] px-2 py-0.5 rounded-full font-medium">IA</span>
              </div>
              <div className="prose prose-sm text-gray-700 leading-relaxed">
                {tacticalInsight.split('\n').filter(Boolean).map((p, i) => (
                  <p key={i} className="mb-3 text-sm">{p}</p>
                ))}
              </div>
              {standing && (
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: "xG/jogo", value: xgPerGame.toFixed(2), avg: avgXG.toFixed(2), better: xgPerGame > avgXG },
                    { label: "xGA/jogo", value: xgaPerGame.toFixed(2), avg: avgXGA.toFixed(2), better: xgaPerGame < avgXGA },
                    { label: "Gols/jogo", value: gfPerGame.toFixed(2), avg: avgGF.toFixed(2), better: gfPerGame > avgGF },
                    { label: "GC/jogo", value: gcPerGame.toFixed(2), avg: avgGA.toFixed(2), better: gcPerGame < avgGA },
                  ].map((m) => (
                    <div key={m.label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">{m.label}</p>
                      <p className={`font-[family-name:var(--font-heading)] text-xl ${m.better ? 'text-green-600' : 'text-orange-500'}`}>{m.value}</p>
                      <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">liga: {m.avg}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* BLOCO 4 - JOGADORES */}
          {topPlayers.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-3">JOGADORES EM DESTAQUE</h3>
              <div className="space-y-2">
                {topPlayers.map((p, i) => (
                  <Link
                    key={p.id}
                    href={`/jogadores/${playerSlug(p.name, p.id)}`}
                    className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0 group hover:bg-gray-50 rounded -mx-2 px-2 transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold font-[family-name:var(--font-data)]" style={{ backgroundColor: teamInfo.color }}>
                      {p.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium group-hover:text-[var(--color-green-primary)] transition-colors truncate">{p.name}</p>
                      <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">{p.pos} · {p.games} jogos · {p.goals}G {p.assists}A</p>
                    </div>
                    <div className="text-right">
                      <p className="font-[family-name:var(--font-heading)] text-lg text-[var(--color-green-primary)]">{p.avgRating.toFixed(1)}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* BLOCO 5 - PRÓXIMOS JOGOS */}
          {opponentPositions.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-3">PRÓXIMOS JOGOS</h3>
              <div className="space-y-3">
                {opponentPositions.map(({ game, opponent, isHome, position: oppPos }) => {
                  const diff = oppPos !== null
                    ? oppPos <= 6 ? "DIFÍCIL" : oppPos >= 17 ? "FAVORÁVEL" : "MÉDIO"
                    : "?"
                  const diffColor = diff === "DIFÍCIL" ? "bg-red-100 text-red-700" : diff === "FAVORÁVEL" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  return (
                    <div key={game.id} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium">{opponent}</span>
                        <span className={`font-[family-name:var(--font-data)] text-[10px] font-bold px-2 py-0.5 rounded ${diffColor}`}>{diff}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`font-[family-name:var(--font-data)] text-[10px] px-2 py-0.5 rounded ${isHome ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'}`}>
                          {isHome ? 'Casa' : 'Fora'}
                        </span>
                        {oppPos && <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">{oppPos}º lugar</span>}
                        <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 ml-auto">
                          {new Date(game.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Compare link */}
          <Link href={`/comparar?time1=${slug}`} className="block bg-[var(--color-green-light)] border border-[var(--color-green-primary)]/20 rounded-xl p-4 text-center hover:bg-[var(--color-green-primary)]/10 transition-colors">
            <p className="font-[family-name:var(--font-heading)] text-lg text-[var(--color-green-primary)]">COMPARAR COM OUTRO TIME</p>
            <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 mt-0.5">Veja lado a lado todas as métricas</p>
          </Link>
        </div>
      </div>

      <SeeAlso items={[
        { href: "/comparar", title: "Comparador", description: "Compare times e jogadores lado a lado" },
        ...seeAlsoTeams.map(t => ({
          href: `/times/${TEAMS.find(ti => ti.name === t.team)?.slug || t.team.toLowerCase().replace(/\s+/g, '-')}`,
          title: t.team,
          description: `${t.points}pts — ${t.wins}V ${t.draws}E ${t.losses}D`,
        })),
      ]} />
    </div>
  )
}
