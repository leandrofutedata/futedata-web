import { config } from "dotenv"
import { resolve } from "path"
import { createClient } from "@supabase/supabase-js"

// Carrega .env.local do diretorio web/ e .env da raiz (service key)
config({ path: resolve(__dirname, "..", ".env.local") })
config({ path: resolve(__dirname, "..", "..", ".env") })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || ""
// Prefere service key para escrita
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Credenciais Supabase nao encontradas")
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

/* ─── Cartola FC API endpoints (publicos, sem autenticacao) ─── */
const CARTOLA_BASE = "https://api.cartolafc.globo.com"

interface CartolaMarketStatus {
  rodada_atual: number
  status_mercado: number // 1=aberto, 2=fechado, 4=em manutencao, 6=encerrado
  times_escalados: number
  game_over: boolean
  temporada: number
  fechamento: { dia: number; mes: number; ano: number; hora: number; minuto: number }
}

interface CartolaAtleta {
  atleta_id: number
  nome: string
  apelido: string
  foto: string | null
  clube_id: number
  posicao_id: number
  status_id: number
  preco_num: number
  variacao_num: number
  media_num: number
  pontos_num: number
  jogos_num: number
  scout?: Record<string, number>
}

interface CartolaAtletasMercado {
  atletas: CartolaAtleta[]
  clubes: Record<string, { id: number; nome: string; abreviacao: string; escudos: Record<string, string> }>
  posicoes: Record<string, { id: number; nome: string; abreviacao: string }>
}

interface CartolaPontuado {
  atleta_id: number
  apelido: string
  foto: string | null
  clube_id: number
  posicao_id: number
  pontuacao: number
  scout: Record<string, number>
}

// Mapa de posicoes do Cartola FC
const POSICAO_MAP: Record<number, string> = {
  1: "GOL",
  2: "LAT",
  3: "ZAG",
  4: "MEI",
  5: "ATA",
  6: "TEC",
}

// Mapa de status do Cartola FC
const STATUS_MAP: Record<number, string> = {
  2: "Duvida",
  3: "Suspenso",
  5: "Contundido",
  6: "Nulo",
  7: "Provavel",
}

async function fetchCartola<T>(endpoint: string): Promise<T | null> {
  const url = `${CARTOLA_BASE}${endpoint}`
  console.log(`  Buscando: ${url}`)
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "Futedata/1.0",
        "Accept": "application/json",
      },
    })
    if (!response.ok) {
      console.log(`  HTTP ${response.status}: ${response.statusText}`)
      return null
    }
    return await response.json() as T
  } catch (err) {
    console.log(`  Erro de rede: ${err}`)
    return null
  }
}

