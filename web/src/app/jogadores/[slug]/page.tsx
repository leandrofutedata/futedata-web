import { fetchPlayerStatsById, fetchCartolaPlayers, fetchAllGames } from "@/lib/data"
import { calcStandings, parseRoundNumber } from "@/lib/calculations"
import { getTeamByName } from "@/lib/teams"
import { generateInsight } from "@/lib/ai"
import { Breadcrumb } from "@/components/Breadcrumb"
import { SeeAlso } from "@/components/SeeAlso"
import { notFound } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import type { PlayerStats, CartolaPlayer } from "@/lib/types"

export const revalidate = 300

function parsePlayerSlug(slug: string): { name: string; id: number } | null {
  const match = slug.match(/^(.+)-(\d+)$/)
  if (!match) return null
  return { name: match[1], id: parseInt(match[2], 10) }
}

function playerSlug(name: string, id: number): string {
  return `${name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}-${id}`
}

type PageProps = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const parsed = parsePlayerSlug(slug)
  if (!parsed) return { title: "Jogador não encontrado — Futedata" }

  const stats = await fetchPlayerStatsById(parsed.id)
  if (stats.length === 0) return { title: "Jogador não encontrado — Futedata" }

  const player = stats[0]
  const totalGoals = stats.reduce((s, g) => s + g.goals, 0)
  const totalAssists = stats.reduce((s, g) => s + g.assists, 0)
  const gamesPlayed = stats.length

  const desc = `${player.player_name} (${player.team}) no Brasileirão 2026: ${gamesPlayed} jogos, ${totalGoals} gols, ${totalAssists} assistências. Perfil completo com radar, evolução e análise.`

  return {
    title: `${player.player_name} — Perfil Completo | Futedata`,
    description: desc,
    openGraph: {
      title: `${player.player_name} — ${player.team} | Futedata`,
      description: desc,
      images: [{ url: `/api/og?title=${encodeURIComponent(player.player_name.toUpperCase())}&subtitle=${encodeURIComponent(`${player.team} · ${player.position} · ${totalGoals}G ${totalAssists}A`)}`, width: 1200, height: 630 }],
    },
  }
}

// Radar chart dimensions by position
type RadarDimension = { label: string; value: number }

function getRadarDimensions(agg: AggregatedStats): RadarDimension[] {
  const per90 = (val: number) => agg.minutes > 0 ? (val / agg.minutes) * 90 : 0
  const passAcc = agg.passes > 0 ? (agg.passesAcc / agg.passes) * 100 : 0

  if (agg.position === 'G') {
    return [
      { label: "Defesas", value: normalize(per90(agg.saves), 0, 5) },
      { label: "Passes", value: normalize(passAcc, 40, 95) },
      { label: "Rating", value: normalize(agg.avgRating, 5.5, 8.5) },
      { label: "Duelos", value: normalize(per90(agg.duelsWon), 0, 4) },
      { label: "Presença", value: normalize(agg.games / Math.max(agg.possibleGames, 1) * 100, 0, 100) },
      { label: "Intercep.", value: normalize(per90(agg.interceptions), 0, 3) },
    ]
  }

  if (agg.position === 'D') {
    return [
      { label: "Desarmes", value: normalize(per90(agg.tackles), 0, 5) },
      { label: "Intercep.", value: normalize(per90(agg.interceptions), 0, 4) },
      { label: "Duelos", value: normalize(per90(agg.duelsWon), 0, 8) },
      { label: "Passes", value: normalize(passAcc, 50, 95) },
      { label: "Rating", value: normalize(agg.avgRating, 5.5, 8.5) },
      { label: "Gols+Ass", value: normalize(per90(agg.goals + agg.assists), 0, 0.5) },
    ]
  }

  if (agg.position === 'M') {
    return [
      { label: "Passes", value: normalize(passAcc, 50, 95) },
      { label: "Desarmes", value: normalize(per90(agg.tackles), 0, 4) },
      { label: "Intercep.", value: normalize(per90(agg.interceptions), 0, 3) },
      { label: "Duelos", value: normalize(per90(agg.duelsWon), 0, 7) },
      { label: "Gols+Ass", value: normalize(per90(agg.goals + agg.assists), 0, 1) },
      { label: "Rating", value: normalize(agg.avgRating, 5.5, 8.5) },
    ]
  }

  // Forward (F)
  return [
    { label: "Gols", value: normalize(per90(agg.goals), 0, 1) },
    { label: "Assistên.", value: normalize(per90(agg.assists), 0, 0.6) },
    { label: "Passes", value: normalize(passAcc, 40, 90) },
    { label: "Duelos", value: normalize(per90(agg.duelsWon), 0, 6) },
    { label: "Rating", value: normalize(agg.avgRating, 5.5, 8.5) },
    { label: "Minutos", value: normalize(agg.minutes / Math.max(agg.games, 1), 0, 90) },
  ]
}

