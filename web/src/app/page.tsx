import { fetchAllGames, fetchArticles, fetchPlayerStats } from "@/lib/data"
import { HomeClient } from "@/components/HomeClient"

export const revalidate = 60

export default async function HomePage() {
  const [games, articles, playerStats] = await Promise.all([
    fetchAllGames(),
    fetchArticles(),
    fetchPlayerStats(),
  ])

  return <HomeClient games={games} articles={articles} playerStats={playerStats} />
}
