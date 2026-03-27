export interface TeamInfo {
  slug: string
  name: string
  apiName: string
  apiId: number
  fullName: string
  city: string
  state: string
  abbr: string
  color: string
  logo: string
}

export const TEAMS: TeamInfo[] = [
  { slug: "flamengo", name: "Flamengo", apiName: "Flamengo", apiId: 127, fullName: "Clube de Regatas do Flamengo", city: "Rio de Janeiro", state: "RJ", abbr: "FLA", color: "#C52027", logo: "https://media.api-sports.io/football/teams/127.png" },
  { slug: "palmeiras", name: "Palmeiras", apiName: "Palmeiras", apiId: 121, fullName: "Sociedade Esportiva Palmeiras", city: "São Paulo", state: "SP", abbr: "PAL", color: "#006437", logo: "https://media.api-sports.io/football/teams/121.png" },
  { slug: "atletico-mg", name: "Atlético Mineiro", apiName: "Atletico-MG", apiId: 1062, fullName: "Clube Atlético Mineiro", city: "Belo Horizonte", state: "MG", abbr: "CAM", color: "#1A1A1A", logo: "https://media.api-sports.io/football/teams/1062.png" },
  { slug: "fluminense", name: "Fluminense", apiName: "Fluminense", apiId: 124, fullName: "Fluminense Football Club", city: "Rio de Janeiro", state: "RJ", abbr: "FLU", color: "#631D38", logo: "https://media.api-sports.io/football/teams/124.png" },
  { slug: "botafogo", name: "Botafogo", apiName: "Botafogo", apiId: 120, fullName: "Botafogo de Futebol e Regatas", city: "Rio de Janeiro", state: "RJ", abbr: "BOT", color: "#1A1A1A", logo: "https://media.api-sports.io/football/teams/120.png" },
  { slug: "sao-paulo", name: "São Paulo", apiName: "Sao Paulo", apiId: 126, fullName: "São Paulo Futebol Clube", city: "São Paulo", state: "SP", abbr: "SAO", color: "#C52027", logo: "https://media.api-sports.io/football/teams/126.png" },
  { slug: "corinthians", name: "Corinthians", apiName: "Corinthians", apiId: 131, fullName: "Sport Club Corinthians Paulista", city: "São Paulo", state: "SP", abbr: "COR", color: "#1A1A1A", logo: "https://media.api-sports.io/football/teams/131.png" },
  { slug: "internacional", name: "Internacional", apiName: "Internacional", apiId: 119, fullName: "Sport Club Internacional", city: "Porto Alegre", state: "RS", abbr: "INT", color: "#E4002B", logo: "https://media.api-sports.io/football/teams/119.png" },
  { slug: "gremio", name: "Grêmio", apiName: "Gremio", apiId: 130, fullName: "Grêmio Foot-Ball Porto Alegrense", city: "Porto Alegre", state: "RS", abbr: "GRE", color: "#0063AF", logo: "https://media.api-sports.io/football/teams/130.png" },
  { slug: "athletico-pr", name: "Athletico-PR", apiName: "Atletico Paranaense", apiId: 134, fullName: "Club Athletico Paranaense", city: "Curitiba", state: "PR", abbr: "CAP", color: "#C52027", logo: "https://media.api-sports.io/football/teams/134.png" },
  { slug: "cruzeiro", name: "Cruzeiro", apiName: "Cruzeiro", apiId: 135, fullName: "Cruzeiro Esporte Clube", city: "Belo Horizonte", state: "MG", abbr: "CRU", color: "#003DA5", logo: "https://media.api-sports.io/football/teams/135.png" },
  { slug: "vasco", name: "Vasco", apiName: "Vasco DA Gama", apiId: 133, fullName: "Club de Regatas Vasco da Gama", city: "Rio de Janeiro", state: "RJ", abbr: "VAS", color: "#1A1A1A", logo: "https://media.api-sports.io/football/teams/133.png" },
  { slug: "bahia", name: "Bahia", apiName: "Bahia", apiId: 118, fullName: "Esporte Clube Bahia", city: "Salvador", state: "BA", abbr: "BAH", color: "#004A8F", logo: "https://media.api-sports.io/football/teams/118.png" },
  { slug: "santos", name: "Santos", apiName: "Santos", apiId: 128, fullName: "Santos Futebol Clube", city: "Santos", state: "SP", abbr: "SAN", color: "#1A1A1A", logo: "https://media.api-sports.io/football/teams/128.png" },
  { slug: "bragantino", name: "Bragantino", apiName: "RB Bragantino", apiId: 794, fullName: "Red Bull Bragantino", city: "Bragança Paulista", state: "SP", abbr: "BGT", color: "#C52027", logo: "https://media.api-sports.io/football/teams/794.png" },
  { slug: "vitoria", name: "Vitória", apiName: "Vitoria", apiId: 136, fullName: "Esporte Clube Vitória", city: "Salvador", state: "BA", abbr: "VIT", color: "#C52027", logo: "https://media.api-sports.io/football/teams/136.png" },
  { slug: "mirassol", name: "Mirassol", apiName: "Mirassol", apiId: 7848, fullName: "Mirassol Futebol Clube", city: "Mirassol", state: "SP", abbr: "MIR", color: "#F9A825", logo: "https://media.api-sports.io/football/teams/7848.png" },
  { slug: "chapecoense", name: "Chapecoense", apiName: "Chapecoense-sc", apiId: 132, fullName: "Associação Chapecoense de Futebol", city: "Chapecó", state: "SC", abbr: "CHA", color: "#006437", logo: "https://media.api-sports.io/football/teams/132.png" },
  { slug: "coritiba", name: "Coritiba", apiName: "Coritiba", apiId: 147, fullName: "Coritiba Foot Ball Club", city: "Curitiba", state: "PR", abbr: "CFC", color: "#006437", logo: "https://media.api-sports.io/football/teams/147.png" },
  { slug: "remo", name: "Remo", apiName: "Remo", apiId: 1198, fullName: "Clube do Remo", city: "Belém", state: "PA", abbr: "REM", color: "#0D47A1", logo: "https://media.api-sports.io/football/teams/1198.png" },
]

