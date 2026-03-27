import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"
import { fetchAllGames, fetchArticles, fetchCartolaPlayers, fetchCopaBrasilGames, fetchWcGroups, getLatestFinishedRound } from "@/lib/data"
import { calcStandings } from "@/lib/calculations"
import { getTeamByName } from "@/lib/teams"
import { Countdown } from "@/components/Countdown"

export const metadata: Metadata = {
  title: "Futedata — Análise Estatística do Futebol Brasileiro",
  description: "O melhor site de análise de dados do futebol brasileiro. Brasileirão, Copa do Brasil, Copa do Mundo 2026, Cartola FC.",
  openGraph: {
    title: "Futedata — Análise Estatística do Futebol Brasileiro",
    description: "Brasileirão, Copa do Brasil, Copa do Mundo 2026, Cartola FC — dados que nenhum outro site brasileiro oferece.",
    images: [{ url: "/api/og?title=FUTEDATA&subtitle=An%C3%A1lise+Estat%C3%ADstica+do+Futebol+Brasileiro", width: 1200, height: 630 }],
  },
}

export const revalidate = 60

function extractSection(text: string, marker: string): string {
  const lines = text.split("\n")
  let capturing = false
  let content = ""
  const markerUpper = marker.toUpperCase()
  const nextMarkers = ["MANCHETE", "LIDE", "ANÁLISE", "ANALISE", "CONCLUSÃO", "CONCLUSAO"].filter(m => m !== markerUpper)

  for (const line of lines) {
    const upper = line.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
    if (upper.startsWith(markerUpper + ":")) {
      capturing = true
      const after = line.trim().substring(line.trim().indexOf(":") + 1).trim()
      if (after) content += after + "\n"
      continue
    }
    if (capturing) {
      if (nextMarkers.some(nm => upper.startsWith(nm + ":") || upper === nm)) break
      content += line + "\n"
    }
  }
  return content.trim()
}

