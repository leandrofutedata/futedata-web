"use client"

import { useState, useMemo } from "react"
import type { Game, Article } from "@/lib/types"
import { calcStandings, parseRoundNumber } from "@/lib/calculations"
import {
  getAvailableRounds,
  getLatestFinishedRound,
  getRoundStatus,
} from "@/lib/data"
import { HeroEditorial } from "./HeroEditorial"
import { StandingsTable } from "./StandingsTable"
import { RoundNav } from "./RoundNav"
import { GameCard } from "./GameCard"
import { Sidebar } from "./Sidebar"
import { RoundAnalyses } from "./RoundAnalyses"
import { AnalysisModal } from "./AnalysisModal"

interface HomeClientProps {
  games: Game[]
  articles: Article[]
}

export function HomeClient({ games, articles }: HomeClientProps) {
  const availableRounds = useMemo(() => getAvailableRounds(games), [games])
  const latestFinishedRound = useMemo(
    () => getLatestFinishedRound(games),
    [games]
  )
  const [currentRound, setCurrentRound] = useState(latestFinishedRound)
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null)

  const standings = useMemo(() => calcStandings(games), [games])

  const roundGames = useMemo(
    () => games.filter((g) => parseRoundNumber(g.round) === currentRound),
    [games, currentRound]
  )

  const roundStatus = useMemo(() => getRoundStatus(roundGames), [roundGames])

  const upcomingGames = useMemo(
    () =>
      games
        .filter((g) => g.status === "NS")
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 7),
    [games]
  )

  // Articles for the current round only
  const roundGameIds = useMemo(
    () => new Set(roundGames.map((g) => g.id)),
    [roundGames]
  )

  const roundArticles = useMemo(
    () =>
      articles
        .filter((a) => roundGameIds.has(a.game_id))
        .sort((a, b) => b.published_at.localeCompare(a.published_at)),
    [articles, roundGameIds]
  )

  if (games.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="text-center py-20">
          <h1 className="font-[family-name:var(--font-heading)] text-5xl text-gray-900 mb-4">
            FUTEDATA
          </h1>
          <p className="text-gray-500 text-lg mb-2">
            Analise estatistica avancada do Brasileirao
          </p>
          <p className="text-gray-400 text-sm">
            Nenhum jogo encontrado. Execute o script de populacao de dados para
            comecar.
          </p>
          <div className="mt-6 font-[family-name:var(--font-data)] text-xs text-gray-400 bg-gray-50 inline-block px-4 py-2 rounded-lg">
            npm run populate
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Hero full-width */}
      <HeroEditorial
        roundNumber={currentRound}
        roundStatus={roundStatus}
        standings={standings}
      />

      {/* Two-column grid: main content + sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column — table + round games + analyses */}
        <div className="lg:col-span-2 space-y-6">
          <StandingsTable standings={standings} />

          <RoundNav
            currentRound={currentRound}
            availableRounds={availableRounds}
            onRoundChange={setCurrentRound}
          />

          <div>
            <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">
              JOGOS DA RODADA {currentRound}
            </h2>
            {roundGames.length === 0 ? (
              <p className="text-sm text-gray-400">
                Nenhum jogo encontrado para esta rodada.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {roundGames.map((game) => (
                  <GameCard key={game.id} game={game} />
                ))}
              </div>
            )}
          </div>

          {/* Round analyses section */}
          <RoundAnalyses
            articles={roundArticles}
            roundNumber={currentRound}
            onSelect={setSelectedArticle}
          />
        </div>

        {/* Right column — stats card + upcoming + insights + glossary */}
        <Sidebar standings={standings} upcomingGames={upcomingGames} />
      </div>

      {/* Modal */}
      {selectedArticle && (
        <AnalysisModal
          article={selectedArticle}
          onClose={() => setSelectedArticle(null)}
        />
      )}
    </div>
  )
}