async function main() {
  console.log("Futedata — Cartola FC Population Script")
  console.log("========================================\n")

  // 1. Status do mercado
  console.log("[1/3] Verificando status do mercado...")
  const marketStatus = await fetchCartola<CartolaMarketStatus>("/mercado/status")
  if (marketStatus) {
    console.log(`  Temporada: ${marketStatus.temporada}`)
    console.log(`  Rodada atual: ${marketStatus.rodada_atual}`)
    console.log(`  Status do mercado: ${marketStatus.status_mercado} (1=aberto, 2=fechado)`)
    console.log(`  Times escalados: ${marketStatus.times_escalados}`)
    console.log(`  Game over: ${marketStatus.game_over}`)
  } else {
    console.log("  API do Cartola nao disponivel ou fora de temporada")
  }

  // 2. Atletas do mercado
  console.log("\n[2/3] Buscando atletas do mercado...")
  const mercado = await fetchCartola<CartolaAtletasMercado>("/atletas/mercado")

  let clubeMap: Record<number, string> = {}
  let atletas: CartolaAtleta[] = []

  if (mercado?.atletas) {
    atletas = mercado.atletas
    console.log(`  ${atletas.length} atletas encontrados no mercado`)

    // Montar mapa de clubes
    if (mercado.clubes) {
      for (const [, clube] of Object.entries(mercado.clubes)) {
        clubeMap[clube.id] = clube.nome
      }
      console.log(`  ${Object.keys(clubeMap).length} clubes mapeados`)
    }
  } else {
    console.log("  Nenhum atleta no mercado (API indisponivel ou fora de temporada)")
  }

  // 3. Pontuacoes da ultima rodada
  console.log("\n[3/3] Buscando pontuacoes da ultima rodada...")
  const pontuados = await fetchCartola<Record<string, CartolaPontuado>>("/atletas/pontuados")

  let pontuadosMap = new Map<number, number>()
  if (pontuados) {
    for (const [id, p] of Object.entries(pontuados)) {
      if (typeof p === "object" && p.pontuacao !== undefined) {
        pontuadosMap.set(Number(id), p.pontuacao)
      }
    }
    console.log(`  ${pontuadosMap.size} jogadores pontuados na ultima rodada`)
  } else {
    console.log("  Nenhuma pontuacao disponivel")
  }

  // 4. Inserir no Supabase
  if (atletas.length === 0) {
    console.log("\n=== SEM DADOS DO CARTOLA FC ===")
    console.log("A API do Cartola FC nao retornou dados.")
    console.log("Possiveis razoes:")
    console.log("  - Mercado fechado entre rodadas")
    console.log("  - Fora da temporada do Cartola")
    console.log("  - API em manutencao")
    console.log("\nA pagina /cartola usara dados de player_stats como fallback.")
    return
  }

  console.log(`\n[4/4] Inserindo ${atletas.length} jogadores no Supabase...`)

  let successCount = 0
  let errorCount = 0

  // Processar em batches de 100
  const batchSize = 100
  for (let i = 0; i < atletas.length; i += batchSize) {
    const batch = atletas.slice(i, i + batchSize)

    const rows = batch.map((a) => ({
      cartola_id: a.atleta_id,
      nome: a.nome,
      apelido: a.apelido,
      foto: a.foto?.replace("FORMATO", "220x220") || null,
      clube: clubeMap[a.clube_id] || `Clube ${a.clube_id}`,
      clube_id: a.clube_id,
      posicao: POSICAO_MAP[a.posicao_id] || `POS${a.posicao_id}`,
      preco: a.preco_num,
      variacao: a.variacao_num,
      media_pontos: a.media_num,
      pontos_ultimo_jogo: pontuadosMap.get(a.atleta_id) ?? a.pontos_num,
      jogos_disputados: a.jogos_num,
      status: STATUS_MAP[a.status_id] || "Disponivel",
      updated_at: new Date().toISOString(),
    }))

    const { error } = await supabase
      .from("cartola_players")
      .upsert(rows, { onConflict: "cartola_id" })

    if (error) {
      console.error(`  Erro no batch ${Math.floor(i / batchSize) + 1}: ${error.message}`)
      errorCount += batch.length
    } else {
      successCount += batch.length
      console.log(`  Batch ${Math.floor(i / batchSize) + 1}: ${batch.length} jogadores inseridos (total: ${successCount})`)
    }
  }

  console.log(`\n=== RESULTADO ===`)
  console.log(`Jogadores inseridos: ${successCount}`)
  console.log(`Erros: ${errorCount}`)
  console.log(`Rodada: ${marketStatus?.rodada_atual || "N/A"}`)

  // Stats por posicao
  const posCounts: Record<string, number> = {}
  atletas.forEach((a) => {
    const pos = POSICAO_MAP[a.posicao_id] || "?"
    posCounts[pos] = (posCounts[pos] || 0) + 1
  })
  console.log(`\nPor posicao:`)
  for (const [pos, count] of Object.entries(posCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${pos}: ${count}`)
  }

  // Top 5 mais caros
  const top5 = [...atletas].sort((a, b) => b.preco_num - a.preco_num).slice(0, 5)
  console.log(`\nTop 5 mais caros:`)
  top5.forEach((a, i) => {
    console.log(`  ${i + 1}. ${a.apelido} (${clubeMap[a.clube_id]}) - C$ ${a.preco_num.toFixed(2)} | Media: ${a.media_num.toFixed(1)}`)
  })
}

main().catch((err) => {
  console.error("Erro fatal:", err)
  process.exit(1)
})
