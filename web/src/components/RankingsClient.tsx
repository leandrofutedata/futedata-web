"use client"

import { RankingCard } from "./RankingCard"

interface RankingEntry {
  team: string
  value: number
  label: string
}

interface RankingsClientProps {
  consistent: RankingEntry[]
  attack: RankingEntry[]
  defense: RankingEntry[]
  wasteful: RankingEntry[]
  goalkeepers: RankingEntry[]
  insights: {
    consistent: string
    attack: string
    defense: string
    wasteful: string
    goalkeepers: string
  }
}

export function RankingsClient({
  consistent,
  attack,
  defense,
  wasteful,
  goalkeepers,
  insights,
}: RankingsClientProps) {
  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Hero */}
      <div className="bg-[var(--color-green-dark)] rounded-xl p-6 md:p-8 shadow-lg mb-8">
        <p className="font-[family-name:var(--font-data)] text-[10px] text-green-300 uppercase tracking-widest mb-1">
          Brasileirão Série A 2026
        </p>
        <h1 className="font-[family-name:var(--font-heading)] text-5xl md:text-6xl text-white">
          RANKINGS
        </h1>
        <p className="text-green-200 text-sm mt-2 max-w-2xl">
          Os rankings mais polêmicos do Brasileirão. Baseados em dados reais de xG, xGA e estatísticas avançadas.
        </p>
      </div>

      {/* Quick nav */}
      <div className="flex gap-2 mb-8 flex-wrap">
        {[
          { id: "consistencia", label: "Consistência" },
          { id: "ataque", label: "Ataque" },
          { id: "defesa", label: "Defesa" },
          { id: "desperdicio", label: "Desperdício" },
          { id: "goleiros", label: "Goleiros" },
        ].map((item) => (
          <a
            key={item.id}
            href={`#${item.id}`}
            className="font-[family-name:var(--font-data)] text-[10px] px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-[var(--color-green-light)] hover:text-[var(--color-green-primary)] transition-colors"
          >
            {item.label}
          </a>
        ))}
      </div>

      <div className="space-y-8">
        <RankingCard
          id="consistencia"
          title="QUEM MERECE A POSIÇÃO QUE TEM?"
          subtitle="Ranking de consistência — Menor desvio entre pontos reais e esperados (xPTS)"
          entries={consistent}
          insight={insights.consistent}
          barColor="bg-blue-500"
          formatValue={(v) => `±${v.toFixed(1)}`}
        />

        <RankingCard
          id="ataque"
          title="O ATAQUE MAIS PERIGOSO DO BRASIL"
          subtitle="Por Expected Goals (xG) — Quem cria mais perigo?"
          entries={attack}
          insight={insights.attack}
          barColor="bg-[var(--color-green-primary)]"
          formatValue={(v) => `${v.toFixed(1)} xG`}
        />

        <RankingCard
          id="defesa"
          title="A MURALHA: DEFESA MAIS SÓLIDA"
          subtitle="Por Expected Goals Against (xGA) — Quem menos sofre?"
          entries={defense}
          insight={insights.defense}
          barColor="bg-emerald-500"
          formatValue={(v) => `${v.toFixed(1)} xGA`}
        />

        <RankingCard
          id="desperdicio"
          title="QUEM DESPERDIÇA MAIS CHANCES?"
          subtitle="Diferença entre xG e gols marcados — Quem mais peca na finalização?"
          entries={wasteful}
          insight={insights.wasteful}
          barColor="bg-orange-500"
          formatValue={(v) => `${v.toFixed(1)} gols perdidos`}
        />

        <RankingCard
          id="goleiros"
          title="OS GOLEIROS MAIS DECISIVOS"
          subtitle="Defesas por jogo — Quem segura o time nas costas?"
          entries={goalkeepers}
          insight={insights.goalkeepers}
          barColor="bg-yellow-500"
          formatValue={(v) => `${v.toFixed(1)} def/jogo`}
        />
      </div>
    </div>
  )
}
