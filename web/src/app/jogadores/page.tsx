import { fetchAllGames } from "@/lib/data"
import { JogadoresClient } from "@/components/JogadoresClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Jogadores — Futedata",
  description: "Ranking de goleadores e estatísticas individuais do Brasileirão Série A.",
}

export const revalidate = 60

export default async function JogadoresPage() {
  const games = await fetchAllGames()
  return <JogadoresClient games={games} />
}
