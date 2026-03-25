import { fetchAllGames, fetchArticles } from "@/lib/data"
import { HomeClient } from "@/components/HomeClient"

export const revalidate = 60

export default async function HomePage() {
  const [games, articles] = await Promise.all([fetchAllGames(), fetchArticles()])

  return <HomeClient games={games} articles={articles} />
}
