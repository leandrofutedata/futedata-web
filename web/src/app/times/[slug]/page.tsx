import { fetchAllGames, fetchPlayerStatsByTeam, fetchSquadByTeam, fetchMarketValuesByTeam } from "@/lib/data"
import { calcStandings, parseRoundNumber, estimarXG, estimarXGA, calcXPTS, getZoneColor, getZoneLabel, calcTeamGameStats, calcLeagueAvgGameStats } from "@/lib/calculations"
import { TEAMS, getTeamBySlug, getTeamByName, TEAM_HEADER_COLORS } from "@/lib/teams"
import { generateInsight } from "@/lib/ai"
import { Breadcrumb } from "@/components/Breadcrumb"
import { SeeAlso } from "@/components/SeeAlso"
import { SquadSection, type SquadPlayerData } from "@/components/SquadSection"
import { EvolutionChart } from "@/components/EvolutionChart"
import { GoalsXgChart, type GoalsXgEntry } from "@/components/GoalsXgChart"
import { HeadToHead } from "@/components/HeadToHead"
import { TeamRadarChart } from "@/components/TeamRadarChart"
import { AdvancedStats } from "@/components/AdvancedStats"
import { SquadHighlights, type HighlightCategory, type HighlightPlayer } from "@/components/SquadHighlights"
import { PlayerOfSeason, type RadarDim } from "@/components/PlayerOfSeason"
import { notFound } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
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
  const standing = standings.find(s => s.team === teamInfo.apiName)
  const position = standing ? standings.indexOf(standing) + 1 : null

  const desc = standing
    ? `${teamInfo.name} no Brasileirão 2026: ${position}º lugar, ${standing.points} pontos. xG: ${standing.xG.toFixed(1)}, xPTS: ${standing.xPTS.toFixed(1)}. Análise completa.`
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

  const [games, playerStats, squad, marketValues] = await Promise.all([
    fetchAllGames(),
    fetchPlayerStatsByTeam(teamInfo.apiName),
    fetchSquadByTeam(teamInfo.apiId),
    fetchMarketValuesByTeam(teamInfo.apiId),
  ])

  const standings = calcStandings(games)
  const standing = standings.find(s => s.team === teamInfo.apiName)
  const position = standing ? standings.indexOf(standing) + 1 : null

  // Team games
  const teamGames = games
    .filter(g => g.home_team === teamInfo.apiName || g.away_team === teamInfo.apiName)
    .sort((a, b) => a.date.localeCompare(b.date))

  const finishedGames = teamGames.filter(g => g.status === 'FT')
  const upcomingGames = teamGames.filter(g => g.status === 'NS').slice(0, 3)
  const lastGames = finishedGames.slice(-5).reverse()

  // Advanced game stats
  const teamGameStats = calcTeamGameStats(games, teamInfo.apiName)
  const leagueGameStats = calcLeagueAvgGameStats(games, standings.map(s => s.team))

  // Evolution: PTS vs xPTS per round + goals/xG data
  const evolution: { round: number; pts: number; xpts: number; gf: number; xg: number }[] = []
  const goalsXgData: GoalsXgEntry[] = []
  let cumPTS = 0, cumGF = 0, cumGC = 0, played = 0
  for (const game of finishedGames) {
    const round = parseRoundNumber(game.round)
    const isHome = game.home_team === teamInfo.apiName
    const gf = isHome ? (game.home_goals ?? 0) : (game.away_goals ?? 0)
    const gc = isHome ? (game.away_goals ?? 0) : (game.home_goals ?? 0)
    const rawXg = isHome ? game.home_xg : game.away_xg
    const gameXG = rawXg ?? gf

    played++
    cumGF += gf
    cumGC += gc
    cumPTS += gf > gc ? 3 : gf === gc ? 1 : 0

    const xG = estimarXG(cumGF, played)
    const xGA = estimarXGA(cumGC, played)
    const xPTS = calcXPTS(xG, xGA, played)

    evolution.push({ round, pts: cumPTS, xpts: Math.round(xPTS * 10) / 10, gf, xg: Math.round(gameXG * 10) / 10 })

    const oppApi = isHome ? game.away_team : game.home_team
    const oppInfo = getTeamByName(oppApi)
    goalsXgData.push({
      round,
      gf,
      xg: rawXg !== null ? Math.round(rawXg * 10) / 10 : null,
      opponent: oppInfo?.name || oppApi,
      score: isHome ? `${game.home_goals ?? 0}×${game.away_goals ?? 0}` : `${game.away_goals ?? 0}×${game.home_goals ?? 0}`,
      isHome,
    })
  }

  // Squad grouped by position
  const positionOrder = ['Goalkeeper', 'Defender', 'Midfielder', 'Attacker'] as const
  const positionLabels: Record<string, string> = { 'Goalkeeper': 'Goleiros', 'Defender': 'Defensores', 'Midfielder': 'Meias', 'Attacker': 'Atacantes' }
  // Build a map of player_id -> aggregated stats from player_stats for squad enrichment
  const squadStatsMap = new Map<number, { goals: number; assists: number; games: number; avgRating: number; minutes: number; passesTotal: number; passesAccurate: number; tackles: number; interceptions: number; duelsWon: number; saves: number }>()
  for (const s of playerStats) {
    if (!squadStatsMap.has(s.player_id)) {
      squadStatsMap.set(s.player_id, { goals: 0, assists: 0, games: 0, avgRating: 0, minutes: 0, passesTotal: 0, passesAccurate: 0, tackles: 0, interceptions: 0, duelsWon: 0, saves: 0 })
    }
    const p = squadStatsMap.get(s.player_id)!
    p.goals += s.goals
    p.assists += s.assists
    p.games++
    p.minutes += s.minutes_played
    p.passesTotal += s.passes_total
    p.passesAccurate += s.passes_accurate
    p.tackles += s.tackles
    p.interceptions += s.interceptions
    p.duelsWon += s.duels_won
    p.saves += s.saves
  }
  // Calculate avg rating separately
  const ratingMap = new Map<number, number[]>()
  for (const s of playerStats) {
    if (s.rating) {
      if (!ratingMap.has(s.player_id)) ratingMap.set(s.player_id, [])
      ratingMap.get(s.player_id)!.push(s.rating)
    }
  }
  for (const [pid, ratings] of ratingMap) {
    const entry = squadStatsMap.get(pid)
    if (entry) entry.avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length
  }

  const squadByPositionData = positionOrder
    .map(pos => ({
      position: pos,
      label: positionLabels[pos],
      players: squad.filter(p => p.position === pos).sort((a, b) => (a.number ?? 99) - (b.number ?? 99)).map((p): SquadPlayerData => {
        const stats = squadStatsMap.get(p.player_id)
        const hasPage = stats && stats.games >= 2
        return {
          player_id: p.player_id,
          player_name: p.player_name,
          age: p.age,
          number: p.number,
          position: p.position,
          photo: p.photo,
          slug: hasPage ? playerSlug(p.player_name, p.player_id) : null,
          stats: stats ? { ...stats } : null,
        }
      }),
    }))
    .filter(g => g.players.length > 0)

  // Market values
  const totalMarketValue = marketValues.reduce((sum, mv) => sum + (mv.market_value || 0), 0)
  const topByValue = marketValues.filter(mv => mv.market_value).slice(0, 5)
  function formatValue(v: number): string {
    if (v >= 1_000_000) return `€${(v / 1_000_000).toFixed(1)}M`
    if (v >= 1_000) return `€${(v / 1_000).toFixed(0)}K`
    return `€${v}`
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

  // Squad highlights: 5 categories
  const allPlayers = Array.from(playerMap.values())
  const squadPhotoMap = new Map(squad.map(s => [s.player_id, s.photo]))

  function makeHighlightPlayer(p: { id: number; name: string; pos: string; games: number }, value: string, rating: number | null): HighlightPlayer {
    const hasPage = p.games >= 2
    return {
      id: p.id,
      name: p.name,
      photo: squadPhotoMap.get(p.id) || null,
      position: p.pos,
      slug: hasPage ? playerSlug(p.name, p.id) : null,
      rating,
      value,
    }
  }

  const highlightCategories: HighlightCategory[] = [
    {
      title: "Artilheiros",
      players: allPlayers.filter(p => p.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 5)
        .map(p => makeHighlightPlayer(p, `${p.goals} gols`, p.ratings.length > 0 ? p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length : null)),
    },
    {
      title: "Garçons",
      players: allPlayers.filter(p => p.assists > 0).sort((a, b) => b.assists - a.assists).slice(0, 5)
        .map(p => makeHighlightPlayer(p, `${p.assists} assist.`, p.ratings.length > 0 ? p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length : null)),
    },
    {
      title: "Criadores",
      players: allPlayers.filter(p => p.games >= 3).sort((a, b) => (b.passes / b.games) - (a.passes / a.games)).slice(0, 5)
        .map(p => makeHighlightPlayer(p, `${Math.round(p.passes / p.games)} passes/j`, p.ratings.length > 0 ? p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length : null)),
    },
    {
      title: "Defensores",
      players: allPlayers.filter(p => p.games >= 3 && (p.pos === "Defender" || p.pos === "Midfielder"))
        .sort((a, b) => ((b.tackles + b.interceptions) / b.games) - ((a.tackles + a.interceptions) / a.games)).slice(0, 5)
        .map(p => makeHighlightPlayer(p, `${((p.tackles + p.interceptions) / p.games).toFixed(1)} d+i/j`, p.ratings.length > 0 ? p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length : null)),
    },
    {
      title: "Consistência",
      players: allPlayers.filter(p => p.ratings.length >= 5)
        .map(p => ({ ...p, avgR: p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length }))
        .sort((a, b) => b.avgR - a.avgR).slice(0, 5)
        .map(p => makeHighlightPlayer(p, `${p.ratings.length} jogos`, p.avgR)),
    },
  ]

  // Player of the season
  const seasonMVP = allPlayers
    .filter(p => p.ratings.length >= 5)
    .map(p => ({ ...p, avgRating: p.ratings.reduce((a, b) => a + b, 0) / p.ratings.length }))
    .sort((a, b) => b.avgRating - a.avgRating)[0] || null

  function normalizeVal(v: number, min: number, max: number): number {
    return Math.max(0, Math.min(100, ((v - min) / (max - min)) * 100))
  }

  const mvpRadar: RadarDim[] = seasonMVP ? [
    { label: "GOLS", value: normalizeVal(seasonMVP.goals / seasonMVP.games * 90 / Math.max(seasonMVP.minutes / seasonMVP.games, 1), 0, 1) },
    { label: "ASSIST", value: normalizeVal(seasonMVP.assists / seasonMVP.games * 90 / Math.max(seasonMVP.minutes / seasonMVP.games, 1), 0, 0.8) },
    { label: "PASSES", value: normalizeVal(seasonMVP.passes / seasonMVP.games, 0, 60) },
    { label: "DESARMES", value: normalizeVal(seasonMVP.tackles / seasonMVP.games, 0, 4) },
    { label: "DUELOS", value: normalizeVal(seasonMVP.duelsWon / seasonMVP.games, 0, 8) },
    { label: "RATING", value: normalizeVal(seasonMVP.avgRating, 5.5, 8.5) },
  ] : []

  const mvpInsight = seasonMVP ? await generateInsight(
    `player-season-${slug}-${seasonMVP.id}-r${standing?.played || 0}`,
    `Analise brevemente o jogador ${seasonMVP.name} do ${teamInfo.name} no Brasileirão 2026:
- Posição: ${seasonMVP.pos}, ${seasonMVP.games} jogos, ${seasonMVP.goals} gols, ${seasonMVP.assists} assistências
- Rating médio: ${seasonMVP.avgRating.toFixed(2)} (${seasonMVP.ratings.length} jogos avaliados)
- ${seasonMVP.passes} passes totais, ${seasonMVP.tackles} desarmes, ${seasonMVP.duelsWon} duelos ganhos

Escreva 2 frases sobre por que ele é o destaque da temporada. Tom de colunista.`,
    { maxTokens: 200 }
  ) : ''

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
    `team-tactical-v2-${slug}-r${standing.played}`,
    `Com base nos dados do ${teamInfo.name} no Brasileirão 2026, descreva como este time joga:
- xG/jogo: ${xgPerGame.toFixed(2)} (média liga: ${avgXG.toFixed(2)}), gols/jogo: ${gfPerGame.toFixed(2)} (média: ${avgGF.toFixed(2)})
- xGA/jogo: ${xgaPerGame.toFixed(2)} (média liga: ${avgXGA.toFixed(2)}), gols sofridos/jogo: ${gcPerGame.toFixed(2)} (média: ${avgGA.toFixed(2)})
- ±PTS: ${standing.deltaPTS > 0 ? '+' : ''}${standing.deltaPTS.toFixed(1)} (${standing.deltaPTS > 2 ? 'eficiente/sortudo' : standing.deltaPTS < -2 ? 'ineficiente/azarado' : 'justo'})
- SG: ${standing.goalDifference > 0 ? '+' : ''}${standing.goalDifference}
- Resultado: ${standing.wins}V ${standing.draws}E ${standing.losses}D
${teamGameStats.gamesWithStats > 0 ? `- Posse: ${teamGameStats.possession}% (liga: ${leagueGameStats.possession}%)
- Finalizações/jogo: ${teamGameStats.shots} (liga: ${leagueGameStats.shots}), no gol: ${teamGameStats.shotsOnTarget} (liga: ${leagueGameStats.shotsOnTarget})
- Passes/jogo: ${Math.round(teamGameStats.passes)} (liga: ${Math.round(leagueGameStats.passes)}), precisão: ${teamGameStats.passAccuracy}%
- Faltas/jogo: ${teamGameStats.fouls} (liga: ${leagueGameStats.fouls}), conversão: ${teamGameStats.shotConversion}%` : ''}

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
    const opp = g.home_team === teamInfo.apiName ? g.away_team : g.home_team
    const oppInfo = getTeamByName(opp)
    const oppIdx = standings.findIndex(s => s.team === opp)
    return { game: g, opponent: oppInfo?.name || opp, isHome: g.home_team === teamInfo.apiName, position: oppIdx >= 0 ? oppIdx + 1 : null }
  })

  // Head-to-head data for client component
  const h2hGames = finishedGames.map(g => ({
    id: g.id,
    round: g.round,
    date: g.date,
    homeTeam: g.home_team,
    awayTeam: g.away_team,
    homeGoals: g.home_goals,
    awayGoals: g.away_goals,
    isHome: g.home_team === teamInfo.apiName,
  }))

  const h2hOpponents = TEAMS
    .filter(t => t.slug !== slug)
    .map(t => ({ apiName: t.apiName, apiId: t.apiId, name: t.name, slug: t.slug, logo: t.logo }))
    .sort((a, b) => a.name.localeCompare(b.name))

  // SeeAlso neighbors
  const seeAlsoTeams = standings.filter(s => s.team !== teamInfo.apiName).slice(0, 3)

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: teamInfo.fullName,
    alternateName: teamInfo.name,
    sport: "Football",
    url: `https://futedata.com.br/times/${slug}`,
    logo: teamInfo.logo,
    image: teamInfo.logo,
    memberOf: { "@type": "SportsOrganization", name: "Brasileirão Série A 2026" },
    location: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: teamInfo.city, addressRegion: teamInfo.state, addressCountry: "BR" } },
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Breadcrumb items={[{ label: "Times", href: "/times" }, { label: teamInfo.name }]} />

      {/* BLOCO 1 - HEADER */}
      {(() => {
        const hc = TEAM_HEADER_COLORS[slug] || { primary: 'var(--color-green-dark)', secondary: '#FFFFFF' }
        const isLight = ['#F5C518', '#FFFFFF'].includes(hc.primary)
        return (
          <div className="rounded-xl p-6 md:p-8 shadow-lg mb-8" style={{ backgroundColor: hc.primary }}>
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="w-24 h-24 flex items-center justify-center flex-shrink-0">
                <Image src={teamInfo.logo} alt={`Escudo ${teamInfo.name}`} width={88} height={88} className="object-contain drop-shadow-lg" />
              </div>
              <div className="flex-1">
                <p className="font-[family-name:var(--font-data)] text-[10px] uppercase tracking-widest mb-1" style={{ color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)' }}>
                  {teamInfo.fullName} — {teamInfo.city}/{teamInfo.state}
                </p>
                <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-6xl" style={{ color: hc.secondary }}>
                  {teamInfo.name.toUpperCase()}
                </h1>
                {standing && position && (
                  <div className="flex flex-wrap items-center gap-3 mt-3">
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-6 rounded-sm ${getZoneColor(position)}`} />
                      <span className="font-[family-name:var(--font-heading)] text-2xl" style={{ color: isLight ? '#000000' : 'var(--color-yellow-accent)' }}>{position}º lugar</span>
                      {getZoneLabel(position) && (
                        <span className="font-[family-name:var(--font-data)] text-xs" style={{ color: isLight ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.6)' }}>{getZoneLabel(position)}</span>
                      )}
                    </span>
                    <span className="font-[family-name:var(--font-heading)] text-2xl" style={{ color: hc.secondary }}>{standing.points} pontos</span>
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
              <div className="mt-5 border-l-4 pl-4" style={{ borderColor: isLight ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.4)' }}>
                <p className="text-sm leading-relaxed" style={{ color: isLight ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)' }}>{headerInsight}</p>
              </div>
            )}
          </div>
        )
      })()}

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

              {/* Evolution chart: PTS vs xPTS (SVG line chart) */}
              {evolution.length >= 2 && (
                <EvolutionChart data={evolution.map(e => ({ round: e.round, pts: e.pts, xpts: e.xpts }))} />
              )}

              {/* Goals vs xG per round (Chart.js) */}
              {goalsXgData.length > 0 && (
                <GoalsXgChart data={goalsXgData} />
              )}

              {/* Estilo de Jogo — Radar */}
              <TeamRadarChart teamStats={teamGameStats} leagueStats={leagueGameStats} />

              {/* Estatísticas Avançadas */}
              <AdvancedStats teamStats={teamGameStats} leagueStats={leagueGameStats} />

              {/* Destaques do Elenco */}
              <SquadHighlights categories={highlightCategories} teamColor={teamInfo.color} />

              {/* Squad */}
              {squadByPositionData.length > 0 && (
                <SquadSection
                  squadByPosition={squadByPositionData}
                  teamColor={teamInfo.color}
                  totalPlayers={squad.length}
                />
              )}

              {/* Head-to-Head */}
              <HeadToHead
                team={{ name: teamInfo.name, apiName: teamInfo.apiName, apiId: teamInfo.apiId, logo: teamInfo.logo }}
                opponents={h2hOpponents}
                currentSeasonGames={h2hGames}
              />

              {/* Last games */}
              {lastGames.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
                  <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">ÚLTIMOS JOGOS</h2>
                  <div className="space-y-2">
                    {lastGames.map((game) => {
                      const isHome = game.home_team === teamInfo.apiName
                      const tg = isHome ? game.home_goals : game.away_goals
                      const og = isHome ? game.away_goals : game.home_goals
                      const oppApi = isHome ? game.away_team : game.home_team
                      const oppInfo = getTeamByName(oppApi)
                      const result = (tg ?? 0) > (og ?? 0) ? 'V' : (tg ?? 0) < (og ?? 0) ? 'D' : 'E'
                      return (
                        <div key={game.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                          <span className={`${result === 'V' ? 'bg-green-500' : result === 'D' ? 'bg-red-500' : 'bg-gray-400'} w-6 h-6 rounded flex items-center justify-center text-white text-xs font-bold font-[family-name:var(--font-data)]`}>{result}</span>
                          <span className="font-[family-name:var(--font-data)] text-xs text-gray-400 w-6">R{parseRoundNumber(game.round)}</span>
                          <span className="font-[family-name:var(--font-heading)] text-lg text-gray-900">{tg} × {og}</span>
                          <span className="text-sm font-medium flex-1">{oppInfo?.name || oppApi}</span>
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
              <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">COMO ESTE TIME JOGA</h2>
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

          {/* BLOCO - JOGADOR DA TEMPORADA */}
          {seasonMVP && mvpRadar.length > 0 && (
            <PlayerOfSeason
              player={{
                id: seasonMVP.id,
                name: seasonMVP.name,
                photo: squadPhotoMap.get(seasonMVP.id) || null,
                slug: playerSlug(seasonMVP.name, seasonMVP.id),
                position: seasonMVP.pos,
                games: seasonMVP.games,
                goals: seasonMVP.goals,
                assists: seasonMVP.assists,
                avgRating: seasonMVP.avgRating,
              }}
              radarDimensions={mvpRadar}
              aiInsight={mvpInsight}
              teamColor={teamInfo.color}
            />
          )}

          {/* BLOCO - VALOR DE MERCADO */}
          {topByValue.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4">
              <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-1">VALOR DE MERCADO</h3>
              <p className="font-[family-name:var(--font-heading)] text-2xl text-[var(--color-green-primary)] mb-3">{formatValue(totalMarketValue)}</p>
              <div className="space-y-1.5">
                {topByValue.map((mv, i) => {
                  const pct = topByValue[0].market_value ? ((mv.market_value || 0) / topByValue[0].market_value) * 100 : 0
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{mv.player_name}</p>
                        <div className="h-1.5 bg-gray-100 rounded-full mt-0.5">
                          <div className="h-full bg-[var(--color-green-primary)] rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                      <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 whitespace-nowrap">{formatValue(mv.market_value || 0)}</span>
                    </div>
                  )
                })}
              </div>
              <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-300 mt-3 text-center">Fonte: Transfermarkt</p>
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
        ...seeAlsoTeams.map(t => {
          const ti = getTeamByName(t.team)
          return {
            href: `/times/${ti?.slug || t.team.toLowerCase().replace(/\s+/g, '-')}`,
            title: ti?.name || t.team,
            description: `${t.points}pts — ${t.wins}V ${t.draws}E ${t.losses}D`,
          }
        }),
      ]} />
    </div>
  )
}