export const TEAM_HEADER_COLORS: Record<string, { primary: string; secondary: string }> = {
  'palmeiras': { primary: '#006437', secondary: '#FFFFFF' },
  'flamengo': { primary: '#CC0000', secondary: '#000000' },
  'corinthians': { primary: '#000000', secondary: '#FFFFFF' },
  'sao-paulo': { primary: '#CC0000', secondary: '#FFFFFF' },
  'santos': { primary: '#000000', secondary: '#FFFFFF' },
  'gremio': { primary: '#0066CC', secondary: '#000000' },
  'internacional': { primary: '#CC0000', secondary: '#FFFFFF' },
  'cruzeiro': { primary: '#003399', secondary: '#FFFFFF' },
  'atletico-mg': { primary: '#000000', secondary: '#FFFFFF' },
  'fluminense': { primary: '#6B0F1A', secondary: '#8B2133' },
  'vasco': { primary: '#000000', secondary: '#FFFFFF' },
  'botafogo': { primary: '#000000', secondary: '#FFFFFF' },
  'bahia': { primary: '#003DA5', secondary: '#E31837' },
  'athletico-pr': { primary: '#CC0000', secondary: '#000000' },
  'coritiba': { primary: '#006437', secondary: '#FFFFFF' },
  'bragantino': { primary: '#CC0000', secondary: '#FFFFFF' },
  'vitoria': { primary: '#CC0000', secondary: '#000000' },
  'mirassol': { primary: '#F5C518', secondary: '#000000' },
  'chapecoense': { primary: '#006437', secondary: '#FFFFFF' },
  'remo': { primary: '#0D47A1', secondary: '#FFFFFF' },
}

export function getTeamBySlug(slug: string): TeamInfo | undefined {
  return TEAMS.find(t => t.slug === slug)
}

export function getTeamSlug(teamName: string): string {
  const team = TEAMS.find(t => t.name === teamName || t.apiName === teamName)
  return team?.slug || teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function getTeamByName(teamName: string): TeamInfo | undefined {
  return TEAMS.find(t => t.name === teamName || t.apiName === teamName)
}
