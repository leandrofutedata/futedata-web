import type { Game, TeamStanding } from './types'

export function estimarXG(gols: number, jogos: number): number {
  if (jogos === 0) return 0
  const mediaPorJogo = gols / jogos
  const mediaLeague = 1.15
  return Math.round((mediaPorJogo * 0.82 + mediaLeague * 0.18) * jogos * 10) / 10
}

export function estimarXGA(gc: number, jogos: number): number {
  if (jogos === 0) return 0
  const mediaPorJogo = gc / jogos
  const mediaLeague = 1.15
  return Math.round((mediaPorJogo * 0.82 + mediaLeague * 0.18) * jogos * 10) / 10
}

export function calcXPTS(xg: number, xga: number, jogos: number): number {
  if (jogos === 0) return 0
  const xgPorJogo = xg / jogos
  const xgaPorJogo = xga / jogos
  const ratio = xgPorJogo / (xgPorJogo + xgaPorJogo + 0.001)
  const xPTSporJogo = ratio * 2.85 + 0.05
  return Math.round(xPTSporJogo * jogos * 10) / 10
}

export function parseRoundNumber(round: string): number {
  const match = round.match(/(\d+)$/)
  return match ? parseInt(match[1], 10) : 0
}

export function calcStandings(games: Game[]): TeamStanding[] {
  const finishedGames = games.filter(g => g.status === 'FT')
  const teamMap = new Map<string, {
    played: number; wins: number; draws: number; losses: number
    goalsFor: number; goalsAgainst: number; points: number
    recentGames: { date: string; result: 'W' | 'D' | 'L' }[]
  }>()

  const getTeam = (name: string) => {
    if (!teamMap.has(name)) {
      teamMap.set(name, {
        played: 0, wins: 0, draws: 0, losses: 0,
        goalsFor: 0, goalsAgainst: 0, points: 0,
        recentGames: []
      })
    }
    return teamMap.get(name)!
  }

  for (const game of finishedGames) {
    const hg = game.home_goals ?? 0
    const ag = game.away_goals ?? 0
    const home = getTeam(game.home_team)
    const away = getTeam(game.away_team)

    home.played++
    away.played++
    home.goalsFor += hg
    home.goalsAgainst += ag
    away.goalsFor += ag
    away.goalsAgainst += hg

    if (hg > ag) {
      home.wins++; home.points += 3
      away.losses++
      home.recentGames.push({ date: game.date, result: 'W' })
      away.recentGames.push({ date: game.date, result: 'L' })
    } else if (hg < ag) {
      away.wins++; away.points += 3
      home.losses++
      home.recentGames.push({ date: game.date, result: 'L' })
      away.recentGames.push({ date: game.date, result: 'W' })
    } else {
      home.draws++; home.points += 1
      away.draws++; away.points += 1
      home.recentGames.push({ date: game.date, result: 'D' })
      away.recentGames.push({ date: game.date, result: 'D' })
    }
  }

  const standings: TeamStanding[] = []

  for (const [team, data] of teamMap) {
    const xG = estimarXG(data.goalsFor, data.played)
    const xGA = estimarXGA(data.goalsAgainst, data.played)
    const xPTS = calcXPTS(xG, xGA, data.played)
    const deltaPTS = Math.round((data.points - xPTS) * 10) / 10

    const form = data.recentGames
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5)
      .map(g => g.result)

    standings.push({
      team,
      played: data.played,
      wins: data.wins,
      draws: data.draws,
      losses: data.losses,
      goalsFor: data.goalsFor,
      goalsAgainst: data.goalsAgainst,
      goalDifference: data.goalsFor - data.goalsAgainst,
      points: data.points,
      xG,
      xGA,
      xPTS,
      deltaPTS,
      form,
    })
  }

  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    if (b.wins !== a.wins) return b.wins - a.wins
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor
    return a.team.localeCompare(b.team)
  })

  return standings
}

export function getTeamLabel(standing: TeamStanding, position: number, totalTeams: number): {
  emoji: string; label: string; color: string
} | null {
  if (position === 1) return { emoji: '🏆', label: 'Líder', color: 'text-yellow-600' }
  if (standing.deltaPTS > 3) return { emoji: '⚠', label: 'Sortudo', color: 'text-orange-500' }
  if (standing.deltaPTS < -3) return { emoji: '🍀', label: 'Azarado', color: 'text-green-600' }

  const formWins = standing.form.filter(f => f === 'W').length
  const formLosses = standing.form.filter(f => f === 'L').length
  if (formWins >= 4) return { emoji: '📈', label: 'Em alta', color: 'text-green-600' }
  if (formLosses >= 4) return { emoji: '📉', label: 'Em baixa', color: 'text-red-600' }

  return null
}

export function getZoneColor(position: number, totalTeams: number): string {
  if (position <= 4) return 'bg-blue-500' // Libertadores
  if (position <= 6) return 'bg-green-500' // Sul-Americana
  if (position > totalTeams - 4) return 'bg-red-500' // Rebaixamento
  return 'bg-transparent'
}

export function getZoneLabel(position: number, totalTeams: number): string {
  if (position <= 4) return 'Libertadores'
  if (position <= 6) return 'Sul-Americana'
  if (position > totalTeams - 4) return 'Rebaixamento'
  return ''
}
