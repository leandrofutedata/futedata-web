import { supabase } from './supabase'
import type { Game, Article, PlayerStats, CopaBrasilGame, CartolaPlayer, WcGroup, WcGame, WcTeamStats } from './types'
import { parseRoundNumber } from './calculations'

export async function fetchAllGames(): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching games:', error)
    return []
  }
  return data as Game[]
}

export async function fetchGamesByRound(round: number): Promise<Game[]> {
  const { data, error } = await supabase
    .from('games')
    .select('*')
    .like('round', `%- ${round}`)
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching round games:', error)
    return []
  }
  return data as Game[]
}

export async function fetchArticles(): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching articles:', error)
    return []
  }
  return data as Article[]
}

export async function fetchArticlesByGameId(gameId: number): Promise<Article[]> {
  const { data, error } = await supabase
    .from('articles')
    .select('*')
    .eq('game_id', gameId)
    .order('published_at', { ascending: false })

  if (error) {
    console.error('Error fetching articles for game:', error)
    return []
  }
  return data as Article[]
}

export async function fetchPlayerStats(): Promise<PlayerStats[]> {
  const { data, error } = await supabase
    .from('player_stats')
    .select('*')

  if (error) {
    console.error('Error fetching player stats:', error)
    return []
  }
  return data as PlayerStats[]
}

export async function fetchCopaBrasilGames(): Promise<CopaBrasilGame[]> {
  const { data, error } = await supabase
    .from('copa_brasil_games')
    .select('*')
    .order('fase_ordem', { ascending: true })
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching Copa do Brasil games:', error)
    return []
  }
  return data as CopaBrasilGame[]
}

export async function fetchCartolaPlayers(): Promise<CartolaPlayer[]> {
  const { data, error } = await supabase
    .from('cartola_players')
    .select('*')
    .order('media_pontos', { ascending: false })

  if (error) {
    // Table may not exist yet — not a critical error
    console.error('Error fetching cartola players:', error.message)
    return []
  }
  return data as CartolaPlayer[]
}

export async function fetchWcGroups(): Promise<WcGroup[]> {
  const { data, error } = await supabase
    .from('wc_groups')
    .select('*')
    .order('group_name', { ascending: true })
    .order('rank', { ascending: true })

  if (error) {
    console.error('Error fetching WC groups:', error.message)
    return []
  }
  return data as WcGroup[]
}

export async function fetchWcGames(): Promise<WcGame[]> {
  const { data, error } = await supabase
    .from('wc_games')
    .select('*')
    .order('date', { ascending: true })

  if (error) {
    console.error('Error fetching WC games:', error.message)
    return []
  }
  return data as WcGame[]
}

export async function fetchWcTeamStats(): Promise<WcTeamStats[]> {
  const { data, error } = await supabase
    .from('wc_team_stats')
    .select('*')
    .order('probability_champion', { ascending: false })

  if (error) {
    console.error('Error fetching WC team stats:', error.message)
    return []
  }
  return data as WcTeamStats[]
}

export function getAvailableRounds(games: Game[]): number[] {
  const rounds = new Set<number>()
  for (const game of games) {
    const num = parseRoundNumber(game.round)
    if (num > 0) rounds.add(num)
  }
  return Array.from(rounds).sort((a, b) => a - b)
}

export function getLatestFinishedRound(games: Game[]): number {
  let maxRound = 1
  for (const game of games) {
    if (game.status === 'FT') {
      const round = parseRoundNumber(game.round)
      if (round > maxRound) maxRound = round
    }
  }
  return maxRound
}

export function getRoundStatus(games: Game[]): 'encerrada' | 'ao-vivo' | 'futura' {
  const hasLive = games.some(g => ['1H', '2H', 'HT'].includes(g.status))
  const allFinished = games.every(g => g.status === 'FT')
  const allFuture = games.every(g => g.status === 'NS')

  if (hasLive) return 'ao-vivo'
  if (allFinished) return 'encerrada'
  if (allFuture) return 'futura'
  return 'encerrada'
}
