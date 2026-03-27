"use client"

import { useState, useMemo } from "react"

interface H2HGame {
  id: number
  round: string
  date: string
  homeTeam: string
  awayTeam: string
  homeGoals: number | null
  awayGoals: number | null
  isHome: boolean
}

interface H2HProps {
  teamApiName: string
  teamName: string
  games: H2HGame[]
  opponents: { apiName: string; name: string; slug: string }[]
}

export function HeadToHead({ teamApiName, teamName, games, opponents }: H2HProps) {
  const [selectedOpp, setSelectedOpp] = useState<string>("")

  const h2hGames = useMemo(() => {
    if (!selectedOpp) return []
    return games
      .filter(g => {
        const isTeamHome = g.homeTeam === teamApiName
        const isTeamAway = g.awayTeam === teamApiName
        const isOppHome = g.homeTeam === selectedOpp
        const isOppAway = g.awayTeam === selectedOpp
        return (isTeamHome && isOppAway) || (isTeamAway && isOppHome)
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [selectedOpp, games, teamApiName])

  const stats = useMemo(() => {
    let wins = 0, draws = 0, losses = 0, gf = 0, ga = 0
    for (const g of h2hGames) {
      if (g.homeGoals === null || g.awayGoals === null) continue
      const teamGoals = g.isHome ? g.homeGoals : g.awayGoals
      const oppGoals = g.isHome ? g.awayGoals : g.homeGoals
      gf += teamGoals
      ga += oppGoals
      if (teamGoals > oppGoals) wins++
      else if (teamGoals < oppGoals) losses++
      else draws++
    }
    return { wins, draws, losses, gf, ga, total: wins + draws + losses }
  }, [h2hGames])

  const oppInfo = opponents.find(o => o.apiName === selectedOpp)

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">CONFRONTOS DIRETOS</h2>

      <select
        value={selectedOpp}
        onChange={(e) => setSelectedOpp(e.target.value)}
        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm bg-white font-[family-name:var(--font-data)] mb-4 focus:outline-none focus:ring-2 focus:ring-[var(--color-green-primary)]/30 focus:border-[var(--color-green-primary)]"
      >
        <option value="">Selecione o adversário...</option>
        {opponents.map(opp => (
          <option key={opp.apiName} value={opp.apiName}>{opp.name}</option>
        ))}
      </select>

      {selectedOpp && stats.total > 0 && (
        <>
          {/* Record summary */}
          <div className="grid grid-cols-5 gap-1 mb-4">
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

          {/* Visual win/draw/loss bar */}
          {stats.total > 0 && (
            <div className="flex h-3 rounded-full overflow-hidden mb-4">
              {stats.wins > 0 && <div className="bg-green-500" style={{ width: `${(stats.wins / stats.total) * 100}%` }} />}
              {stats.draws > 0 && <div className="bg-gray-300" style={{ width: `${(stats.draws / stats.total) * 100}%` }} />}
              {stats.losses > 0 && <div className="bg-red-400" style={{ width: `${(stats.losses / stats.total) * 100}%` }} />}
            </div>
          )}

          {/* Game list */}
          <div className="space-y-1.5">
            {h2hGames.filter(g => g.homeGoals !== null).map((g) => {
              const teamGoals = g.isHome ? g.homeGoals! : g.awayGoals!
              const oppGoals = g.isHome ? g.awayGoals! : g.homeGoals!
              const result = teamGoals > oppGoals ? 'V' : teamGoals < oppGoals ? 'D' : 'E'
              return (
                <div key={g.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                  <span className={`${result === 'V' ? 'bg-green-500' : result === 'D' ? 'bg-red-500' : 'bg-gray-400'} w-5 h-5 rounded flex items-center justify-center text-white text-[10px] font-bold font-[family-name:var(--font-data)]`}>{result}</span>
                  <span className="font-[family-name:var(--font-heading)] text-sm text-gray-900">{teamGoals} × {oppGoals}</span>
                  <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">{g.isHome ? 'Casa' : 'Fora'}</span>
                  <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-300 ml-auto">
                    {new Date(g.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {selectedOpp && stats.total === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">Nenhum confronto encontrado contra {oppInfo?.name || selectedOpp} nesta temporada.</p>
      )}

      {!selectedOpp && (
        <p className="text-sm text-gray-400 text-center py-4">Escolha um adversário para ver o histórico.</p>
      )}
    </div>
  )
}
