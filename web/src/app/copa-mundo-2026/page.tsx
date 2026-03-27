import type { Metadata } from "next"
import { fetchWcGroups, fetchWcGames, fetchWcTeamStats } from "@/lib/data"
import { CopaMundoClient } from "@/components/CopaMundoClient"
import { Breadcrumb } from "@/components/Breadcrumb"
import { SeeAlso } from "@/components/SeeAlso"

export const revalidate = 3600 // 1 hour

export const metadata: Metadata = {
  title: "Copa do Mundo 2026 — Grupos e Probabilidades | Futedata",
  description: "Grupos, probabilidades, calendário e análise estatística da Copa do Mundo 2026. Quem avança? Modelo Elo preditivo.",
  openGraph: {
    title: "Copa do Mundo 2026 — Grupos e Probabilidades | Futedata",
    description: "Grupos, probabilidades e calendário completo da Copa do Mundo 2026.",
    images: [{ url: "/api/og?title=COPA+DO+MUNDO+2026&subtitle=Grupos%2C+Probabilidades+e+An%C3%A1lise", width: 1200, height: 630 }],
  },
}

export default async function CopaMundoPage() {
  const [groups, games, teamStats] = await Promise.all([
    fetchWcGroups(),
    fetchWcGames(),
    fetchWcTeamStats(),
  ])

  return (
    <>
      <div className="max-w-7xl mx-auto px-4 pt-6">
        <Breadcrumb items={[{ label: "Copa do Mundo 2026" }]} />
      </div>
      <CopaMundoClient groups={groups} games={games} teamStats={teamStats} />
      <div className="max-w-7xl mx-auto px-4">
        <SeeAlso items={[
          { href: "/projecoes", title: "Projeções", description: "Simulação de bracket e probabilidades da Copa do Mundo" },
          { href: "/brasileirao", title: "Brasileirão 2026", description: "Classificação, jogos e análises do Brasileirão" },
          { href: "/times", title: "Times", description: "Análise completa dos 20 clubes da Série A" },
        ]} />
      </div>
    </>
  )
}
