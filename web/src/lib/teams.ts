export interface TeamInfo {
  slug: string
  name: string
  fullName: string
  city: string
  state: string
}

export const TEAMS: TeamInfo[] = [
  { slug: "flamengo", name: "Flamengo", fullName: "Clube de Regatas do Flamengo", city: "Rio de Janeiro", state: "RJ" },
  { slug: "palmeiras", name: "Palmeiras", fullName: "Sociedade Esportiva Palmeiras", city: "São Paulo", state: "SP" },
  { slug: "atletico-mg", name: "Atlético Mineiro", fullName: "Clube Atlético Mineiro", city: "Belo Horizonte", state: "MG" },
  { slug: "fluminense", name: "Fluminense", fullName: "Fluminense Football Club", city: "Rio de Janeiro", state: "RJ" },
  { slug: "botafogo", name: "Botafogo", fullName: "Botafogo de Futebol e Regatas", city: "Rio de Janeiro", state: "RJ" },
  { slug: "sao-paulo", name: "São Paulo", fullName: "São Paulo Futebol Clube", city: "São Paulo", state: "SP" },
  { slug: "corinthians", name: "Corinthians", fullName: "Sport Club Corinthians Paulista", city: "São Paulo", state: "SP" },
  { slug: "internacional", name: "Internacional", fullName: "Sport Club Internacional", city: "Porto Alegre", state: "RS" },
  { slug: "gremio", name: "Grêmio", fullName: "Grêmio Foot-Ball Porto Alegrense", city: "Porto Alegre", state: "RS" },
  { slug: "athletico-pr", name: "Athletico-PR", fullName: "Club Athletico Paranaense", city: "Curitiba", state: "PR" },
  { slug: "fortaleza", name: "Fortaleza", fullName: "Fortaleza Esporte Clube", city: "Fortaleza", state: "CE" },
  { slug: "cruzeiro", name: "Cruzeiro", fullName: "Cruzeiro Esporte Clube", city: "Belo Horizonte", state: "MG" },
  { slug: "vasco", name: "Vasco", fullName: "Club de Regatas Vasco da Gama", city: "Rio de Janeiro", state: "RJ" },
  { slug: "bahia", name: "Bahia", fullName: "Esporte Clube Bahia", city: "Salvador", state: "BA" },
  { slug: "santos", name: "Santos", fullName: "Santos Futebol Clube", city: "Santos", state: "SP" },
  { slug: "bragantino", name: "Bragantino", fullName: "Red Bull Bragantino", city: "Bragança Paulista", state: "SP" },
  { slug: "vitoria", name: "Vitória", fullName: "Esporte Clube Vitória", city: "Salvador", state: "BA" },
  { slug: "juventude", name: "Juventude", fullName: "Esporte Clube Juventude", city: "Caxias do Sul", state: "RS" },
  { slug: "criciuma", name: "Criciúma", fullName: "Criciúma Esporte Clube", city: "Criciúma", state: "SC" },
  { slug: "cuiaba", name: "Cuiabá", fullName: "Cuiabá Esporte Clube", city: "Cuiabá", state: "MT" },
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
