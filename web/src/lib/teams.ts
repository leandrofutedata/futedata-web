export interface TeamInfo {
  slug: string
  name: string
  fullName: string
  city: string
  state: string
  abbr: string
  color: string
}

export const TEAMS: TeamInfo[] = [
  { slug: "flamengo", name: "Flamengo", fullName: "Clube de Regatas do Flamengo", city: "Rio de Janeiro", state: "RJ", abbr: "FLA", color: "#C52027" },
  { slug: "palmeiras", name: "Palmeiras", fullName: "Sociedade Esportiva Palmeiras", city: "São Paulo", state: "SP", abbr: "PAL", color: "#006437" },
  { slug: "atletico-mg", name: "Atlético Mineiro", fullName: "Clube Atlético Mineiro", city: "Belo Horizonte", state: "MG", abbr: "CAM", color: "#1A1A1A" },
  { slug: "fluminense", name: "Fluminense", fullName: "Fluminense Football Club", city: "Rio de Janeiro", state: "RJ", abbr: "FLU", color: "#631D38" },
  { slug: "botafogo", name: "Botafogo", fullName: "Botafogo de Futebol e Regatas", city: "Rio de Janeiro", state: "RJ", abbr: "BOT", color: "#1A1A1A" },
  { slug: "sao-paulo", name: "São Paulo", fullName: "São Paulo Futebol Clube", city: "São Paulo", state: "SP", abbr: "SAO", color: "#C52027" },
  { slug: "corinthians", name: "Corinthians", fullName: "Sport Club Corinthians Paulista", city: "São Paulo", state: "SP", abbr: "COR", color: "#1A1A1A" },
  { slug: "internacional", name: "Internacional", fullName: "Sport Club Internacional", city: "Porto Alegre", state: "RS", abbr: "INT", color: "#E4002B" },
  { slug: "gremio", name: "Grêmio", fullName: "Grêmio Foot-Ball Porto Alegrense", city: "Porto Alegre", state: "RS", abbr: "GRE", color: "#0063AF" },
  { slug: "athletico-pr", name: "Athletico-PR", fullName: "Club Athletico Paranaense", city: "Curitiba", state: "PR", abbr: "CAP", color: "#C52027" },
  { slug: "fortaleza", name: "Fortaleza", fullName: "Fortaleza Esporte Clube", city: "Fortaleza", state: "CE", abbr: "FOR", color: "#004A8F" },
  { slug: "cruzeiro", name: "Cruzeiro", fullName: "Cruzeiro Esporte Clube", city: "Belo Horizonte", state: "MG", abbr: "CRU", color: "#003DA5" },
  { slug: "vasco", name: "Vasco", fullName: "Club de Regatas Vasco da Gama", city: "Rio de Janeiro", state: "RJ", abbr: "VAS", color: "#1A1A1A" },
  { slug: "bahia", name: "Bahia", fullName: "Esporte Clube Bahia", city: "Salvador", state: "BA", abbr: "BAH", color: "#004A8F" },
  { slug: "santos", name: "Santos", fullName: "Santos Futebol Clube", city: "Santos", state: "SP", abbr: "SAN", color: "#1A1A1A" },
  { slug: "bragantino", name: "Bragantino", fullName: "Red Bull Bragantino", city: "Bragança Paulista", state: "SP", abbr: "BGT", color: "#C52027" },
  { slug: "vitoria", name: "Vitória", fullName: "Esporte Clube Vitória", city: "Salvador", state: "BA", abbr: "VIT", color: "#C52027" },
  { slug: "juventude", name: "Juventude", fullName: "Esporte Clube Juventude", city: "Caxias do Sul", state: "RS", abbr: "JUV", color: "#006437" },
  { slug: "criciuma", name: "Criciúma", fullName: "Criciúma Esporte Clube", city: "Criciúma", state: "SC", abbr: "CRI", color: "#F5C800" },
  { slug: "cuiaba", name: "Cuiabá", fullName: "Cuiabá Esporte Clube", city: "Cuiabá", state: "MT", abbr: "CUI", color: "#006437" },
]

export function getTeamBySlug(slug: string): TeamInfo | undefined {
  return TEAMS.find(t => t.slug === slug)
}

export function getTeamSlug(teamName: string): string {
  const team = TEAMS.find(t => t.name === teamName)
  return team?.slug || teamName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

export function getTeamByName(teamName: string): TeamInfo | undefined {
  return TEAMS.find(t => t.name === teamName)
}
