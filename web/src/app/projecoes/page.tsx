import type { Metadata } from "next"
import { fetchAllGames, fetchCopaBrasilGames, fetchWcTeamStats, fetchWcGroups } from "@/lib/data"
import { calcStandings } from "@/lib/calculations"
import { Breadcrumb } from "@/components/Breadcrumb"
import { SeeAlso } from "@/components/SeeAlso"
import { ProjecoesClient } from "@/components/ProjecoesClient"

export const metadata: Metadata = {
  title: "Projeções 2026 — Brasileirão, Copa do Brasil e Copa do Mundo | Futedata",
  description: "Projeções de final de temporada do Brasileirão, probabilidades de classificação na Copa do Brasil e simulação da Copa do Mundo 2026.",
  openGraph: {
    title: "Projeções 2026 — Brasileirão, Copa do Brasil e Copa do Mundo | Futedata",
    description: "Projeções baseadas em dados reais: xPTS, modelo de 4 fatores e ranking FIFA.",
    images: [{ url: "/api/og?title=PROJE%C3%87%C3%95ES+2026&subtitle=Brasileir%C3%A3o%2C+Copa+do+Brasil+e+Copa+do+Mundo", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Projeções 2026 — Brasileirão, Copa do Brasil e Copa do Mundo",
    description: "Projeções de final de temporada baseadas em xPTS e modelo de 4 fatores.",
  },
}

export const revalidate = 60

export default async function ProjecoesPage() {
  const [games, copaGames, wcTeamStats, wcGroups] = await Promise.all([
    fetchAllGames(),
    fetchCopaBrasilGames(),
    fetchWcTeamStats(),
    fetchWcGroups(),
  ])

  const standings = calcStandings(games)

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumb items={[{ label: "Projeções" }]} />
      </div>
      <ProjecoesClient
        standings={standings}
        copaGames={copaGames}
        wcTeamStats={wcTeamStats}
        wcGroups={wcGroups}
      />
      <div className="max-w-7xl mx-auto px-4">
        <SeeAlso items={[
          { href: "/brasileirao", title: "Brasileirão 2026", description: "Classificação, jogos e análises do Brasileirão" },
          { href: "/copa-brasil", title: "Copa do Brasil", description: "Confrontos, probabilidades e chaveamento" },
          { href: "/copa-mundo-2026", title: "Copa do Mundo 2026", description: "Grupos, probabilidades e calendário" },
        ]} />
      </div>
    </>
  )
}
