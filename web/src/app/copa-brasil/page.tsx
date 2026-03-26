import { fetchCopaBrasilGames, fetchAllGames } from "@/lib/data"
import { CopaBrasilClient } from "@/components/CopaBrasilClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Copa do Brasil 2026 — Futedata",
  description: "Chaveamento, confrontos, probabilidades e analise estatistica da Copa do Brasil 2026.",
}

export const revalidate = 60

export default async function CopaBrasilPage() {
  const [copaGames, brasileiraoGames] = await Promise.all([
    fetchCopaBrasilGames(),
    fetchAllGames(),
  ])

  return <CopaBrasilClient copaGames={copaGames} brasileiraoGames={brasileiraoGames} />
}
