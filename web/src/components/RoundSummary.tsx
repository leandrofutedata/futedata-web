"use client"

import { useState, useEffect, useMemo } from "react"
import type { Game } from "@/lib/types"
import { parseRoundNumber } from "@/lib/calculations"

interface RoundSummaryProps {
  roundNumber: number
  games: Game[]
  initialAnalysis?: string
  initialRound?: number
}

interface ParsedAnalysis {
  title: string
  highlights: string[]
  hiddenInsight: string
}

function parseAnalysis(raw: string): ParsedAnalysis {
  const lines = raw.split('\n').map(l => l.trim()).filter(Boolean)

  let title = ""
  const highlights: string[] = []
  let hiddenInsight = ""

  for (const line of lines) {
    if (line.startsWith("TITULO:") || line.startsWith("TÍTULO:")) {
      title = line.replace(/^T[IÍ]TULO:\s*/i, "")
    } else if (line.match(/^DESTAQUE\s*\d/i)) {
      highlights.push(line.replace(/^DESTAQUE\s*\d+:\s*/i, ""))
    } else if (line.match(/^JOGADA/i)) {
      hiddenInsight = line.replace(/^JOGADA\s*(DOS\s*DADOS)?:\s*/i, "")
    }
  }

  // Fallback: if parsing fails, use whole text
  if (!title && !highlights.length) {
    const sentences = raw.split(/\.\s+/).filter(Boolean)
    title = sentences[0] ? sentences[0] + '.' : raw.slice(0, 80)
    for (let i = 1; i < Math.min(4, sentences.length); i++) {
      highlights.push(sentences[i] + '.')
    }
    if (sentences.length > 4) {
      hiddenInsight = sentences.slice(4).join('. ') + '.'
    }
  }

  return { title, highlights: highlights.slice(0, 3), hiddenInsight }
}

function getRoundData(games: Game[], roundNumber: number): string {
  const roundGames = games.filter(g =>
    g.status === "FT" && parseRoundNumber(g.round) === roundNumber
  )

  if (roundGames.length === 0) return ""

  return roundGames.map(g => {
    const hg = g.home_goals ?? 0
    const ag = g.away_goals ?? 0
    const hxg = g.home_xg?.toFixed(1) ?? '?'
    const axg = g.away_xg?.toFixed(1) ?? '?'
    return `${g.home_team} ${hg}x${ag} ${g.away_team} (xG: ${hxg} vs ${axg})`
  }).join('\n')
}

export function RoundSummary({ roundNumber, games, initialAnalysis, initialRound }: RoundSummaryProps) {
  const [analysis, setAnalysis] = useState(initialAnalysis || "")
  const [loading, setLoading] = useState(false)
  const [fetchedRound, setFetchedRound] = useState(initialRound || 0)

  const roundGames = useMemo(() =>
    games.filter(g => g.status === "FT" && parseRoundNumber(g.round) === roundNumber),
    [games, roundNumber]
  )

  // Fetch analysis when round changes (and it's not the initial round)
  useEffect(() => {
    if (roundNumber === fetchedRound) return
    if (roundGames.length === 0) {
      setAnalysis("")
      return
    }

    setLoading(true)
    const data = getRoundData(games, roundNumber)
    if (!data) {
      setLoading(false)
      setAnalysis("")
      return
    }

    fetch("/api/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: `round-summary-${roundNumber}`,
        dataContext: `Resultados da Rodada ${roundNumber} do Brasileirão 2026:\n${data}\n\nEscreva uma análise editorial da rodada no formato EXATO abaixo:\nTITULO: [título forte e opinativo em 1 frase, não neutro]\nDESTAQUE 1: [resultado + dado xG + interpretação em 2 frases]\nDESTAQUE 2: [resultado + dado xG + interpretação em 2 frases]\nDESTAQUE 3: [resultado + dado xG + interpretação em 2 frases]\nJOGADA DOS DADOS: [algo que os números revelam que passou despercebido, 2 frases]`,
        maxTokens: 500,
        systemPrompt: `Você é o editor-chefe de uma revista de dados do futebol brasileiro.
Regras:
- SIGA O FORMATO EXATAMENTE como pedido (TITULO:, DESTAQUE 1:, etc.)
- Tom de colunista inteligente e provocativo
- SEMPRE cite dados concretos (placar, xG, diferença)
- Português brasileiro natural
- Sem aspas, sem emojis`,
      }),
    })
      .then(r => r.json())
      .then(data => {
        setAnalysis(data.insight || "")
        setFetchedRound(roundNumber)
      })
      .catch(() => setAnalysis(""))
      .finally(() => setLoading(false))
  }, [roundNumber, roundGames.length, games, fetchedRound])

  if (roundGames.length === 0) return null

  const parsed = analysis ? parseAnalysis(analysis) : null

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900">
            RESUMO DA RODADA {roundNumber}
          </h2>
          <span className="font-[family-name:var(--font-data)] text-[10px] text-[var(--color-green-primary)] bg-[var(--color-green-light)] px-2 py-0.5 rounded-full font-medium">
            IA
          </span>
        </div>
      </div>

      {loading ? (
        <div className="p-6 space-y-3 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-3/4" />
          <div className="h-3 bg-gray-200 rounded w-full" />
          <div className="h-3 bg-gray-200 rounded w-5/6" />
          <div className="h-3 bg-gray-200 rounded w-4/6" />
        </div>
      ) : parsed ? (
        <div className="p-6">
          {/* Title */}
          {parsed.title && (
            <h3 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900 mb-4 leading-tight uppercase">
              {parsed.title}
            </h3>
          )}

          {/* Highlights */}
          {parsed.highlights.length > 0 && (
            <div className="space-y-3 mb-5">
              {parsed.highlights.map((h, i) => (
                <div key={i} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-[var(--color-green-primary)] text-white flex items-center justify-center font-[family-name:var(--font-data)] text-[10px] font-bold mt-0.5">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed">{h}</p>
                </div>
              ))}
            </div>
          )}

          {/* Hidden insight */}
          {parsed.hiddenInsight && (
            <div className="bg-[var(--color-green-light)] border border-[var(--color-green-primary)]/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1.5">
                <svg className="w-4 h-4 text-[var(--color-green-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span className="font-[family-name:var(--font-data)] text-[10px] uppercase tracking-wider text-[var(--color-green-primary)] font-bold">
                  Jogada dos dados
                </span>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed">{parsed.hiddenInsight}</p>
            </div>
          )}
        </div>
      ) : (
        <div className="p-6 text-center">
          <p className="text-sm text-gray-400">Análise não disponível para esta rodada.</p>
        </div>
      )}
    </div>
  )
}
