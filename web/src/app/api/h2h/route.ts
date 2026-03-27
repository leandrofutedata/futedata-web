import { NextRequest, NextResponse } from "next/server"

const API_KEY = "4613ae0fc3159cd262e59f9b8490f08e"

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const team1 = searchParams.get("team1")
  const team2 = searchParams.get("team2")

  if (!team1 || !team2) {
    return NextResponse.json({ error: "Missing team1 or team2 (API Football IDs)" }, { status: 400 })
  }

  try {
    const res = await fetch(
      `https://v3.football.api-sports.io/fixtures/headtohead?h2h=${team1}-${team2}&last=20`,
      {
        headers: { "x-apisports-key": API_KEY },
        next: { revalidate: 86400 },
      }
    )
    const data = await res.json()

    const games = (data.response || []).map((fix: Record<string, unknown>) => {
      const fixture = fix.fixture as Record<string, unknown>
      const teams = fix.teams as Record<string, Record<string, unknown>>
      const goals = fix.goals as Record<string, number | null>
      const league = fix.league as Record<string, unknown>

      return {
        id: fixture.id as number,
        date: fixture.date as string,
        homeTeamId: teams.home.id as number,
        awayTeamId: teams.away.id as number,
        homeTeam: teams.home.name as string,
        awayTeam: teams.away.name as string,
        homeGoals: goals.home,
        awayGoals: goals.away,
        league: league.name as string,
        season: league.season as number,
      }
    })

    return NextResponse.json({ games })
  } catch {
    return NextResponse.json({ games: [] })
  }
}
