import { fetchAllGames, fetchPlayerStatsByTeam } from "@/lib/data"
import { calcStandings, parseRoundNumber } from "@/lib/calculations"
import { TEAMS, getTeamBySlug } from "@/lib/teams"
import { generateInsight } from "@/lib/ai"
import { InsightBox } from "@/components/InsightBox"
import { Breadcrumb } from "@/components/Breadcrumb"
import { SeeAlso } from "@/components/SeeAlso"
import { notFound } from "next/navigation"
import type { Metadata } from "next"

export const revalidate = 300

export function generateStaticParams() {
  return TEAMS.map((team) => ({ slug: team.slug }))
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
    ? `${teamInfo.name} no Brasileirão 2026: ${position}º lugar, ${standing.points} pontos, ${standing.wins}V ${standing.draws}E ${standing.losses}D. xG: ${standing.xG.toFixed(1)}, xPTS: ${standing.xPTS.toFixed(1)}. Análise completa.`
    : `${teamInfo.fullName} — Estatísticas e análise no Brasileirão 2026 | Futedata`

  const ogTitle = `${teamInfo.name.toUpperCase()} 2026`
  const ogSubtitle = standing
    ? `${position}º lugar · ${standing.points}pts · xG ${standing.xG.toFixed(1)}`
    : 'Estatísticas e Análise'

  return {
    title: `${teamInfo.name} 2026 — Estatísticas, Análise e Desempenho | Futedata`,
    description: desc,
    openGraph: {
      title: `${teamInfo.name} 2026 — Estatísticas e Desempenho | Futedata`,
      description: desc,
      images: [{ url: `/api/og?title=${encodeURIComponent(ogTitle)}&subtitle=${encodeURIComponent(ogSubtitle)}`, width: 1200, height: 630 }],
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
  const upcomingGames = teamGames.filter(g => g.status === 'NS').slice(0, 5)
  const lastGames = finishedGames.slice(-5).reverse()

  // Points by round
  const pointsByRound: { round: number; points: number; cumulative: number }[] = []
  let cumulative = 0
  for (const game of finishedGames) {
    const round = parseRoundNumber(game.round)
    const isHome = game.home_team === teamInfo.name
    const teamGoals = isHome ? (game.home_goals ?? 0) : (game.away_goals ?? 0)
    const oppGoals = isHome ? (game.away_goals ?? 0) : (game.home_goals ?? 0)
    const pts = teamGoals > oppGoals ? 3 : teamGoals === oppGoals ? 1 : 0
    cumulative += pts
    pointsByRound.push({ round, points: pts, cumulative })
  }

  // Aggregate player stats
  const playerMap = new Map<number, { name: string; pos: string; goals: number; assists: number; games: number; ratings: number[]; minutes: number; saves: number }>()
  for (const s of playerStats) {
    if (!playerMap.has(s.player_id)) {
      playerMap.set(s.player_id, { name: s.player_name, pos: s.position, goals: 0, assists: 0, games: 0, ratings: [], minutes: 0, saves: 0 })
    }
    const p = playerMap.get(s.player_id)!
    p.goals += s.goals
    p.assists += s.assists
    p.games++
    p.minutes += s.minutes_played
    p.saves += s.saves
    if (s.rating) p.ratings.push(s.rating)
  }

  const topByRating = Array.from(playerMap.values())
    .filter(p => p.ratings.length >= 2)
    .map(p => ({ ...p, avgRating: p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length }))
    .sort((a, b) => b.avgRating - a.avgRating)
    .slice(0, 5)

  const topScorers = Array.from(playerMap.values())
    .filter(p => p.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.assists - a.assists)
    .slice(0, 5)

  // Generate AI insight for this team
  const insightData = standing
    ? `Analise o momento do ${teamInfo.name} no Brasileirão 2026:
- Posição: ${position}º lugar com ${standing.points} pontos
- Desempenho: ${standing.wins}V ${standing.draws}E ${standing.losses}D, SG: ${standing.goalDifference > 0 ? '+' : ''}${standing.goalDifference}
- xG: ${standing.xG.toFixed(1)}, xGA: ${standing.xGA.toFixed(1)}, xPTS: ${standing.xPTS.toFixed(1)}
- ±PTS: ${standing.deltaPTS > 0 ? '+' : ''}${standing.deltaPTS.toFixed(1)} (${standing.deltaPTS > 2 ? 'performando acima do esperado' : standing.deltaPTS < -2 ? 'performando abaixo do esperado' : 'dentro do esperado'})
- Forma: ${standing.form.join('')}
- Artilheiro: ${topScorers[0]?.name || 'N/A'} (${topScorers[0]?.goals || 0} gols)

Dê sua opinião sobre o momento do time. Tom direto, opinativo.`
    : `Analise o ${teamInfo.name} no Brasileirão 2026. Dados limitados disponíveis.`

  const teamInsight = await generateInsight(`time-${slug}`, insightData)

  // SEO text
  const seoInsightData = standing
    ? `Escreva um texto de 300+ palavras sobre o ${teamInfo.fullName} no Brasileirão 2026.
Dados: ${position}º, ${standing.points}pts, ${standing.wins}V ${standing.draws}E ${standing.losses}D, xG ${standing.xG.toFixed(1)}, xGA ${standing.xGA.toFixed(1)}, xPTS ${standing.xPTS.toFixed(1)}, ±PTS ${standing.deltaPTS > 0 ? '+' : ''}${standing.deltaPTS.toFixed(1)}.
Cidade: ${teamInfo.city}/${teamInfo.state}. Forma: ${standing.form.join('')}.
Artilheiro: ${topScorers[0]?.name || 'N/A'} com ${topScorers[0]?.goals || 0} gols.
Melhor nota: ${topByRating[0]?.name || 'N/A'} (${topByRating[0]?.avgRating?.toFixed(1) || 'N/A'}).

Escreva como texto editorial de portal esportivo. Use dados concretos. Sem títulos ou subtítulos — texto corrido em parágrafos.`
    : ''

  const seoText = seoInsightData ? await generateInsight(`time-seo-${slug}`, seoInsightData) : ''

  const maxCumulative = pointsByRound.length > 0 ? Math.max(...pointsByRound.map(p => p.cumulative)) : 1

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: teamInfo.fullName,
    alternateName: teamInfo.name,
    sport: "Football",
    memberOf: {
      "@type": "SportsOrganization",
      name: "Brasileirão Série A 2026",
    },
    location: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: teamInfo.city,
        addressRegion: teamInfo.state,
        addressCountry: "BR",
      },
    },
  }

  // Neighbors for SeeAlso
  const teamIndex = standings.findIndex(s => s.team === teamInfo.name)
  const seeAlsoTeams = standings
    .filter((_, i) => i !== teamIndex)
    .slice(0, 3)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <Breadcrumb items={[
        { label: "Times", href: "/times" },
        { label: teamInfo.name },
      ]} />

      {/* Hero */}
      <div className="bg-[var(--color-green-dark)] rounded-xl p-6 md:p-8 shadow-lg mb-8">
        <p className="font-[family-name:var(--font-data)] text-[10px] text-green-300 uppercase tracking-widest mb-1">
          Brasileirão Série A 2026
        </p>
        <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-6xl text-white">
          {teamInfo.name.toUpperCase()}
        </h1>
        <p className="text-green-200 text-sm mt-1">
          {teamInfo.fullName} — {teamInfo.city}/{teamInfo.state}
        </p>
        {standing && position && (
          <div className="flex flex-wrap gap-3 mt-4">
            <span className="font-[family-name:var(--font-heading)] text-2xl text-[var(--color-yellow-accent)]">
              {position}º lugar
            </span>
            <span className="font-[family-name:var(--font-heading)] text-2xl text-white">
              {standing.points} pontos
            </span>
            <div className="flex gap-0.5 items-center">
              {standing.form.map((result, i) => (
                <span
                  key={i}
                  className={`form-${result} w-6 h-6 flex items-center justify-center rounded text-xs font-[family-name:var(--font-data)] font-bold`}
                >
                  {result}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Insight */}
      {teamInsight && (
        <div className="mb-8">
          <InsightBox insight={teamInsight} label={`Momento do ${teamInfo.name}`} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Stats grid */}
          {standing && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">
                ESTATÍSTICAS GERAIS
              </h2>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {[
                  { label: "Jogos", value: standing.played },
                  { label: "Vitórias", value: standing.wins, color: "text-green-600" },
                  { label: "Empates", value: standing.draws },
                  { label: "Derrotas", value: standing.losses, color: "text-red-500" },
                  { label: "Gols Pró", value: standing.goalsFor },
                  { label: "Gols Contra", value: standing.goalsAgainst },
                  { label: "Saldo", value: `${standing.goalDifference > 0 ? '+' : ''}${standing.goalDifference}` },
                  { label: "xG", value: standing.xG.toFixed(1), highlight: true },
                  { label: "xGA", value: standing.xGA.toFixed(1), highlight: true },
                  { label: "xPTS", value: standing.xPTS.toFixed(1), highlight: true },
                  { label: "±PTS", value: `${standing.deltaPTS > 0 ? '+' : ''}${standing.deltaPTS.toFixed(1)}`, color: standing.deltaPTS > 0 ? "text-orange-500" : standing.deltaPTS < 0 ? "text-green-600" : undefined, highlight: true },
                  { label: "Aproveit.", value: `${standing.played > 0 ? Math.round((standing.points / (standing.played * 3)) * 100) : 0}%` },
                ].map((stat) => (
                  <div key={stat.label} className={`text-center p-2 rounded-lg ${stat.highlight ? 'bg-[var(--color-green-light)]/50' : 'bg-gray-50'}`}>
                    <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase">
                      {stat.label}
                    </p>
                    <p className={`font-[family-name:var(--font-heading)] text-xl ${stat.color || 'text-gray-900'}`}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Points progression chart */}
          {pointsByRound.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">
                PONTOS ACUMULADOS
              </h2>
              <div className="flex items-end gap-1 h-32">
                {pointsByRound.map((p) => (
                  <div key={p.round} className="flex-1 flex flex-col items-center gap-1">
                    <span className="font-[family-name:var(--font-data)] text-[8px] text-gray-400">
                      {p.cumulative}
                    </span>
                    <div
                      className={`w-full rounded-t ${p.points === 3 ? 'bg-[var(--color-green-primary)]' : p.points === 1 ? 'bg-gray-300' : 'bg-red-300'}`}
                      style={{ height: `${(p.cumulative / maxCumulative) * 100}%`, minHeight: '4px' }}
                    />
                    <span className="font-[family-name:var(--font-data)] text-[8px] text-gray-400">
                      R{p.round}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-3 justify-center">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-[var(--color-green-primary)]" />
                  <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">Vitória</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-gray-300" />
                  <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">Empate</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-red-300" />
                  <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">Derrota</span>
                </div>
              </div>
            </div>
          )}

          {/* Last games */}
          {lastGames.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">
                ÚLTIMOS JOGOS
              </h2>
              <div className="space-y-2">
                {lastGames.map((game) => {
                  const isHome = game.home_team === teamInfo.name
                  const teamGoals = isHome ? game.home_goals : game.away_goals
                  const oppGoals = isHome ? game.away_goals : game.home_goals
                  const opponent = isHome ? game.away_team : game.home_team
                  const result = (teamGoals ?? 0) > (oppGoals ?? 0) ? 'V' : (teamGoals ?? 0) < (oppGoals ?? 0) ? 'D' : 'E'
                  const resultColor = result === 'V' ? 'bg-green-500' : result === 'D' ? 'bg-red-500' : 'bg-gray-400'

                  return (
                    <div key={game.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                      <span className={`${resultColor} w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold font-[family-name:var(--font-data)]`}>
                        {result}
                      </span>
                      <span className="font-[family-name:var(--font-data)] text-xs text-gray-400 w-6">
                        R{parseRoundNumber(game.round)}
                      </span>
                      <span className={`text-sm ${isHome ? 'font-medium' : 'text-gray-500'}`}>
                        {teamInfo.name}
                      </span>
                      <span className="font-[family-name:var(--font-heading)] text-lg text-gray-900">
                        {teamGoals} × {oppGoals}
                      </span>
                      <span className={`text-sm ${!isHome ? 'font-medium' : 'text-gray-500'}`}>
                        {opponent}
                      </span>
                      <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-300 ml-auto">
                        {isHome ? 'Casa' : 'Fora'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* SEO text */}
          {seoText && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
              <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">
                {teamInfo.name.toUpperCase()} NO BRASILEIRÃO 2026
              </h2>
              <div className="prose prose-sm text-gray-700 leading-relaxed">
                {seoText.split('\n').filter(Boolean).map((paragraph, i) => (
                  <p key={i} className="mb-3 text-sm">{paragraph}</p>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Upcoming games */}
          {upcomingGames.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-3">
                PRÓXIMOS JOGOS
              </h3>
              <div className="space-y-3">
                {upcomingGames.map((game) => {
                  const isHome = game.home_team === teamInfo.name
                  const opponent = isHome ? game.away_team : game.home_team
                  const date = new Date(game.date)

                  return (
                    <div key={game.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                      <span className={`font-[family-name:var(--font-data)] text-[10px] px-2 py-0.5 rounded ${isHome ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                        {isHome ? 'Casa' : 'Fora'}
                      </span>
                      <span className="text-sm font-medium flex-1">{opponent}</span>
                      <div className="text-right">
                        <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                          R{parseRoundNumber(game.round)}
                        </p>
                        <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">
                          {date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Top players by rating */}
          {topByRating.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-3">
                DESTAQUES DO ELENCO
              </h3>
              <div className="space-y-2">
                {topByRating.map((player, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                    <span className="font-[family-name:var(--font-data)] text-xs text-gray-400 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{player.name}</p>
                      <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                        {player.pos} · {player.games} jogos
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-[family-name:var(--font-heading)] text-lg text-[var(--color-green-primary)]">
                        {player.avgRating.toFixed(1)}
                      </p>
                      {player.goals > 0 && (
                        <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">
                          {player.goals}G {player.assists}A
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top scorers */}
          {topScorers.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-3">
                ARTILHEIROS
              </h3>
              <div className="space-y-2">
                {topScorers.map((player, i) => (
                  <div key={i} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                    <span className="font-[family-name:var(--font-data)] text-xs text-gray-400 w-4">{i + 1}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{player.name}</p>
                      <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                        {player.pos} · {player.games} jogos
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-[family-name:var(--font-heading)] text-lg text-gray-900">{player.goals}</span>
                      <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">gols</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <SeeAlso items={[
        { href: "/rankings", title: "Rankings do Brasileirão", description: "Os rankings mais polêmicos do campeonato" },
        ...seeAlsoTeams.map(t => ({
          href: `/times/${TEAMS.find(ti => ti.name === t.team)?.slug || t.team.toLowerCase().replace(/\s+/g, '-')}`,
          title: t.team,
          description: `${t.points}pts — ${t.wins}V ${t.draws}E ${t.losses}D`,
        })),
      ]} />
    </div>
  )
}
