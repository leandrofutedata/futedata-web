"use client"

import { useState, useEffect, useMemo } from "react"
import type { Game, TeamStanding } from "@/lib/types"
import { parseRoundNumber, estimarXG, estimarXGA, calcXPTS } from "@/lib/calculations"

interface TeamSpotlightProps {
  team: TeamStanding
  position: number
  games?: Game[]
  standings?: TeamStanding[]
}

interface RoundEvolution {
  round: number
  cumulativePTS: number
  cumulativeXPTS: number
}

function calcEvolution(games: Game[], teamName: string): RoundEvolution[] {
  const teamGames = games
    .filter(g => g.status === "FT" && (g.home_team === teamName || g.away_team === teamName))
    .sort((a, b) => parseRoundNumber(a.round) - parseRoundNumber(b.round))

  let totalPTS = 0
  let totalGF = 0
  let totalGC = 0
  let played = 0
  const evolution: RoundEvolution[] = []

  for (const g of teamGames) {
    const isHome = g.home_team === teamName
    const gf = isHome ? (g.home_goals ?? 0) : (g.away_goals ?? 0)
    const gc = isHome ? (g.away_goals ?? 0) : (g.home_goals ?? 0)

    played++
    totalGF += gf
    totalGC += gc

    if (gf > gc) totalPTS += 3
    else if (gf === gc) totalPTS += 1

    const xG = estimarXG(totalGF, played)
    const xGA = estimarXGA(totalGC, played)
    const xPTS = calcXPTS(xG, xGA, played)

    evolution.push({
      round: parseRoundNumber(g.round),
      cumulativePTS: totalPTS,
      cumulativeXPTS: Math.round(xPTS * 10) / 10,
    })
  }

  return evolution.slice(-8)
}

function getNextOpponent(games: Game[], teamName: string, standings: TeamStanding[]): { opponent: string; date: string; isHome: boolean; opponentPosition: number } | null {
  const next = games
    .filter(g => g.status === "NS" && (g.home_team === teamName || g.away_team === teamName))
    .sort((a, b) => a.date.localeCompare(b.date))[0]

  if (!next) return null

  const isHome = next.home_team === teamName
  const opponent = isHome ? next.away_team : next.home_team
  const opponentPosition = standings.findIndex(s => s.team === opponent) + 1

  return { opponent, date: next.date, isHome, opponentPosition }
}

function getFormContext(form: ("W" | "D" | "L")[]): string {
  if (form.length === 0) return ""
  const wins = form.filter(f => f === "W").length
  const losses = form.filter(f => f === "L").length
  const draws = form.filter(f => f === "D").length

  // Streak detection
  const lastResult = form[0]
  let streak = 1
  for (let i = 1; i < form.length; i++) {
    if (form[i] === lastResult) streak++
    else break
  }

  if (lastResult === "W" && streak >= 3) return `${streak} vitórias seguidas — momento excelente`
  if (lastResult === "L" && streak >= 3) return `${streak} derrotas seguidas — momento de crise`
  if (lastResult === "D" && streak >= 3) return `${streak} empates seguidos — falta poder de decisão`
  if (wins >= 4) return `${wins} vitórias nos últimos 5 jogos — em grande fase`
  if (losses >= 4) return `${losses} derrotas nos últimos 5 jogos — fase muito difícil`
  if (wins === 0) return `Sem vitórias nos últimos ${form.length} jogos — preocupante`
  if (losses === 0 && wins >= 2) return `Invicto nos últimos ${form.length} jogos — regularidade`
  if (draws >= 3) return `${draws} empates em ${form.length} jogos — falta convicção`
  return `${wins}V ${draws}E ${losses}D nos últimos ${form.length} — irregular`
}

