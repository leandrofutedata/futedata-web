"use client"

import type { Article } from "@/lib/types"

interface RoundAnalysesProps {
  articles: Article[]
  roundNumber: number
  onSelect: (article: Article) => void
}

function getTypeBadge(type: Article["type"]) {
  switch (type) {
    case "pre-jogo":
      return { label: "PRE-JOGO", color: "bg-blue-100 text-blue-700" }
    case "tempo-real":
      return { label: "AO VIVO", color: "bg-red-100 text-red-700" }
    case "pos-jogo":
      return { label: "POS-JOGO", color: "bg-gray-100 text-gray-700" }
  }
}

export function RoundAnalyses({ articles, roundNumber, onSelect }: RoundAnalysesProps) {
  if (articles.length === 0) return null

  return (
    <div>
      <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">
        ANALISES DA RODADA {roundNumber}
      </h2>
      <div className="space-y-3">
        {articles.map((article) => {
          const badge = getTypeBadge(article.type)
          return (
            <button
              key={article.id}
              onClick={() => onSelect(article)}
              className="w-full bg-white border border-gray-200 rounded-xl px-5 py-4 shadow-sm text-left hover:shadow-md hover:border-[var(--color-green-primary)]/30 transition-all group flex items-start gap-4"
            >
              <span
                className={`font-[family-name:var(--font-data)] text-[10px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap mt-0.5 ${badge.color}`}
              >
                {badge.label}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 text-sm group-hover:text-[var(--color-green-primary)] transition-colors leading-snug">
                  {article.title}
                </p>
                <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 mt-1">
                  {new Date(article.published_at).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}
                </p>
              </div>
              <span className="font-[family-name:var(--font-data)] text-xs text-[var(--color-green-primary)] opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mt-0.5">
                ler →
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
