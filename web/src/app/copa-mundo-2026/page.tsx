import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Copa do Mundo 2026 — Futedata",
  description: "Estatísticas avançadas, probabilidades e análise da Copa do Mundo 2026.",
}

function DaysUntilCup() {
  const cupDate = new Date("2026-06-11T00:00:00")
  const now = new Date()
  const diff = cupDate.getTime() - now.getTime()
  const days = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
  return days
}

export default function CopaMundoPage() {
  const days = DaysUntilCup()

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <div className="mb-8">
        <h1 className="font-[family-name:var(--font-heading)] text-4xl md:text-5xl text-gray-900 mb-2">
          COPA DO MUNDO 2026
        </h1>
        <p className="text-gray-500 text-sm">
          Estados Unidos, México e Canadá — 11 de junho a 19 de julho
        </p>
      </div>

      {/* Countdown */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-8 text-center mb-8 border-t-4 border-t-[var(--color-yellow-accent)]">
        <p className="font-[family-name:var(--font-data)] text-xs text-gray-500 uppercase tracking-wide mb-2">
          Contagem regressiva
        </p>
        <div className="font-[family-name:var(--font-heading)] text-7xl md:text-9xl text-[var(--color-green-primary)]">
          {days}
        </div>
        <p className="font-[family-name:var(--font-data)] text-sm text-gray-500 mt-2">
          dias para o início da Copa
        </p>
      </div>

      {/* Brazil card */}
      <div className="bg-gradient-to-r from-[var(--color-green-light)] to-yellow-50 border border-gray-200 rounded-xl shadow-sm p-8 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">🇧🇷</span>
          <h2 className="font-[family-name:var(--font-heading)] text-3xl text-gray-900">
            SELEÇÃO BRASILEIRA
          </h2>
        </div>
        <p className="text-gray-600 text-sm mb-4">
          Acompanhe o Brasil na Copa com análise estatística avançada: xG, probabilidades por fase e desempenho dos convocados.
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="font-[family-name:var(--font-data)] text-xs bg-white/80 text-[var(--color-green-primary)] px-3 py-1 rounded-full">
            Probabilidade de título
          </span>
          <span className="font-[family-name:var(--font-data)] text-xs bg-white/80 text-[var(--color-green-primary)] px-3 py-1 rounded-full">
            Fase de grupos
          </span>
          <span className="font-[family-name:var(--font-data)] text-xs bg-white/80 text-[var(--color-green-primary)] px-3 py-1 rounded-full">
            Convocados
          </span>
        </div>
      </div>

      <div className="text-center py-16 bg-white border border-gray-200 rounded-xl shadow-sm">
        <div className="font-[family-name:var(--font-heading)] text-5xl text-gray-200 mb-4">
          CONTEÚDO EM BREVE
        </div>
        <p className="text-gray-400 text-sm">
          Grupos, chaveamento e probabilidades serão adicionados quando a Copa se aproximar
        </p>
      </div>
    </div>
  )
}
