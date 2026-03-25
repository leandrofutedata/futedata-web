import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Cartola FC — Futedata",
  description: "Ranking de jogadores recomendados para o Cartola FC com análise estatística avançada.",
}

export default function CartolaPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl text-gray-900 mb-2">
          CARTOLA FC
        </h1>
        <p className="text-gray-500 text-sm">
          Ranking inteligente de jogadores para escalar seu time no Cartola
        </p>
      </div>

      <div className="text-center py-20 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="font-[family-name:var(--font-heading)] text-6xl text-gray-200 mb-4">
          EM BREVE
        </div>
        <p className="text-gray-400 text-sm mb-4">
          Recomendações baseadas em xG, xGA, adversário da rodada e histórico de pontuação
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          <span className="font-[family-name:var(--font-data)] text-xs bg-[var(--color-green-light)] text-[var(--color-green-primary)] px-3 py-1 rounded-full">
            Score Futedata
          </span>
          <span className="font-[family-name:var(--font-data)] text-xs bg-yellow-50 text-yellow-700 px-3 py-1 rounded-full">
            Melhor capitão
          </span>
          <span className="font-[family-name:var(--font-data)] text-xs bg-red-50 text-red-600 px-3 py-1 rounded-full">
            Jogadores a evitar
          </span>
          <span className="font-[family-name:var(--font-data)] text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-full">
            Custo-benefício
          </span>
        </div>
      </div>
    </div>
  )
}
