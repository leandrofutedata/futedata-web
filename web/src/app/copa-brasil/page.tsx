import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Copa do Brasil — Futedata",
  description: "Chaveamento, confrontos e estatísticas avançadas da Copa do Brasil.",
}

export default function CopaBrasilPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl text-gray-900 mb-2">
          COPA DO BRASIL
        </h1>
        <p className="text-gray-500 text-sm">
          Chaveamento, confrontos e probabilidades de classificação
        </p>
      </div>

      <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="font-[family-name:var(--font-heading)] text-6xl text-gray-200 mb-4">
          EM BREVE
        </div>
        <p className="text-gray-400 text-sm">
          Análise estatística dos confrontos eliminatórios com probabilidades de classificação
        </p>
        <div className="mt-4 inline-flex gap-2">
          <span className="font-[family-name:var(--font-data)] text-xs bg-[var(--color-green-light)] text-[var(--color-green-primary)] px-3 py-1 rounded-full">
            xG por confronto
          </span>
          <span className="font-[family-name:var(--font-data)] text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
            Probabilidade de classificação
          </span>
          <span className="font-[family-name:var(--font-data)] text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full">
            Ida e volta
          </span>
        </div>
      </div>
    </div>
  )
}
