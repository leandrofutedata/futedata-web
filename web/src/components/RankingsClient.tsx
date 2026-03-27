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
  possession: RankingEntry[]
  shots: RankingEntry[]
  shotsOnTarget: RankingEntry[]
  corners: RankingEntry[]
  passes: RankingEntry[]
  passAccuracy: RankingEntry[]
  shotConversion: RankingEntry[]
  fouls: RankingEntry[]
  insights: {
    consistent: string
    attack: string
    defense: string
    wasteful: string
    goalkeepers: string
    possession: string
    shots: string
    shotsOnTarget: string
    corners: string
    passes: string
    passAccuracy: string
    shotConversion: string
    fouls: string
  }
}

export function RankingsClient({
  consistent,
  attack,
  defense,
  wasteful,
  goalkeepers,
  possession,
  shots,
  shotsOnTarget,
  corners,
  passes,
  passAccuracy,
  shotConversion,
  fouls,
  insights,
}: RankingsClientProps) {
  const hasGameStats = possession.length > 0

  return (
    <div>
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
          ...(hasGameStats ? [
            { id: "posse", label: "Posse" },
            { id: "finalizacoes", label: "Finalizações" },
            { id: "chutes-gol", label: "Chutes no Gol" },
            { id: "escanteios", label: "Escanteios" },
            { id: "passes", label: "Passes" },
            { id: "precisao", label: "Precisão" },
            { id: "conversao", label: "Conversão" },
            { id: "faltas", label: "Faltas" },
          ] : []),
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

        {hasGameStats ? (
          <>
            <RankingCard
              id="posse"
              title="OS DONOS DA BOLA"
              subtitle="Posse de bola média (%) — Quem mais controla o jogo?"
              entries={possession}
              insight={insights.possession}
              barColor="bg-purple-500"
              formatValue={(v) => `${v.toFixed(1)}%`}
            />

            <RankingCard
              id="finalizacoes"
              title="METRALHADORA: QUEM MAIS FINALIZA"
              subtitle="Finalizações por jogo — Volume ofensivo puro"
              entries={shots}
              insight={insights.shots}
              barColor="bg-red-500"
              formatValue={(v) => `${v.toFixed(1)} /jogo`}
            />

            <RankingCard
              id="chutes-gol"
              title="PONTARIA CERTEIRA"
              subtitle="Chutes no gol por jogo — Quem mais acerta o alvo?"
              entries={shotsOnTarget}
              insight={insights.shotsOnTarget}
              barColor="bg-rose-500"
              formatValue={(v) => `${v.toFixed(1)} /jogo`}
            />

            <RankingCard
              id="escanteios"
              title="PRESSÃO NOS CANTOS"
              subtitle="Escanteios por jogo — Quem mais pressiona na área?"
              entries={corners}
              insight={insights.corners}
              barColor="bg-teal-500"
              formatValue={(v) => `${v.toFixed(1)} /jogo`}
            />

            <RankingCard
              id="passes"
              title="FÁBRICA DE PASSES"
              subtitle="Passes por jogo — Quem mais constrói o jogo?"
              entries={passes}
              insight={insights.passes}
              barColor="bg-indigo-500"
              formatValue={(v) => `${Math.round(v)} /jogo`}
            />

            <RankingCard
              id="precisao"
              title="RELOJOEIRO: PRECISÃO DE PASSES"
              subtitle="Precisão de passes (%) — Quem erra menos?"
              entries={passAccuracy}
              insight={insights.passAccuracy}
              barColor="bg-cyan-500"
              formatValue={(v) => `${v.toFixed(1)}%`}
            />

            <RankingCard
              id="conversao"
              title="MATADOR: CONVERSÃO DE CHUTES"
              subtitle="Gols por finalização (%) — Quem é mais letal?"
              entries={shotConversion}
              insight={insights.shotConversion}
              barColor="bg-lime-600"
              formatValue={(v) => `${v.toFixed(1)}%`}
            />

            <RankingCard
              id="faltas"
              title="FAIR PLAY: OS MAIS DISCIPLINADOS"
              subtitle="Faltas por jogo — Quem joga mais limpo?"
              entries={fouls}
              insight={insights.fouls}
              barColor="bg-amber-500"
              formatValue={(v) => `${v.toFixed(1)} /jogo`}
            />
          </>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
            <p className="font-[family-name:var(--font-heading)] text-xl text-gray-400 mb-2">
              RANKINGS DE ESTATÍSTICAS AVANÇADAS
            </p>
            <p className="font-[family-name:var(--font-data)] text-xs text-gray-400">
              Posse, finalizações, escanteios, passes e mais — dados serão atualizados em breve.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
