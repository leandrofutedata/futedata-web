import type { TeamStanding } from "@/lib/types"

interface DataExplainerProps {
  standings: TeamStanding[]
}

export function DataExplainer({ standings }: DataExplainerProps) {
  if (standings.length < 5) return null

  // Find real examples from data
  const leader = standings[0]
  const byXPTS = [...standings].sort((a, b) => b.xPTS - a.xPTS)
  const xptsLeader = byXPTS[0]

  // Team that wastes most chances: highest xG but low real goals relative to xG
  const biggestWaster = [...standings]
    .filter(t => t.played >= 3)
    .sort((a, b) => (b.xG - b.goalsFor) - (a.xG - a.goalsFor))[0]

  // Most lucky team
  const luckiest = [...standings].sort((a, b) => b.deltaPTS - a.deltaPTS)[0]
  const luckiestPos = standings.findIndex(s => s.team === luckiest.team) + 1
  const luckiestXPTSPos = byXPTS.findIndex(s => s.team === luckiest.team) + 1

  // Most unlucky team
  const unluckiest = [...standings].sort((a, b) => a.deltaPTS - b.deltaPTS)[0]
  const unluckiestPos = standings.findIndex(s => s.team === unluckiest.team) + 1

  // Relegation zone team that xPTS says shouldn't be there
  const totalTeams = standings.length
  const z4Teams = standings.slice(totalTeams - 4)
  const z4rescued = z4Teams.find(t => {
    const xptsPos = byXPTS.findIndex(s => s.team === t.team) + 1
    return xptsPos <= totalTeams - 4
  })

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="font-[family-name:var(--font-heading)] text-2xl text-gray-900">
          POR QUE xG IMPORTA MAIS QUE GOLS?
        </h2>
        <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 mt-1">
          Os dados contam o que o placar não mostra
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-0">
        {/* Card 1: xG reveals truth */}
        <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100">
          <div className="w-10 h-10 rounded-lg bg-[var(--color-green-light)] flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-[var(--color-green-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </div>
          <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-2">
            xG REVELA A VERDADE QUE O PLACAR ESCONDE
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            O xG mede a qualidade das chances criadas, não apenas os gols. Um time pode marcar 2 gols com
            2 chutes improváveis — o xG mostra que isso não vai se repetir.
          </p>
          {biggestWaster && (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-[family-name:var(--font-data)] text-[11px] text-gray-500">
                <strong className="text-gray-700">Exemplo real:</strong> {biggestWaster.team} tem xG de{" "}
                {biggestWaster.xG.toFixed(1)} mas marcou apenas {biggestWaster.goalsFor} gols
                — {(biggestWaster.xG - biggestWaster.goalsFor).toFixed(1)} gols desperdiçados.
              </p>
            </div>
          )}
        </div>

        {/* Card 2: xPTS predicts */}
        <div className="p-6 border-b md:border-b-0 md:border-r border-gray-100">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-2">
            xPTS PREVÊ QUEM VAI SUBIR E CAIR
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            O xPTS calcula quantos pontos um time merece com base no xG e xGA. Times com xPTS alto tendem
            a subir na tabela; times com xPTS baixo tendem a cair — é questão de tempo.
          </p>
          {xptsLeader.team !== leader.team ? (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-[family-name:var(--font-data)] text-[11px] text-gray-500">
                <strong className="text-gray-700">Exemplo real:</strong> {xptsLeader.team} lidera em xPTS
                ({xptsLeader.xPTS.toFixed(1)}) mas não lidera a tabela real. Historicamente, o xPTS se
                aproxima da realidade conforme as rodadas avançam.
              </p>
            </div>
          ) : z4rescued ? (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-[family-name:var(--font-data)] text-[11px] text-gray-500">
                <strong className="text-gray-700">Exemplo real:</strong> {z4rescued.team} está no Z4 com{" "}
                {z4rescued.points} pts, mas tem xPTS de {z4rescued.xPTS.toFixed(1)} — os dados sugerem
                que vai sair do rebaixamento.
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="font-[family-name:var(--font-data)] text-[11px] text-gray-500">
                <strong className="text-gray-700">Exemplo real:</strong> {leader.team} lidera em pontos ({leader.points})
                e em xPTS ({leader.xPTS.toFixed(1)}) — liderança duplamente confirmada pelos dados.
              </p>
            </div>
          )}
        </div>

        {/* Card 3: ±PTS identifies luck */}
        <div className="p-6">
          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center mb-3">
            <svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-2">
            ±PTS IDENTIFICA TIMES COM SORTE OU AZAR
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed mb-3">
            A diferença entre pontos reais e xPTS revela quem está com sorte (±PTS positivo) e quem
            está sendo prejudicado (±PTS negativo). O azar não dura para sempre.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
            <p className="font-[family-name:var(--font-data)] text-[11px] text-orange-600">
              <strong>Sortudo:</strong> {luckiest.team} ({luckiestPos}º) tem ±PTS de +{luckiest.deltaPTS.toFixed(1)}
              — {luckiestXPTSPos > luckiestPos ? `deveria ser ${luckiestXPTSPos}º por xPTS` : 'pontuando acima do esperado'}
            </p>
            <p className="font-[family-name:var(--font-data)] text-[11px] text-green-600">
              <strong>Azarado:</strong> {unluckiest.team} ({unluckiestPos}º) tem ±PTS de {unluckiest.deltaPTS.toFixed(1)}
              — merecia {Math.abs(unluckiest.deltaPTS).toFixed(1)} pontos a mais
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
