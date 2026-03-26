import { fetchAllGames, fetchPlayerStats, fetchCartolaPlayers } from "@/lib/data"
import { CartolaClient } from "@/components/CartolaClient"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cartola FC — Futedata",
  description: "Recomendacoes inteligentes para o Cartola FC baseadas em estatisticas reais do Brasileirao.",
}

export const revalidate = 60

export default async function CartolaPage() {
  const [games, playerStats, cartolaPlayers] = await Promise.all([
    fetchAllGames(),
    fetchPlayerStats(),
    fetchCartolaPlayers(),
  ])

  return (
    <CartolaClient
      games={games}
      playerStats={playerStats}
      cartolaPlayers={cartolaPlayers}
    />
  )
}
