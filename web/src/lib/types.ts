export interface Game {
  id: number
  league_id: number
  season: number
  round: string
  date: string
  status: 'FT' | '1H' | '2H' | 'HT' | 'NS'
  home_team: string
  away_team: string
  home_goals: number | null
  away_goals: number | null
  home_xg: number | null
  away_xg: number | null
  raw_json: Record<string, unknown> | null
}

export interface Article {
  id: number
  game_id: number
  type: 'pre-jogo' | 'tempo-real' | 'pos-jogo'
  title: string
  body: string
  published_at: string
  webflow_id: string | null
}

export interface TeamStanding {
  team: string
  played: number
  wins: number
  draws: number
  losses: number
  goalsFor: number
  goalsAgainst: number
  goalDifference: number
  points: number
  xG: number
  xGA: number
  xPTS: number
  deltaPTS: number
  form: ('W' | 'D' | 'L')[]
}

export interface PlayerStats {
  id: number
  game_id: number
  player_name: string
  team: string
  goals: number
  assists: number
  minutes: number
  rating: number | null
  position: string
}

export type RoundStatus = 'encerrada' | 'ao-vivo' | 'futura'
