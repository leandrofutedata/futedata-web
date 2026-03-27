import type { Game, TeamStanding, TeamGameStats } from './types'

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

export function getZoneColor(position: number): string {
  if (position <= 4) return 'bg-green-700' // Libertadores
  if (position <= 6) return 'bg-green-400' // Pré-Libertadores
  if (position <= 12) return 'bg-blue-500' // Sul-Americana
  if (position >= 17) return 'bg-red-500' // Rebaixamento
  return 'bg-transparent' // Zona neutra (13-16)
}

export function getZoneLabel(position: number): string {
  if (position <= 4) return 'Libertadores'
  if (position <= 6) return 'Pré-Libertadores'
  if (position <= 12) return 'Sul-Americana'
  if (position >= 17) return 'Rebaixamento'
  return ''
}

export function calcTeamGameStats(games: Game[], teamApiName: string): TeamGameStats {
  const teamFTGames = games.filter(
    g => g.status === 'FT' &&
    (g.home_team === teamApiName || g.away_team === teamApiName) &&
    g.home_possession !== null
  )

  const n = teamFTGames.length
  if (n === 0) {
    return { possession: 0, shots: 0, shotsOnTarget: 0, corners: 0, fouls: 0, passes: 0, passAccuracy: 0, goalsPerGame: 0, goalsConcededPerGame: 0, shotConversion: 0, gamesWithStats: 0 }
  }

  let totalPoss = 0, totalShots = 0, totalSoT = 0, totalCorners = 0
  let totalFouls = 0, totalPasses = 0, totalPassAcc = 0
  let totalGF = 0, totalGC = 0

  for (const g of teamFTGames) {
    const isHome = g.home_team === teamApiName
    totalPoss += (isHome ? g.home_possession : g.away_possession) ?? 0
    totalShots += (isHome ? g.home_shots : g.away_shots) ?? 0
    totalSoT += (isHome ? g.home_shots_on_target : g.away_shots_on_target) ?? 0
    totalCorners += (isHome ? g.home_corners : g.away_corners) ?? 0
    totalFouls += (isHome ? g.home_fouls : g.away_fouls) ?? 0
    totalPasses += (isHome ? g.home_passes : g.away_passes) ?? 0
    totalPassAcc += (isHome ? g.home_passes_accuracy : g.away_passes_accuracy) ?? 0
    totalGF += (isHome ? g.home_goals : g.away_goals) ?? 0
    totalGC += (isHome ? g.away_goals : g.home_goals) ?? 0
  }

  const totalShotsVal = totalShots || 1
  return {
    possession: Math.round((totalPoss / n) * 10) / 10,
    shots: Math.round((totalShots / n) * 10) / 10,
    shotsOnTarget: Math.round((totalSoT / n) * 10) / 10,
    corners: Math.round((totalCorners / n) * 10) / 10,
    fouls: Math.round((totalFouls / n) * 10) / 10,
    passes: Math.round((totalPasses / n) * 10) / 10,
    passAccuracy: Math.round((totalPassAcc / n) * 10) / 10,
    goalsPerGame: Math.round((totalGF / n) * 100) / 100,
    goalsConcededPerGame: Math.round((totalGC / n) * 100) / 100,
    shotConversion: Math.round((totalGF / totalShotsVal) * 1000) / 10,
    gamesWithStats: n,
  }
}

export function calcLeagueAvgGameStats(games: Game[], teamNames: string[]): TeamGameStats {
  const teamStats = teamNames.map(t => calcTeamGameStats(games, t)).filter(s => s.gamesWithStats > 0)
  const n = teamStats.length
  if (n === 0) {
    return { possession: 50, shots: 0, shotsOnTarget: 0, corners: 0, fouls: 0, passes: 0, passAccuracy: 0, goalsPerGame: 0, goalsConcededPerGame: 0, shotConversion: 0, gamesWithStats: 0 }
  }

  return {
    possession: 50,
    shots: Math.round(teamStats.reduce((s, t) => s + t.shots, 0) / n * 10) / 10,
    shotsOnTarget: Math.round(teamStats.reduce((s, t) => s + t.shotsOnTarget, 0) / n * 10) / 10,
    corners: Math.round(teamStats.reduce((s, t) => s + t.corners, 0) / n * 10) / 10,
    fouls: Math.round(teamStats.reduce((s, t) => s + t.fouls, 0) / n * 10) / 10,
    passes: Math.round(teamStats.reduce((s, t) => s + t.passes, 0) / n * 10) / 10,
    passAccuracy: Math.round(teamStats.reduce((s, t) => s + t.passAccuracy, 0) / n * 10) / 10,
    goalsPerGame: Math.round(teamStats.reduce((s, t) => s + t.goalsPerGame, 0) / n * 100) / 100,
    goalsConcededPerGame: Math.round(teamStats.reduce((s, t) => s + t.goalsConcededPerGame, 0) / n * 100) / 100,
    shotConversion: Math.round(teamStats.reduce((s, t) => s + t.shotConversion, 0) / n * 10) / 10,
    gamesWithStats: Math.round(teamStats.reduce((s, t) => s + t.gamesWithStats, 0) / n),
  }
}
