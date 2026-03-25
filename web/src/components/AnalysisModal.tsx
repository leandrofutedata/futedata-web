"use client"

import type { Article } from "@/lib/types"

interface AnalysisModalProps {
  article: Article
  onClose: () => void
}

function stripMarkdown(text: string | null | undefined): string {
  if (!text) return ""
  return text
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/---/g, "")
    .replace(/>/g, "")
    .trim()
}

function getTypeBadge(type: Article["type"]) {
  switch (type) {
    case "pre-jogo":
      return { label: "PRÉ-JOGO", color: "bg-blue-100 text-blue-700" }
    case "tempo-real":
      return { label: "AO VIVO", color: "bg-red-100 text-red-700" }
    case "pos-jogo":
      return { label: "PÓS-JOGO", color: "bg-gray-100 text-gray-700" }
  }
}

export function AnalysisModal({ article, onClose }: AnalysisModalProps) {
  const badge = getTypeBadge(article.type)

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl">
          <div className="flex items-center gap-3">
            <span
              className={`font-[family-name:var(--font-data)] text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.color}`}
            >
              {badge.label}
            </span>
            <span className="font-[family-name:var(--font-data)] text-xs text-gray-400">
              {new Date(article.published_at).toLocaleDateString("pt-BR")}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Fechar"
          >
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="px-6 py-5">
          <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900 mb-4">
            {article.title}
          </h2>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
            {stripMarkdown(article.body)}
          </div>
        </div>
      </div>
    </div>
  )
}