function normalize(value: number, min: number, max: number): number {
  return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100))
}

interface AggregatedStats {
  playerId: number
  name: string
  team: string
  position: string
  goals: number
  assists: number
  games: number
  minutes: number
  avgRating: number
  ratings: number[]
  saves: number
  tackles: number
  interceptions: number
  passes: number
  passesAcc: number
  duelsWon: number
  possibleGames: number
}

function aggregateStats(stats: PlayerStats[], possibleGames: number): AggregatedStats {
  const ratings = stats.filter(s => s.rating).map(s => s.rating!)
  return {
    playerId: stats[0].player_id,
    name: stats[0].player_name,
    team: stats[0].team,
    position: stats[0].position,
    goals: stats.reduce((s, g) => s + g.goals, 0),
    assists: stats.reduce((s, g) => s + g.assists, 0),
    games: stats.length,
    minutes: stats.reduce((s, g) => s + g.minutes_played, 0),
    avgRating: ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 0,
    ratings,
    saves: stats.reduce((s, g) => s + g.saves, 0),
    tackles: stats.reduce((s, g) => s + g.tackles, 0),
    interceptions: stats.reduce((s, g) => s + g.interceptions, 0),
    passes: stats.reduce((s, g) => s + g.passes_total, 0),
    passesAcc: stats.reduce((s, g) => s + g.passes_accurate, 0),
    duelsWon: stats.reduce((s, g) => s + g.duels_won, 0),
    possibleGames,
  }
}

function matchCartola(playerName: string, team: string, cartolaPlayers: CartolaPlayer[]): CartolaPlayer | null {
  const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const normName = normalize(playerName)
  const parts = normName.split(' ')
  const lastName = parts[parts.length - 1]

  return cartolaPlayers.find(cp => {
    const normApelido = normalize(cp.apelido)
    const normNome = normalize(cp.nome)
    return (normApelido === normName || normNome === normName || normApelido === lastName || normNome.includes(normName) || normName.includes(normApelido))
  }) || null
}

// SVG Radar Chart component
function RadarChart({ dimensions }: { dimensions: RadarDimension[] }) {
  const size = 200
  const center = size / 2
  const radius = 80
  const n = dimensions.length
  const angleStep = (2 * Math.PI) / n

  const getPoint = (index: number, value: number) => {
    const angle = (index * angleStep) - Math.PI / 2
    const r = (value / 100) * radius
    return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) }
  }

  const gridLevels = [25, 50, 75, 100]
  const dataPoints = dimensions.map((d, i) => getPoint(i, d.value))
  const pathData = dataPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full max-w-[280px] mx-auto">
      {/* Grid */}
      {gridLevels.map(level => {
        const pts = Array.from({ length: n }, (_, i) => getPoint(i, level))
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
        return <path key={level} d={d} fill="none" stroke="var(--color-green-primary)" strokeWidth={0.5} opacity={0.15} />
      })}
      {/* Axes */}
      {dimensions.map((_, i) => {
        const end = getPoint(i, 100)
        return <line key={i} x1={center} y1={center} x2={end.x} y2={end.y} stroke="var(--color-green-primary)" strokeWidth={0.5} opacity={0.2} />
      })}
      {/* Data area */}
      <path d={pathData} fill="var(--color-green-primary)" fillOpacity={0.2} stroke="var(--color-green-primary)" strokeWidth={1.5} />
      {/* Data points */}
      {dataPoints.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={3} fill="var(--color-green-primary)" />
      ))}
      {/* Labels */}
      {dimensions.map((d, i) => {
        const labelPoint = getPoint(i, 130)
        return (
          <text
            key={i}
            x={labelPoint.x}
            y={labelPoint.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-gray-500"
            fontSize={8}
            fontFamily="var(--font-data)"
          >
            {d.label}
          </text>
        )
      })}
      {/* Value labels */}
      {dimensions.map((d, i) => {
        const valPoint = getPoint(i, d.value + 12)
        return (
          <text
            key={`v-${i}`}
            x={valPoint.x}
            y={valPoint.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="fill-gray-700 font-bold"
            fontSize={7}
            fontFamily="var(--font-data)"
          >
            {Math.round(d.value)}
          </text>
        )
      })}
    </svg>
  )
}

