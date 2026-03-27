"use client"

import { useState, useEffect, useMemo } from "react"
import type { Game } from "@/lib/types"
import { parseRoundNumber, calcStandings } from "@/lib/calculations"

interface RoundSummaryProps {
  roundNumber: number
  games: Game[]
  initialAnalysis?: string
  initialRound?: number
}

interface ParsedEditorial {
  headline: string
  lead: string
  analysis: string[]
  conclusion: string
}

function extractSection(text: string, marker: string, nextMarkers: string[]): string {
  const markerNorm = marker.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
  const lines = text.split("\n")
  let capturing = false
  let content = ""

  for (const line of lines) {
    const lineNorm = line.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()

    if (lineNorm.startsWith(markerNorm + ":")) {
      capturing = true
      const afterColon = line.trim().substring(line.trim().indexOf(":") + 1).trim()
      if (afterColon) content += afterColon + "\n"
      continue
    }

    if (capturing) {
      const isNext = nextMarkers.some(nm => {
        const nmNorm = nm.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()
        return lineNorm.startsWith(nmNorm + ":") || lineNorm === nmNorm
      })
      if (isNext) break
      content += line + "\n"
    }
  }

  return content.trim()
}

function parseEditorial(raw: string): ParsedEditorial | null {
  if (!raw.trim()) return null

  const allMarkers = ["MANCHETE", "LIDE", "ANÁLISE PRINCIPAL", "ANALISE PRINCIPAL", "CONCLUSÃO", "CONCLUSAO"]

  const headline = extractSection(raw, "MANCHETE", allMarkers.filter(m => m !== "MANCHETE"))
  const lead = extractSection(raw, "LIDE", allMarkers.filter(m => m !== "LIDE"))
  const analysisRaw =
    extractSection(raw, "ANÁLISE PRINCIPAL", allMarkers.filter(m => m !== "ANÁLISE PRINCIPAL" && m !== "ANALISE PRINCIPAL")) ||
    extractSection(raw, "ANALISE PRINCIPAL", allMarkers.filter(m => m !== "ANÁLISE PRINCIPAL" && m !== "ANALISE PRINCIPAL"))
  const conclusion =
    extractSection(raw, "CONCLUSÃO", allMarkers.filter(m => m !== "CONCLUSÃO" && m !== "CONCLUSAO")) ||
    extractSection(raw, "CONCLUSAO", allMarkers.filter(m => m !== "CONCLUSÃO" && m !== "CONCLUSAO"))

  // If structured parsing found content, use it
  if (headline || lead) {
    const analysis = analysisRaw
      ? analysisRaw.split("\n\n").map(p => p.trim()).filter(Boolean)
      : []
    return { headline, lead, analysis, conclusion }
  }

  // Fallback: treat as freeform text
  const paragraphs = raw.split("\n\n").map(p => p.trim()).filter(Boolean)
  if (paragraphs.length === 0) return null
  return {
    headline: paragraphs[0].length <= 100 ? paragraphs[0] : paragraphs[0].slice(0, 100),
    lead: paragraphs[1] || "",
    analysis: paragraphs.slice(2, -1),
    conclusion: paragraphs[paragraphs.length - 1] || "",
  }
}

const EDITORIAL_SYSTEM = `Você é um colunista esportivo brasileiro especialista em estatísticas avançadas. Escreva como um colunista do The Athletic — opinativo, apaixonado, inteligente.

Regras:
- Use EXATAMENTE o formato com os marcadores: MANCHETE:, LIDE:, ANÁLISE PRINCIPAL:, CONCLUSÃO:
- NÃO liste resultados um por um — ANALISE, INTERPRETE, OPINE
- Cite dados reais: xG, xPTS, ±PTS, posição na tabela
- Português brasileiro natural e fluente
- Sem emojis, sem aspas, sem bullet points no corpo do texto
- Cada parágrafo da análise deve ter 3-5 frases
- A manchete deve ser curta (máximo 10 palavras) e provocativa, em MAIÚSCULAS`