export default async function HomePage() {
  const [games, articles, cartolaPlayers, copaGames, wcGroups] = await Promise.all([
    fetchAllGames(),
    fetchArticles(),
    fetchCartolaPlayers(),
    fetchCopaBrasilGames(),
    fetchWcGroups(),
  ])

  const standings = calcStandings(games)
  const currentRound = getLatestFinishedRound(games)
  const leader = standings[0]
  const leaderInfo = leader ? getTeamByName(leader.team) : null

  // Hero: latest round editorial
  const roundEditorial = articles
    .filter(a => a.type.startsWith("round-editorial-"))
    .sort((a, b) => b.published_at.localeCompare(a.published_at))[0]

  let heroHeadline = ""
  let heroLead = ""
  if (roundEditorial) {
    heroHeadline = extractSection(roundEditorial.body, "MANCHETE")
    heroLead = extractSection(roundEditorial.body, "LIDE")
  }

  // Brasileirão insight: biggest deltaPTS
  const biggestSwing = [...standings].sort((a, b) => Math.abs(b.deltaPTS) - Math.abs(a.deltaPTS))[0]
  let brasileiraoInsight = ""
  if (biggestSwing) {
    const pos = standings.findIndex(s => s.team === biggestSwing.team) + 1
    if (biggestSwing.deltaPTS > 0) {
      brasileiraoInsight = `${biggestSwing.team} (${pos}º) tem ±PTS de +${biggestSwing.deltaPTS.toFixed(1)} — pontua acima do esperado`
    } else {
      brasileiraoInsight = `${biggestSwing.team} (${pos}º) tem ±PTS de ${biggestSwing.deltaPTS.toFixed(1)} — merecia mais pontos`
    }
  }

  // Copa do Brasil: next pending match
  const phases = ["Final", "Semifinal", "Quartas de Final", "Oitavas de Final", "3a Fase", "2a Fase", "1a Fase"]
  const activePhase = phases.find(p => copaGames.some(g => g.fase === p && g.status !== "FT"))
    || phases.find(p => copaGames.some(g => g.fase === p)) || ""
  const nextCopaGame = copaGames
    .filter(g => g.fase === activePhase && g.status !== "FT")
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  // Copa do Mundo: Brazil info
  const brazil = wcGroups.find(g => g.team_name.includes("Brazil"))

  // Cartola: top 3
  const topCartola = cartolaPlayers.slice(0, 3)

  // Latest analyses: 3 most recent pos-jogo articles
  const latestAnalyses = articles
    .filter(a => a.type === "pos-jogo" && a.title && a.body)
    .sort((a, b) => b.published_at.localeCompare(a.published_at))
    .slice(0, 3)

  return (
    <>
      {/* HERO SECTION */}
      <section className="bg-gradient-to-br from-[#0d1117] to-[var(--color-green-dark)] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImciIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTTAgMGg2MHY2MEgweiIgZmlsbD0ibm9uZSIvPjxwYXRoIGQ9Ik0wIDYwTDYwIDAiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCBmaWxsPSJ1cmwoI2cpIiB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIi8+PC9zdmc+')] opacity-50" />
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 relative z-10">
          <span className="font-[family-name:var(--font-data)] text-[10px] font-bold tracking-[0.2em] text-[var(--color-yellow-accent)] uppercase block mb-4">
            Brasileirão 2026 · Rodada {currentRound}
          </span>
          {heroHeadline ? (
            <h1 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl md:text-6xl text-white leading-[1.1] uppercase max-w-4xl">
              {heroHeadline}
            </h1>
          ) : (
            <h1 className="font-[family-name:var(--font-heading)] text-4xl sm:text-5xl md:text-6xl text-white leading-[1.1] uppercase max-w-4xl">
              FUTEDATA — ANÁLISE DO FUTEBOL BRASILEIRO
            </h1>
          )}
          {heroLead && (
            <p className="text-lg md:text-xl text-white/80 mt-6 max-w-3xl leading-relaxed">
              {heroLead}
            </p>
          )}
          <Link
            href="/brasileirao"
            className="inline-flex items-center gap-2 bg-[var(--color-yellow-accent)] text-[#0d1117] px-6 py-3 rounded-lg font-[family-name:var(--font-heading)] text-lg tracking-wide mt-8 hover:bg-[var(--color-yellow-dark)] transition-colors"
          >
            LER ANÁLISE COMPLETA →
          </Link>
        </div>
      </section>

      {/* 4 EDITORIAL BLOCKS */}
      <section className="max-w-7xl mx-auto px-4 -mt-8 relative z-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Block 1 — Brasileirão */}
          <Link href="/brasileirao" className="group bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md hover:border-[var(--color-green-primary)] transition-all">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="font-[family-name:var(--font-data)] text-[10px] font-bold tracking-wider text-gray-400 uppercase">Brasileirão Série A</span>
            </div>
            {leader && (
              <div className="flex items-center gap-4 mb-4">
                {leaderInfo && (
                  <Image src={leaderInfo.logo} alt={leaderInfo.name} width={48} height={48} className="object-contain" />
                )}
                <div>
                  <p className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
                    {leaderInfo?.name || leader.team}
                  </p>
                  <p className="font-[family-name:var(--font-data)] text-xs text-gray-500">
                    1º lugar · {leader.points} pontos
                  </p>
                </div>
              </div>
            )}
            <p className="text-sm text-gray-600 mb-3">
              Rodada {currentRound} encerrada — {leaderInfo?.name || leader?.team} lidera com {leader?.points} pontos
            </p>
            {brasileiraoInsight && (
              <p className="font-[family-name:var(--font-data)] text-[11px] text-[var(--color-green-primary)] bg-[var(--color-green-light)] rounded-lg px-3 py-2">
                {brasileiraoInsight}
              </p>
            )}
            <span className="inline-block mt-4 text-sm font-medium text-[var(--color-green-primary)] group-hover:underline">
              Ver tabela completa →
            </span>
          </Link>

          {/* Block 2 — Copa do Brasil */}
          <Link href="/copa-brasil" className="group bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md hover:border-blue-500 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-[family-name:var(--font-data)] text-[10px] font-bold tracking-wider text-gray-400 uppercase">Copa do Brasil 2026</span>
            </div>
            {nextCopaGame ? (
              <>
                <div className="flex items-center justify-center gap-6 py-4 mb-3 bg-gray-50 rounded-lg">
                  <div className="flex flex-col items-center gap-1.5">
                    {nextCopaGame.home_logo && (
                      <Image src={nextCopaGame.home_logo} alt={nextCopaGame.home_team} width={40} height={40} className="object-contain" />
                    )}
                    <span className="font-[family-name:var(--font-data)] text-[11px] text-gray-700 font-medium">{nextCopaGame.home_team}</span>
                  </div>
                  <span className="font-[family-name:var(--font-heading)] text-xl text-gray-300">VS</span>
                  <div className="flex flex-col items-center gap-1.5">
                    {nextCopaGame.away_logo && (
                      <Image src={nextCopaGame.away_logo} alt={nextCopaGame.away_team} width={40} height={40} className="object-contain" />
                    )}
                    <span className="font-[family-name:var(--font-data)] text-[11px] text-gray-700 font-medium">{nextCopaGame.away_team}</span>
                  </div>
                </div>
                <p className="font-[family-name:var(--font-data)] text-[11px] text-gray-500">
                  {activePhase} · {new Date(nextCopaGame.date).toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })}
                </p>
              </>
            ) : (
              <p className="text-sm text-gray-600 py-4">
                {activePhase ? `${activePhase} em andamento` : "Aguardando confrontos"}
              </p>
            )}
            <span className="inline-block mt-4 text-sm font-medium text-blue-600 group-hover:underline">
              Ver chaveamento →
            </span>
          </Link>

          {/* Block 3 — Copa do Mundo 2026 */}
          <Link href="/copa-mundo-2026" className="group bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md hover:border-[var(--color-yellow-accent)] transition-all">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-[var(--color-yellow-accent)]" />
              <span className="font-[family-name:var(--font-data)] text-[10px] font-bold tracking-wider text-gray-400 uppercase">Copa do Mundo 2026</span>
            </div>
            <div className="flex items-center gap-6 py-3">
              <Countdown targetDate="2026-06-11T00:00:00Z" />
              <div>
                {brazil ? (
                  <>
                    <p className="text-sm text-gray-700 font-medium">
                      Brasil no Grupo {brazil.group_name.replace("Group ", "")}
                    </p>
                    <p className="font-[family-name:var(--font-data)] text-[11px] text-gray-500">
                      {brazil.rank}º lugar · {brazil.points} pontos · {brazil.played} jogos
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-gray-600">
                    EUA, México e Canadá 2026
                  </p>
                )}
              </div>
            </div>
            <span className="inline-block mt-4 text-sm font-medium text-[var(--color-yellow-dark)] group-hover:underline">
              Ver grupos e probabilidades →
            </span>
          </Link>

          {/* Block 4 — Cartola FC */}
          <Link href="/cartola" className="group bg-white border border-gray-200 rounded-xl shadow-sm p-6 hover:shadow-md hover:border-purple-500 transition-all">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="font-[family-name:var(--font-data)] text-[10px] font-bold tracking-wider text-gray-400 uppercase">Cartola FC</span>
            </div>
            <p className="text-sm text-gray-700 font-medium mb-3">
              Rodada {currentRound}: quem escalar?
            </p>
            {topCartola.length > 0 ? (
              <div className="space-y-2">
                {topCartola.map((p, i) => (
                  <div key={p.id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                    <span className="font-[family-name:var(--font-heading)] text-lg text-gray-300 w-5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-[family-name:var(--font-data)] text-[11px] text-gray-900 font-medium truncate">{p.apelido}</p>
                      <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">{p.posicao} · {p.clube}</p>
                    </div>
                    <span className="font-[family-name:var(--font-heading)] text-lg text-purple-600">{p.media_pontos.toFixed(1)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 py-4">Dados do Cartola em breve</p>
            )}
            <span className="inline-block mt-4 text-sm font-medium text-purple-600 group-hover:underline">
              Ver ranking completo →
            </span>
          </Link>
        </div>
      </section>

      {/* ÚLTIMAS ANÁLISES */}
      {latestAnalyses.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 mt-12">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900 mb-6 uppercase">Últimas Análises</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {latestAnalyses.map(article => {
              const sentences = article.body.split(/\.\s+/).filter(Boolean)
              const preview = sentences.slice(0, 2).join(". ") + (sentences.length > 2 ? "." : "")
              const date = new Date(article.published_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
              return (
                <Link key={article.id} href="/brasileirao" className="group bg-white border border-gray-200 rounded-xl shadow-sm p-5 hover:shadow-md transition-all">
                  <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 mb-2">{date}</p>
                  <h3 className="font-medium text-gray-900 text-sm leading-snug mb-2 group-hover:text-[var(--color-green-primary)] transition-colors line-clamp-2">
                    {article.title}
                  </h3>
                  <p className="text-xs text-gray-500 leading-relaxed line-clamp-3">{preview}</p>
                </Link>
              )
            })}
          </div>
        </section>
      )}

      {/* FOOTER TAGLINE */}
      <section className="max-w-7xl mx-auto px-4 mt-16 mb-8">
        <div className="border-t border-gray-200 pt-10">
          <p className="font-[family-name:var(--font-heading)] text-xl md:text-2xl text-gray-900 text-center uppercase max-w-2xl mx-auto leading-tight">
            O único site que transforma dados do futebol brasileiro em análise real
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mt-6">
            {[
              { href: "/brasileirao", label: "Brasileirão" },
              { href: "/times", label: "Times" },
              { href: "/rankings", label: "Rankings" },
              { href: "/comparar", label: "Comparador" },
              { href: "/cartola", label: "Cartola FC" },
              { href: "/copa-brasil", label: "Copa do Brasil" },
              { href: "/copa-mundo-2026", label: "Copa 2026" },
            ].map(link => (
              <Link key={link.href} href={link.href} className="font-[family-name:var(--font-data)] text-xs text-gray-400 hover:text-[var(--color-green-primary)] transition-colors">
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  )
}