export function TeamSpotlight({ team, position, games, standings }: TeamSpotlightProps) {
  const [aiInsight, setAiInsight] = useState("")
  const [loadingInsight, setLoadingInsight] = useState(false)

  const xgPerGame = team.played > 0 ? team.xG / team.played : 0
  const xgaPerGame = team.played > 0 ? team.xGA / team.played : 0
  const goalsPerGame = team.played > 0 ? team.goalsFor / team.played : 0
  const gcPerGame = team.played > 0 ? team.goalsAgainst / team.played : 0

  const evolution = useMemo(() => {
    if (!games) return []
    return calcEvolution(games, team.team)
  }, [games, team.team])

  const nextOpponent = useMemo(() => {
    if (!games || !standings) return null
    return getNextOpponent(games, team.team, standings)
  }, [games, team.team, standings])

  const formContext = useMemo(() => getFormContext(team.form), [team.form])

  // Fetch AI insight on mount
  useEffect(() => {
    setLoadingInsight(true)
    const dataContext = `Analise o momento do ${team.team} no Brasileirão 2026:
- Posição: ${position}º lugar
- ${team.points} pontos em ${team.played} jogos (${team.wins}V ${team.draws}E ${team.losses}D)
- Gols: ${team.goalsFor} marcados, ${team.goalsAgainst} sofridos (SG ${team.goalDifference > 0 ? '+' : ''}${team.goalDifference})
- xG: ${team.xG.toFixed(1)}, xGA: ${team.xGA.toFixed(1)}, xPTS: ${team.xPTS.toFixed(1)}
- ±PTS: ${team.deltaPTS > 0 ? '+' : ''}${team.deltaPTS.toFixed(1)}
- Forma recente: ${team.form.join('')} (${formContext})
- xG/jogo: ${xgPerGame.toFixed(2)}, gols/jogo: ${goalsPerGame.toFixed(2)}
${nextOpponent ? `- Próximo jogo: ${nextOpponent.isHome ? 'em casa' : 'fora'} contra ${nextOpponent.opponent} (${nextOpponent.opponentPosition}º)` : ''}

Escreva 3 frases analisando o momento do time. Seja direto e opinativo.`

    fetch("/api/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: `team-spotlight-${team.team}-r${team.played}`,
        dataContext,
        maxTokens: 250,
        systemPrompt: `Você é um analista de dados do futebol brasileiro. Escreva análises curtas e diretas.
Regras:
- Exatamente 3 frases
- Tom opinativo e provocativo
- Cite números concretos
- Português brasileiro natural
- Não use aspas, bullet points ou listas`,
      }),
    })
      .then(r => r.json())
      .then(data => setAiInsight(data.insight || ""))
      .catch(() => setAiInsight(""))
      .finally(() => setLoadingInsight(false))
  }, [team, position, formContext, xgPerGame, goalsPerGame, nextOpponent])

  const maxPTS = evolution.length > 0
    ? Math.max(...evolution.map(e => Math.max(e.cumulativePTS, e.cumulativeXPTS)))
    : 1

  return (
    <div className="bg-[var(--color-green-light)] border-t border-[var(--color-green-primary)]/20 p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Column 1: Evolution chart */}
        <div>
          <h4 className="font-[family-name:var(--font-data)] text-xs text-gray-500 uppercase mb-3">
            Evolução PTS vs xPTS
          </h4>
          {evolution.length > 0 ? (
            <div className="space-y-1.5">
              {evolution.map((e) => (
                <div key={e.round} className="flex items-center gap-2">
                  <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 w-6 text-right">
                    R{e.round}
                  </span>
                  <div className="flex-1 relative h-5">
                    {/* xPTS bar (behind) */}
                    <div
                      className="absolute top-0 left-0 h-full bg-[var(--color-green-primary)]/25 rounded"
                      style={{ width: `${(e.cumulativeXPTS / maxPTS) * 100}%` }}
                    />
                    {/* PTS bar (front) */}
                    <div
                      className={`absolute top-0 left-0 h-full rounded ${
                        e.cumulativePTS >= e.cumulativeXPTS ? "bg-[var(--color-green-primary)]/70" : "bg-orange-400/70"
                      }`}
                      style={{ width: `${(e.cumulativePTS / maxPTS) * 100}%` }}
                    />
                    <div className="absolute top-0 left-0 h-full flex items-center px-1.5">
                      <span className="font-[family-name:var(--font-data)] text-[9px] font-bold text-gray-800">
                        {e.cumulativePTS}
                      </span>
                    </div>
                  </div>
                  <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 w-8">
                    x{e.cumulativeXPTS.toFixed(0)}
                  </span>
                </div>
              ))}
              <div className="flex gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <span className="w-3 h-2 rounded bg-[var(--color-green-primary)]/70" />
                  <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">PTS reais</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-3 h-2 rounded bg-[var(--color-green-primary)]/25" />
                  <span className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">xPTS</span>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400">Dados insuficientes</p>
          )}
        </div>

        {/* Column 2: Form + Next opponent */}
        <div className="space-y-4">
          <div>
            <h4 className="font-[family-name:var(--font-data)] text-xs text-gray-500 uppercase mb-3">
              Forma recente
            </h4>
            <div className="flex gap-1 mb-2">
              {team.form.map((result, i) => (
                <span
                  key={i}
                  className={`form-${result} w-7 h-7 flex items-center justify-center rounded text-xs font-[family-name:var(--font-data)] font-bold`}
                >
                  {result}
                </span>
              ))}
            </div>
            <p className="text-xs text-gray-600 leading-relaxed">{formContext}</p>
          </div>

          {/* Stats summary */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-white rounded-lg p-2.5 border border-gray-200">
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">xG/jogo</p>
              <p className="font-[family-name:var(--font-heading)] text-xl text-[var(--color-green-primary)]">{xgPerGame.toFixed(2)}</p>
              <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">Real: {goalsPerGame.toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-gray-200">
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">xGA/jogo</p>
              <p className="font-[family-name:var(--font-heading)] text-xl text-[var(--color-alert-red)]">{xgaPerGame.toFixed(2)}</p>
              <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">Real: {gcPerGame.toFixed(2)}</p>
            </div>
          </div>

          {/* Next opponent */}
          {nextOpponent && (
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase mb-1">
                Próximo adversário
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm text-gray-900">{nextOpponent.opponent}</p>
                  <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                    {nextOpponent.isHome ? "Em casa" : "Fora"} · {nextOpponent.opponentPosition}º lugar
                  </p>
                </div>
                <div className={`px-2 py-1 rounded font-[family-name:var(--font-data)] text-[10px] font-bold ${
                  nextOpponent.opponentPosition <= 6
                    ? "bg-red-100 text-red-700"
                    : nextOpponent.opponentPosition >= 17
                      ? "bg-green-100 text-green-700"
                      : "bg-yellow-100 text-yellow-700"
                }`}>
                  {nextOpponent.opponentPosition <= 6
                    ? "DIFÍCIL"
                    : nextOpponent.opponentPosition >= 17
                      ? "FAVORÁVEL"
                      : "MÉDIO"}
                </div>
              </div>
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 mt-1">
                {new Date(nextOpponent.date).toLocaleDateString("pt-BR", {
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>

        {/* Column 3: AI insight */}
        <div>
          <h4 className="font-[family-name:var(--font-data)] text-xs text-gray-500 uppercase mb-3">
            Análise do momento
          </h4>
          {loadingInsight ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-full" />
              <div className="h-3 bg-gray-200 rounded w-5/6" />
              <div className="h-3 bg-gray-200 rounded w-4/6" />
            </div>
          ) : aiInsight ? (
            <div className="border-l-4 border-[var(--color-green-primary)] pl-3">
              <p className="text-sm text-gray-700 leading-relaxed">{aiInsight}</p>
              <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 mt-2">Com base nos dados reais da temporada</p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-gray-700 leading-relaxed">
                {team.deltaPTS > 2
                  ? `${team.team} está com ${team.deltaPTS.toFixed(1)} pontos a mais do que o desempenho justifica. Pode haver uma correção nas próximas rodadas.`
                  : team.deltaPTS < -2
                    ? `${team.team} está sendo prejudicado pela sorte. Com base no xG, deveria ter ${Math.abs(team.deltaPTS).toFixed(1)} pontos a mais.`
                    : `${team.team} está com pontuação condizente com o desempenho real — ±PTS de ${team.deltaPTS > 0 ? '+' : ''}${team.deltaPTS.toFixed(1)}.`}
              </p>
            </div>
          )}

          {/* Key metric */}
          <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">±PTS</span>
              <span className={`font-[family-name:var(--font-heading)] text-2xl ${
                team.deltaPTS > 0 ? "text-orange-500" : team.deltaPTS < 0 ? "text-green-600" : "text-gray-500"
              }`}>
                {team.deltaPTS > 0 ? "+" : ""}{team.deltaPTS.toFixed(1)}
              </span>
            </div>
            <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400 mt-1">
              {team.deltaPTS > 1
                ? "Pontuando acima do esperado"
                : team.deltaPTS < -1
                  ? "Merecia mais pontos"
                  : "Pontuação justa"}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