function buildEditorialContext(roundNumber: number, roundGames: Game[], allGames: Game[]): string {
  const gamesUpTo = allGames.filter(g => g.status === "FT" && parseRoundNumber(g.round) <= roundNumber)
  const standings = calcStandings(gamesUpTo)

  const gamesText = roundGames.map(g => {
    const hg = g.home_goals ?? 0
    const ag = g.away_goals ?? 0
    const hxg = g.home_xg?.toFixed(1) ?? "?"
    const axg = g.away_xg?.toFixed(1) ?? "?"
    const hPos = standings.findIndex(s => s.team === g.home_team) + 1
    const aPos = standings.findIndex(s => s.team === g.away_team) + 1
    return `${g.home_team} (${hPos}º) ${hg}×${ag} ${g.away_team} (${aPos}º) — xG: ${hxg} vs ${axg}`
  }).join("\n")

  const standingsText = standings.slice(0, 10).map((t, i) =>
    `${i + 1}. ${t.team} ${t.points}pts (${t.wins}V ${t.draws}E ${t.losses}D) xG:${t.xG.toFixed(1)} xGA:${t.xGA.toFixed(1)} xPTS:${t.xPTS.toFixed(1)} ±PTS:${t.deltaPTS > 0 ? "+" : ""}${t.deltaPTS.toFixed(1)}`
  ).join("\n")

  return `DADOS DA RODADA ${roundNumber} DO BRASILEIRÃO 2026:

JOGOS:
${gamesText}

CLASSIFICAÇÃO (top 10 após rodada ${roundNumber}):
${standingsText}

Escreva um texto editorial completo seguindo EXATAMENTE este formato:

MANCHETE: [frase curta, provocativa, máximo 10 palavras, em CAPS]

LIDE: [parágrafo de 2-3 frases capturando a essência da rodada]

ANÁLISE PRINCIPAL:
[Parágrafo 1: o jogo mais importante e seu significado na tabela]

[Parágrafo 2: a surpresa da rodada — resultado inesperado]

[Parágrafo 3: o time que mais impressionou pelos dados (xG, xPTS)]

[Parágrafo 4: o time que decepcionou]

CONCLUSÃO: [1 parágrafo sobre o que essa rodada significa para o restante da temporada]`
}

export function RoundSummary({ roundNumber, games, initialAnalysis, initialRound }: RoundSummaryProps) {
  const [editorial, setEditorial] = useState(initialAnalysis || "")
  const [loading, setLoading] = useState(false)
  const [fetchedRound, setFetchedRound] = useState(initialRound || 0)

  const roundGames = useMemo(() =>
    games.filter(g => g.status === "FT" && parseRoundNumber(g.round) === roundNumber),
    [games, roundNumber]
  )

  const publishedDate = useMemo(() => {
    if (roundGames.length === 0) return null
    const sorted = [...roundGames].sort((a, b) => b.date.localeCompare(a.date))
    return sorted[0].date
  }, [roundGames])

  useEffect(() => {
    if (roundNumber === fetchedRound) return
    if (roundGames.length === 0) {
      setEditorial("")
      return
    }

    setLoading(true)
    const context = buildEditorialContext(roundNumber, roundGames, games)

    fetch("/api/insight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        key: `round-editorial-${roundNumber}`,
        dataContext: context,
        maxTokens: 1200,
        systemPrompt: EDITORIAL_SYSTEM,
      }),
    })
      .then(r => r.json())
      .then(data => {
        setEditorial(data.insight || "")
        setFetchedRound(roundNumber)
      })
      .catch(() => setEditorial(""))
      .finally(() => setLoading(false))
  }, [roundNumber, fetchedRound, roundGames, games])

  if (roundGames.length === 0) return null

  const parsed = editorial ? parseEditorial(editorial) : null

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      {loading ? (
        <div className="p-6 md:p-8 space-y-4 animate-pulse">
          <div className="h-7 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-100 rounded w-1/3" />
          <div className="h-4 bg-gray-200 rounded w-full mt-4" />
          <div className="h-4 bg-gray-200 rounded w-5/6" />
          <div className="h-4 bg-gray-200 rounded w-4/6" />
          <div className="h-4 bg-gray-100 rounded w-full mt-3" />
          <div className="h-4 bg-gray-100 rounded w-5/6" />
          <div className="h-4 bg-gray-100 rounded w-3/4" />
        </div>
      ) : parsed ? (
        <div className="p-6 md:p-8">
          {/* Headline */}
          {parsed.headline && (
            <h2 className="font-[family-name:var(--font-heading)] text-2xl md:text-3xl text-gray-900 leading-tight uppercase mb-2">
              {parsed.headline}
            </h2>
          )}

          {/* Date */}
          {publishedDate && (
            <p className="font-[family-name:var(--font-data)] text-[11px] text-gray-400 mb-5">
              Rodada {roundNumber} · {new Date(publishedDate).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
            </p>
          )}

          {/* Lead */}
          {parsed.lead && (
            <p className="text-base md:text-lg text-gray-800 font-medium leading-relaxed mb-6 border-l-4 border-[var(--color-green-primary)] pl-4">
              {parsed.lead}
            </p>
          )}

          {/* Analysis paragraphs */}
          {parsed.analysis.length > 0 && (
            <div className="space-y-4 mb-6">
              {parsed.analysis.map((p, i) => (
                <p key={i} className="text-sm md:text-base text-gray-700 leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
          )}

          {/* Conclusion */}
          {parsed.conclusion && (
            <div className="bg-gray-50 rounded-lg p-4 border-l-4 border-gray-300">
              <p className="text-sm md:text-base text-gray-700 leading-relaxed italic">
                {parsed.conclusion}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="px-6 py-4">
          <p className="font-[family-name:var(--font-heading)] text-lg text-gray-400">
            RESUMO DA RODADA {roundNumber}
          </p>
          <p className="text-sm text-gray-300 mt-1">Análise editorial não disponível.</p>
        </div>
      )}
    </div>
  )
}
