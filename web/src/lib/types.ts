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
  type: string
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
  player_id: number
  player_name: string
  team: string
  goals: number
  assists: number
  minutes_played: number
  rating: number | null
  position: string
  passes_total: number
  passes_accurate: number
  tackles: number
  interceptions: number
  duels_won: number
  saves: number
}

export interface CopaBrasilGame {
  id: number
  api_game_id: number
  fase: string
  fase_ordem: number
  jogo_ida_volta: string
  home_team: string
  away_team: string
  home_team_id: number
  away_team_id: number
  home_logo: string | null
  away_logo: string | null
  home_score: number | null
  away_score: number | null
  status: string
  date: string
  round: string
  aggregate_home: number | null
  aggregate_away: number | null
}

export interface CartolaPlayer {
  id: number
  cartola_id: number
  nome: string
  apelido: string
  foto: string | null
  clube: string
  clube_id: number
  posicao: string
  preco: number
  variacao: number
  media_pontos: number
  pontos_ultimo_jogo: number | null
  jogos_disputados: number
  status: string
  updated_at: string
}

export interface SquadPlayer {
  id: number
  team_id: number
  player_id: number
  player_name: string
  age: number | null
  number: number | null
  position: string
  photo: string | null
}

export interface MarketValue {
  id: number
  team_id: number
  player_name: string
  position: string | null
  market_value: number | null
  currency: string
}

export type RoundStatus = 'encerrada' | 'ao-vivo' | 'futura'

export interface WcGroup {
  id: number
  group_name: string
  team_name: string
  team_id: number
  team_logo: string | null
  played: number
  won: number
  drawn: number
  lost: number
  goals_for: number
  goals_against: number
  points: number
  rank: number
}

export interface WcGame {
  id: number
  api_game_id: number
  phase: string
  group_name: string | null
  home_team: string
  away_team: string
  home_team_id: number
  away_team_id: number
  home_logo: string | null
  away_logo: string | null
  home_score: number | null
  away_score: number | null
  status: string
  date: string
  venue: string | null
  city: string | null
  country: string | null
}

export interface WcTeamStats {
  id: number
  team_id: number
  team_name: string
  team_logo: string | null
  confederation: string
  fifa_ranking: number
  elim_points: number
  elim_played: number
  elim_won: number
  elim_drawn: number
  elim_lost: number
  elim_gf: number
  elim_ga: number
  wc_group: string
  probability_advance: number
  probability_champion: number
}
