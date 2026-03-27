"use client"

import { useState, useMemo, useEffect } from "react"
import Image from "next/image"

interface H2HGame {
  id: number
  round?: string
  date: string
  homeTeam: string
  awayTeam: string
  homeGoals: number | null
  awayGoals: number | null
  homeTeamId?: number
  awayTeamId?: number
  league?: string
  isHome: boolean
}

interface TeamH2HInfo {
  name: string
  apiName: string
  apiId: number
  logo: string
}

interface OpponentInfo extends TeamH2HInfo {
  slug: string
}

interface HeadToHeadProps {
  team: TeamH2HInfo
  opponents: OpponentInfo[]
  currentSeasonGames: H2HGame[]
}

type VenueFilter = "all" | "home" | "away"

export function HeadToHead({ team, opponents, currentSeasonGames }: HeadToHeadProps) {
  const [selectedOpp, setSelectedOpp] = useState<string>("")
  const [venueFilter, setVenueFilter] = useState<VenueFilter>("all")
  const [historicalGames, setHistoricalGames] = useState<H2HGame[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState("")

  const oppInfo = opponents.find(o => o.apiName === selectedOpp)

  // Fetch historical data when opponent changes
  useEffect(() => {
    if (!selectedOpp || !oppInfo) {
      setHistoricalGames([])
      return
    }

    const currentGames = currentSeasonGames.filter(g =>
      (g.homeTeam === team.apiName && g.awayTeam === selectedOpp) ||
      (g.awayTeam === team.apiName && g.homeTeam === selectedOpp)
    )

    if (currentGames.length < 5) {
      setLoading(true)
      fetch(`/api/h2h?team1=${team.apiId}&team2=${oppInfo.apiId}`)
        .then(r => r.json())
        .then(data => {
          const games: H2HGame[] = (data.games || []).map((g: { id: number; date: string; homeTeamId: number; awayTeamId: number; homeTeam: string; awayTeam: string; homeGoals: number | null; awayGoals: number | null; league: string }) => ({
            ...g,
            isHome: g.homeTeamId === team.apiId,
          }))
          setHistoricalGames(games)
        })
        .catch(() => setHistoricalGames([]))
        .finally(() => setLoading(false))
    } else {
      setHistoricalGames([])
    }
  }, [selectedOpp, oppInfo, team.apiId, team.apiName, currentSeasonGames])

  // Merge and deduplicate games
  const allGames = useMemo(() => {
    if (!selectedOpp) return []

    const currentH2H = currentSeasonGames.filter(g =>
      (g.homeTeam === team.apiName && g.awayTeam === selectedOpp) ||
      (g.awayTeam === team.apiName && g.homeTeam === selectedOpp)
    )

    const idSet = new Set(currentH2H.map(g => g.id))
    const merged = [
      ...currentH2H,
      ...historicalGames.filter(g => !idSet.has(g.id)),
    ]

    return merged
      .filter(g => {
        if (g.homeGoals === null || g.awayGoals === null) return false
        if (venueFilter === "home") return g.isHome
        if (venueFilter === "away") return !g.isHome
        return true
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [currentSeasonGames, historicalGames, selectedOpp, venueFilter, team.apiName])

  // Stats
  const stats = useMemo(() => {
    let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0
    let maxGoals = 0, maxGoalsGame: H2HGame | null = null
    let biggestWin = 0, biggestWinGame: H2HGame | null = null

    for (const g of allGames) {
      const tGoals = g.isHome ? g.homeGoals! : g.awayGoals!
      const oGoals = g.isHome ? g.awayGoals! : g.homeGoals!
      gf += tGoals
      ga += oGoals

      const totalGoals = tGoals + oGoals
      if (totalGoals > maxGoals) {
        maxGoals = totalGoals
        maxGoalsGame = g
      }

      if (tGoals > oGoals) {
        wins++
        const diff = tGoals - oGoals
        if (diff > biggestWin) {
          biggestWin = diff
          biggestWinGame = g
        }
      } else if (tGoals < oGoals) {
        losses++
      } else {
        draws++
      }
    }

    const total = wins + draws + losses
    return {
      wins, draws, losses, gf, ga, total,
      avgGoals: total > 0 ? (gf + ga) / total : 0,
      maxGoalsGame,
      biggestWinGame,
    }
  }, [allGames])

  const filteredOpponents = search.trim().length > 0
    ? opponents.filter(o => o.name.toLowerCase().includes(search.toLowerCase()))
    : opponents

  function selectOpponent(apiName: string) {
    setSelectedOpp(apiName)
    setVenueFilter("all")
    setSearch("")
  }

  function formatScore(g: H2HGame, forTeam: boolean): string {
    if (forTeam) {
      const t = g.isHome ? g.homeGoals! : g.awayGoals!
      const o = g.isHome ? g.awayGoals! : g.homeGoals!
      return `${t} × ${o}`
    }
    return `${g.homeGoals} × ${g.awayGoals}`
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">CONFRONTOS DIRETOS</h2>

      {/* Search + opponent selector */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar adversário..."
          className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 mb-3 focus:outline-none focus:border-[var(--color-green-primary)] focus:ring-1 focus:ring-[var(--color-green-primary)]"
        />
        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
          {filteredOpponents.map(opp => (
            <button
              key={opp.apiName}
              onClick={() => selectOpponent(opp.apiName)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                selectedOpp === opp.apiName
                  ? "bg-[var(--color-green-primary)] text-white shadow-sm"
                  : "bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-100"
              }`}
            >
              <Image src={opp.logo} alt="" width={16} height={16} className="object-contain" />
              {opp.name}
            </button>
          ))}
        </div>
      </div>

      {selectedOpp && oppInfo && (
        <>
          {/* Header with logos */}
          <div className="flex items-center justify-center gap-6 py-5 mb-5 bg-gray-50 rounded-xl">
            <div className="flex flex-col items-center gap-2">
              <Image src={team.logo} alt={team.name} width={52} height={52} className="object-contain" />
              <span className="font-[family-name:var(--font-heading)] text-sm">{team.name}</span>
            </div>
            <span className="font-[family-name:var(--font-heading)] text-2xl text-gray-300">VS</span>
            <div className="flex flex-col items-center gap-2">
              <Image src={oppInfo.logo} alt={oppInfo.name} width={52} height={52} className="object-contain" />
              <span className="font-[family-name:var(--font-heading)] text-sm">{oppInfo.name}</span>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-6">
              <div className="w-5 h-5 border-2 border-[var(--color-green-primary)] border-t-transparent rounded-full animate-spin" />
              <span className="ml-2 text-sm text-gray-400">Buscando histórico...</span>
            </div>
          )}

          {!loading && stats.total > 0 && (
            <>
              {/* Record summary */}
              <div className="grid grid-cols-5 gap-1.5 mb-4">
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 uppercase">Jogos</p>
                  <p className="font-[family-name:var(--font-heading)] text-xl text-gray-900">{stats.total}</p>
                </div>
                <div className="text-center p-2 bg-green-50 rounded-lg">
                  <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 uppercase">V</p>
                  <p className="font-[family-name:var(--font-heading)] text-xl text-green-600">{stats.wins}</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 uppercase">E</p>
                  <p className="font-[family-name:var(--font-heading)] text-xl text-gray-500">{stats.draws}</p>
                </div>
                <div className="text-center p-2 bg-red-50 rounded-lg">
                  <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 uppercase">D</p>
                  <p className="font-[family-name:var(--font-heading)] text-xl text-red-500">{stats.losses}</p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded-lg">
                  <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 uppercase">Gols</p>
                  <p className="font-[family-name:var(--font-heading)] text-lg text-gray-900">{stats.gf}×{stats.ga}</p>
                </div>
              </div>

              {/* Visual bar */}
              <div className="flex h-3 rounded-full overflow-hidden mb-4">
                {stats.wins > 0 && <div className="bg-green-500 transition-all" style={{ width: `${(stats.wins / stats.total) * 100}%` }} />}
                {stats.draws > 0 && <div className="bg-gray-300 transition-all" style={{ width: `${(stats.draws / stats.total) * 100}%` }} />}
                {stats.losses > 0 && <div className="bg-red-400 transition-all" style={{ width: `${(stats.losses / stats.total) * 100}%` }} />}
              </div>

              {/* Filter buttons */}
              <div className="flex gap-2 mb-4">
                {([
                  { key: "all" as VenueFilter, label: "Todos" },
                  { key: "home" as VenueFilter, label: "Mandante" },
                  { key: "away" as VenueFilter, label: "Visitante" },
                ]).map(f => (
                  <button
                    key={f.key}
                    onClick={() => setVenueFilter(f.key)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-[family-name:var(--font-data)] font-medium transition-colors ${
                      venueFilter === f.key
                        ? "bg-[var(--color-green-primary)] text-white"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Stats summary */}
              <div className="grid grid-cols-3 gap-2 mb-5">
                <div className="bg-gray-50 rounded-lg p-3 text-center">
                  <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 uppercase">Média gols</p>
                  <p className="font-[family-name:var(--font-heading)] text-lg text-gray-900">{stats.avgGoals.toFixed(1)}</p>
                  <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">por jogo</p>
                </div>
                {stats.maxGoalsGame && (
                  <div className="bg-gray-50 rounded-lg p-3 text-center">
                    <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 uppercase">+ gols</p>
                    <p className="font-[family-name:var(--font-heading)] text-lg text-gray-900">
                      {formatScore(stats.maxGoalsGame, false)}
                    </p>
                    <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">
                      {new Date(stats.maxGoalsGame.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </p>
                  </div>
                )}
                {stats.biggestWinGame && (
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 uppercase">Maior vitória</p>
                    <p className="font-[family-name:var(--font-heading)] text-lg text-green-600">
                      {formatScore(stats.biggestWinGame, true)}
                    </p>
                    <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">
                      {new Date(stats.biggestWinGame.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </p>
                  </div>
                )}
              </div>

              {/* Game list */}
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {allGames.map((g) => {
                  const tGoals = g.isHome ? g.homeGoals! : g.awayGoals!
                  const oGoals = g.isHome ? g.awayGoals! : g.homeGoals!
                  const result = tGoals > oGoals ? 'V' : tGoals < oGoals ? 'D' : 'E'
                  return (
                    <div key={g.id} className="flex items-center gap-2 py-2 border-b border-gray-50 last:border-0">
                      <span className={`${result === 'V' ? 'bg-green-500' : result === 'D' ? 'bg-red-500' : 'bg-gray-400'} w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold font-[family-name:var(--font-data)]`}>
                        {result}
                      </span>
                      <span className="font-[family-name:var(--font-heading)] text-sm text-gray-900 w-14 text-center">
                        {g.homeGoals} × {g.awayGoals}
                      </span>
                      <span className={`font-[family-name:var(--font-data)] text-[10px] px-1.5 py-0.5 rounded ${g.isHome ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                        {g.isHome ? 'Casa' : 'Fora'}
                      </span>
                      {g.league && (
                        <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 truncate hidden sm:block">
                          {g.league}
                        </span>
                      )}
                      <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-300 ml-auto whitespace-nowrap">
                        {new Date(g.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                      </span>
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {!loading && stats.total === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">
              Nenhum confronto encontrado contra {oppInfo.name}.
            </p>
          )}
        </>
      )}

      {!selectedOpp && (
        <p className="text-sm text-gray-400 text-center py-2">Selecione um adversário acima para ver o histórico de confrontos.</p>
      )}
    </div>
  )
}