export default async function PlayerPage({ params }: PageProps) {
  const { slug } = await params
  const parsed = parsePlayerSlug(slug)
  if (!parsed) notFound()

  const [stats, cartolaPlayers, games] = await Promise.all([
    fetchPlayerStatsById(parsed.id),
    fetchCartolaPlayers(),
    fetchAllGames(),
  ])

  if (stats.length === 0) notFound()

  const standings = calcStandings(games)
  const teamInfo = getTeamByName(stats[0].team)
  const teamStanding = standings.find(s => s.team === stats[0].team)
  const teamPosition = teamStanding ? standings.indexOf(teamStanding) + 1 : null

  // Possible games = team's finished games
  const teamFinishedGames = games.filter(g => g.status === 'FT' && (g.home_team === stats[0].team || g.away_team === stats[0].team)).length
  const agg = aggregateStats(stats, teamFinishedGames)

  // Per-round data for evolution charts
  const perRound = stats
    .map(s => {
      const game = games.find(g => g.id === s.game_id)
      const round = game ? parseRoundNumber(game.round) : 0
      return { round, rating: s.rating, goals: s.goals, assists: s.assists, minutes: s.minutes_played }
    })
    .filter(s => s.round > 0)
    .sort((a, b) => a.round - b.round)

  // Radar chart
  const radarDimensions = getRadarDimensions(agg)

  // Cartola match
  const cartola = matchCartola(agg.name, agg.team, cartolaPlayers)

  // Position label
  const posLabel: Record<string, string> = { G: 'Goleiro', D: 'Defensor', M: 'Meio-campista', F: 'Atacante' }

  // AI narrative
  const passAcc = agg.passes > 0 ? ((agg.passesAcc / agg.passes) * 100).toFixed(0) : '0'
  const per90Goals = agg.minutes > 0 ? ((agg.goals / agg.minutes) * 90).toFixed(2) : '0'
  const per90Assists = agg.minutes > 0 ? ((agg.assists / agg.minutes) * 90).toFixed(2) : '0'

  const insight = await generateInsight(
    `player-${parsed.id}-r${agg.games}`,
    `Analise o jogador ${agg.name} (${posLabel[agg.position] || agg.position}, ${agg.team}) no Brasileirão 2026:
- ${agg.games} jogos, ${agg.minutes} minutos, rating médio ${agg.avgRating.toFixed(2)}
- ${agg.goals} gols (${per90Goals}/90min), ${agg.assists} assistências (${per90Assists}/90min)
- Passes: ${agg.passesAcc}/${agg.passes} (${passAcc}% precisão)
- Desarmes: ${agg.tackles}, Interceptações: ${agg.interceptions}, Duelos ganhos: ${agg.duelsWon}
${agg.position === 'G' ? `- Defesas: ${agg.saves}` : ''}
${cartola ? `- Cartola FC: C$${cartola.preco.toFixed(1)}, média ${cartola.media_pontos.toFixed(1)}pts` : ''}

Escreva 3-4 frases avaliando o desempenho e o momento deste jogador. Tom de colunista opinativo.`,
    { maxTokens: 300 }
  )

  // SeeAlso: teammates
  const teamSlug = teamInfo?.slug || agg.team.toLowerCase().replace(/\s+/g, '-')

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: agg.name,
    url: `https://www.futedata.com.br/jogadores/${slug}`,
    jobTitle: posLabel[agg.position] || "Jogador de Futebol",
    memberOf: {
      "@type": "SportsTeam",
      name: agg.team,
      ...(teamInfo ? { url: `https://www.futedata.com.br/times/${teamInfo.slug}`, logo: teamInfo.logo } : {}),
    },
    sport: "Football",
    nationality: { "@type": "Country", name: "Brasil" },
  }

  const maxRating = perRound.length > 0 ? Math.max(...perRound.filter(r => r.rating).map(r => r.rating!), 7) : 10
  const minRating = perRound.length > 0 ? Math.min(...perRound.filter(r => r.rating).map(r => r.rating!), 5.5) : 0
  const maxGA = perRound.length > 0 ? Math.max(...perRound.map(r => r.goals + r.assists), 1) : 1

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb items={[
        { label: "Times", href: "/times" },
        { label: agg.team, href: `/times/${teamSlug}` },
        { label: agg.name },
      ]} />

      {/* BLOCO 1 - HEADER */}
      <div className="bg-[var(--color-green-dark)] rounded-xl p-6 md:p-8 shadow-lg mb-8">
        <div className="flex flex-col md:flex-row md:items-center gap-6">
          <div className="w-24 h-24 rounded-full flex items-center justify-center flex-shrink-0" style={{ backgroundColor: teamInfo?.color || '#1A1A1A' }}>
            <span className="font-[family-name:var(--font-heading)] text-3xl text-white tracking-wider">
              {agg.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()}
            </span>
          </div>
          <div className="flex-1">
            <p className="font-[family-name:var(--font-data)] text-[10px] text-green-300 uppercase tracking-widest mb-1">
              {posLabel[agg.position] || agg.position} — {agg.team}
            </p>
            <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl text-white">
              {agg.name.toUpperCase()}
            </h1>
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="font-[family-name:var(--font-data)] text-sm text-green-200">{agg.games} jogos</span>
              <span className="font-[family-name:var(--font-heading)] text-2xl text-[var(--color-yellow-accent)]">{agg.goals}G {agg.assists}A</span>
              {agg.avgRating > 0 && (
                <span className="font-[family-name:var(--font-heading)] text-2xl text-white">{agg.avgRating.toFixed(2)}</span>
              )}
              {teamPosition && (
                <Link href={`/times/${teamSlug}`} className="font-[family-name:var(--font-data)] text-[10px] text-green-300 bg-white/10 px-2 py-0.5 rounded hover:bg-white/20 transition-colors">
                  {agg.team} · {teamPosition}º lugar
                </Link>
              )}
            </div>
          </div>
        </div>
        {insight && (
          <div className="mt-5 border-l-4 border-[var(--color-yellow-accent)] pl-4">
            <p className="text-green-100 text-sm leading-relaxed">{insight}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">

          {/* BLOCO 2 - RADAR CHART */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900">PERFIL DE JOGO</h2>
              <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                {posLabel[agg.position] || agg.position}
              </span>
            </div>
            <RadarChart dimensions={radarDimensions} />
            <div className="grid grid-cols-3 gap-2 mt-4">
              {radarDimensions.map(d => (
                <div key={d.label} className="text-center">
                  <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">{d.label}</p>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mt-0.5">
                    <div className="bg-[var(--color-green-primary)] h-1.5 rounded-full" style={{ width: `${d.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* BLOCO 3 - EVOLUÇÃO */}
          {perRound.length > 0 && (
            <>
              {/* Rating evolution */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">EVOLUÇÃO DO RATING</h2>
                <div className="space-y-1.5">
                  {perRound.filter(r => r.rating).map(r => {
                    const pct = ((r.rating! - minRating) / (maxRating - minRating)) * 100
                    const isGood = r.rating! >= 7
                    return (
                      <div key={r.round} className="flex items-center gap-2">
                        <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 w-7 text-right">R{r.round}</span>
                        <div className="flex-1 relative h-5">
                          <div
                            className={`absolute top-0 left-0 h-full rounded ${isGood ? 'bg-[var(--color-green-primary)]/50' : 'bg-orange-400/50'}`}
                            style={{ width: `${Math.max(pct, 3)}%` }}
                          />
                          <div className="absolute top-0 left-0 h-full flex items-center px-1.5">
                            <span className="font-[family-name:var(--font-data)] text-[9px] font-bold text-gray-800">{r.rating!.toFixed(1)}</span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {agg.avgRating > 0 && (
                  <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 mt-3">
                    Média: <span className="font-bold text-gray-600">{agg.avgRating.toFixed(2)}</span>
                  </p>
                )}
              </div>

              {/* Goals + Assists per round */}
              <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">GOLS E ASSISTÊNCIAS POR RODADA</h2>
                <div className="flex items-end gap-1 h-28">
                  {perRound.map(r => {
                    const total = r.goals + r.assists
                    return (
                      <div key={r.round} className="flex-1 flex flex-col items-center gap-0.5">
                        {total > 0 && (
                          <span className="font-[family-name:var(--font-data)] text-[8px] text-gray-500 font-bold">{total}</span>
                        )}
                        <div className="w-full flex flex-col gap-0" style={{ height: total > 0 ? `${(total / maxGA) * 80}%` : '2px', minHeight: '2px' }}>
                          {r.goals > 0 && (
                            <div className="flex-1 bg-[var(--color-green-primary)] rounded-t" style={{ flex: r.goals }} />
                          )}
                          {r.assists > 0 && (
                            <div className="flex-1 bg-[var(--color-yellow-accent)] rounded-t" style={{ flex: r.assists }} />
                          )}
                          {total === 0 && (
                            <div className="w-full h-0.5 bg-gray-200 rounded" />
                          )}
                        </div>
                        <span className="font-[family-name:var(--font-data)] text-[8px] text-gray-400">R{r.round}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-4 mt-3 justify-center">
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[var(--color-green-primary)]" /><span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">Gols ({agg.goals})</span></div>
                  <div className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-[var(--color-yellow-accent)]" /><span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500">Assistências ({agg.assists})</span></div>
                </div>
              </div>
            </>
          )}

          {/* BLOCO 4 - ESTATÍSTICAS COMPLETAS */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">ESTATÍSTICAS COMPLETAS</h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {[
                { label: "Jogos", value: agg.games },
                { label: "Minutos", value: agg.minutes.toLocaleString('pt-BR') },
                { label: "Min/jogo", value: agg.games > 0 ? Math.round(agg.minutes / agg.games) : 0 },
                { label: "Gols", value: agg.goals, color: agg.goals > 0 ? "text-green-600" : undefined },
                { label: "Assistências", value: agg.assists, color: agg.assists > 0 ? "text-green-600" : undefined },
                { label: "G+A", value: agg.goals + agg.assists, hl: true },
                { label: "Gols/90", value: per90Goals, hl: true },
                { label: "Assist/90", value: per90Assists, hl: true },
                { label: "Rating", value: agg.avgRating > 0 ? agg.avgRating.toFixed(2) : '-', hl: true },
                { label: "Passes", value: `${agg.passesAcc}/${agg.passes}` },
                { label: "Prec. passes", value: `${passAcc}%`, hl: true },
                { label: "Desarmes", value: agg.tackles },
                { label: "Intercep.", value: agg.interceptions },
                { label: "Duelos", value: agg.duelsWon },
                ...(agg.position === 'G' ? [{ label: "Defesas", value: agg.saves, hl: true as const }] : []),
              ].map((s) => (
                <div key={s.label} className={`text-center p-2 rounded-lg ${'hl' in s && s.hl ? 'bg-[var(--color-green-light)]/50' : 'bg-gray-50'}`}>
                  <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase">{s.label}</p>
                  <p className={`font-[family-name:var(--font-heading)] text-xl ${'color' in s && s.color ? s.color : 'text-gray-900'}`}>{s.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Per-game log */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
            <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">JOGO A JOGO</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 text-left py-2 px-1">Rod</th>
                    <th className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 text-center py-2 px-1">Min</th>
                    <th className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 text-center py-2 px-1">G</th>
                    <th className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 text-center py-2 px-1">A</th>
                    <th className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 text-center py-2 px-1">Rating</th>
                    <th className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 text-center py-2 px-1">Passes</th>
                    <th className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 text-center py-2 px-1 hidden sm:table-cell">Des</th>
                    <th className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 text-center py-2 px-1 hidden sm:table-cell">Int</th>
                    <th className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 text-center py-2 px-1 hidden sm:table-cell">Duel</th>
                  </tr>
                </thead>
                <tbody>
                  {perRound.map(r => {
                    const stat = stats.find(s => {
                      const game = games.find(g => g.id === s.game_id)
                      return game && parseRoundNumber(game.round) === r.round
                    })
                    if (!stat) return null
                    return (
                      <tr key={r.round} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="font-[family-name:var(--font-data)] text-xs text-gray-500 py-1.5 px-1">R{r.round}</td>
                        <td className="font-[family-name:var(--font-data)] text-xs text-center py-1.5 px-1">{stat.minutes_played}&apos;</td>
                        <td className={`font-[family-name:var(--font-data)] text-xs text-center py-1.5 px-1 font-bold ${stat.goals > 0 ? 'text-green-600' : 'text-gray-300'}`}>{stat.goals}</td>
                        <td className={`font-[family-name:var(--font-data)] text-xs text-center py-1.5 px-1 font-bold ${stat.assists > 0 ? 'text-green-600' : 'text-gray-300'}`}>{stat.assists}</td>
                        <td className={`font-[family-name:var(--font-data)] text-xs text-center py-1.5 px-1 font-bold ${stat.rating && stat.rating >= 7 ? 'text-green-600' : stat.rating && stat.rating < 6 ? 'text-red-500' : 'text-gray-700'}`}>{stat.rating?.toFixed(1) || '-'}</td>
                        <td className="font-[family-name:var(--font-data)] text-xs text-center py-1.5 px-1">{stat.passes_accurate}/{stat.passes_total}</td>
                        <td className="font-[family-name:var(--font-data)] text-xs text-center py-1.5 px-1 hidden sm:table-cell">{stat.tackles}</td>
                        <td className="font-[family-name:var(--font-data)] text-xs text-center py-1.5 px-1 hidden sm:table-cell">{stat.interceptions}</td>
                        <td className="font-[family-name:var(--font-data)] text-xs text-center py-1.5 px-1 hidden sm:table-cell">{stat.duels_won}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* BLOCO 5 - CARTOLA FC */}
          {cartola && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <div className="flex items-center gap-2 mb-3">
                <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900">CARTOLA FC</h3>
                <span className={`font-[family-name:var(--font-data)] text-[10px] font-bold px-2 py-0.5 rounded ${cartola.status === 'Provável' ? 'bg-green-100 text-green-700' : cartola.status === 'Dúvida' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                  {cartola.status}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">Preço</p>
                  <p className="font-[family-name:var(--font-heading)] text-xl text-gray-900">C$ {cartola.preco.toFixed(1)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">Variação</p>
                  <p className={`font-[family-name:var(--font-heading)] text-xl ${cartola.variacao > 0 ? 'text-green-600' : cartola.variacao < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                    {cartola.variacao > 0 ? '+' : ''}{cartola.variacao.toFixed(1)}
                  </p>
                </div>
                <div className="bg-[var(--color-green-light)]/50 rounded-lg p-3 text-center">
                  <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">Média pts</p>
                  <p className="font-[family-name:var(--font-heading)] text-xl text-[var(--color-green-primary)]">{cartola.media_pontos.toFixed(1)}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">Último jogo</p>
                  <p className={`font-[family-name:var(--font-heading)] text-xl ${cartola.pontos_ultimo_jogo !== null && cartola.pontos_ultimo_jogo > 0 ? 'text-green-600' : cartola.pontos_ultimo_jogo !== null && cartola.pontos_ultimo_jogo < 0 ? 'text-red-500' : 'text-gray-900'}`}>
                    {cartola.pontos_ultimo_jogo !== null ? cartola.pontos_ultimo_jogo.toFixed(1) : '-'}
                  </p>
                </div>
              </div>
              <div className="mt-3 bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">Jogos disputados</span>
                  <span className="font-[family-name:var(--font-data)] text-xs font-bold text-gray-700">{cartola.jogos_disputados}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">Posição Cartola</span>
                  <span className="font-[family-name:var(--font-data)] text-xs font-bold text-gray-700">{cartola.posicao}</span>
                </div>
              </div>
              {cartola.media_pontos >= 5 && (
                <div className="mt-3 bg-[var(--color-green-light)] border border-[var(--color-green-primary)]/20 rounded-lg p-3 text-center">
                  <p className="font-[family-name:var(--font-heading)] text-sm text-[var(--color-green-primary)]">RECOMENDADO</p>
                  <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 mt-0.5">Média acima de 5.0pts por rodada</p>
                </div>
              )}
            </div>
          )}

          {/* Quick stats card */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
            <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-3">RESUMO</h3>
            <div className="space-y-2">
              {[
                { label: "Participação", value: `${agg.games}/${teamFinishedGames} jogos (${teamFinishedGames > 0 ? Math.round((agg.games / teamFinishedGames) * 100) : 0}%)` },
                { label: "Média min/jogo", value: `${agg.games > 0 ? Math.round(agg.minutes / agg.games) : 0}'` },
                { label: "G+A por jogo", value: agg.games > 0 ? ((agg.goals + agg.assists) / agg.games).toFixed(2) : '0' },
                { label: "Passes/jogo", value: agg.games > 0 ? Math.round(agg.passes / agg.games).toString() : '0' },
                { label: "Precisão passes", value: `${passAcc}%` },
                ...(agg.position !== 'G' ? [
                  { label: "Desarmes/jogo", value: agg.games > 0 ? (agg.tackles / agg.games).toFixed(1) : '0' },
                  { label: "Duelos/jogo", value: agg.games > 0 ? (agg.duelsWon / agg.games).toFixed(1) : '0' },
                ] : [
                  { label: "Defesas/jogo", value: agg.games > 0 ? (agg.saves / agg.games).toFixed(1) : '0' },
                ]),
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">{s.label}</span>
                  <span className="font-[family-name:var(--font-data)] text-xs font-bold text-gray-700">{s.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Team link */}
          <Link href={`/times/${teamSlug}`} className="block bg-gray-50 border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all group">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: teamInfo?.color || '#1A1A1A' }}>
                <span className="font-[family-name:var(--font-heading)] text-lg text-white">{teamInfo?.abbr || '?'}</span>
              </div>
              <div>
                <p className="font-[family-name:var(--font-heading)] text-lg text-gray-900 group-hover:text-[var(--color-green-primary)] transition-colors">{agg.team.toUpperCase()}</p>
                <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                  {teamPosition ? `${teamPosition}º lugar` : ''} {teamStanding ? `· ${teamStanding.points}pts` : ''}
                </p>
              </div>
            </div>
          </Link>

          {/* Compare link */}
          <Link href={`/comparar?time1=${teamSlug}`} className="block bg-[var(--color-green-light)] border border-[var(--color-green-primary)]/20 rounded-xl p-4 text-center hover:bg-[var(--color-green-primary)]/10 transition-colors">
            <p className="font-[family-name:var(--font-heading)] text-lg text-[var(--color-green-primary)]">COMPARAR TIMES</p>
            <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 mt-0.5">Veja lado a lado todas as métricas</p>
          </Link>
        </div>
      </div>

      <SeeAlso items={[
        { href: `/times/${teamSlug}`, title: `Perfil do ${agg.team}`, description: `${teamStanding ? `${teamPosition}º · ${teamStanding.points}pts` : 'Ver perfil completo'}` },
        { href: "/rankings", title: "Rankings", description: "Os melhores em cada métrica" },
        { href: "/comparar", title: "Comparador", description: "Compare times lado a lado" },
      ]} />
    </div>
  )
}
