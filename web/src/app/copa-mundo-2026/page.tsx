import type { Metadata } from "next"
import { fetchWcGroups, fetchWcGames, fetchWcTeamStats } from "@/lib/data"
import { CopaMundoClient } from "@/components/CopaMundoClient"

export const revalidate = 3600 // 1 hour

export const metadata: Metadata = {
  title: "Copa do Mundo 2026 — Futedata",
  description: "Grupos, probabilidades, calendario e analise estatistica da Copa do Mundo 2026.",
}

export default async function CopaMundoPage() {
  const [groups, games, teamStats] = await Promise.all([
    fetchWcGroups(),
    fetchWcGames(),
    fetchWcTeamStats(),
  ])

  return <CopaMundoClient groups={groups} games={games} teamStats={teamStats} />
}
