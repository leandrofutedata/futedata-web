import type { Game, TeamStanding } from "@/lib/types"

interface SidebarProps {
  standings: TeamStanding[]
  upcomingGames: Game[]
}

export function Sidebar({ standings, upcomingGames }: SidebarProps) {
  const leader = standings[0]
  const bestDefense = standings.length > 0
    ? standings.reduce((best, t) =>
        t.xGA / (t.played || 1) < best.xGA / (best.played || 1) ? t : best,
        standings[0]
      )
    : null
  const bestAttack = standings.length > 0
    ? standings.reduce((best, t) =>
        t.xG / (t.played || 1) > best.xG / (best.played || 1) ? t : best,
        standings[0]
      )
    : null
  const mostUnlucky = standings.length > 0
    ? standings.reduce((best, t) => (t.deltaPTS < best.deltaPTS ? t : best), standings[0])
    : null
  const mostLucky = standings.length > 0
    ? standings.reduce((best, t) => (t.deltaPTS > best.deltaPTS ? t : best), standings[0])
    : null

  return (
    <aside className="space-y-6">
      {/* Stats compacto — Melhor Ataque + Mais Azarado side-by-side */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 pt-4 pb-3">
          <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900">
            DESTAQUES DO MODELO
          </h3>
        </div>
        <div className="grid grid-cols-2">
          {bestAttack && (
            <div className="border-t-4 border-t-[var(--color-green-primary)] p-4">
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase tracking-wide">
                Melhor Ataque
              </p>
              <p className="font-[family-name:var(--font-heading)] text-2xl text-[var(--color-green-primary)] leading-tight">
                {bestAttack.xG.toFixed(1)}
              </p>
              <p className="text-xs font-medium text-gray-900 mt-0.5">{bestAttack.team}</p>
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                {(bestAttack.goalsFor / (bestAttack.played || 1)).toFixed(2)}/jogo
              </p>
            </div>
          )}
          {mostUnlucky && mostUnlucky.deltaPTS < 0 && (
            <div className="border-t-4 border-t-[var(--color-yellow-accent)] p-4">
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase tracking-wide">
                Mais Azarado
              </p>
              <p className="font-[family-name:var(--font-heading)] text-2xl text-[var(--color-alert-red)] leading-tight">
                {mostUnlucky.deltaPTS.toFixed(1)}
              </p>
              <p className="text-xs font-medium text-gray-900 mt-0.5">{mostUnlucky.team}</p>
              <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                merecia +{Math.abs(mostUnlucky.deltaPTS).toFixed(1)} pts
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Upcoming games */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-4">
          PRÓXIMOS JOGOS
        </h3>
        <div className="space-y-3">
          {upcomingGames.length === 0 && (
            <p className="text-sm text-gray-400">Nenhum jogo agendado</p>
          )}
          {upcomingGames.slice(0, 7).map((game) => (
            <div
              key={game.id}
              className="flex items-center justify-between text-sm border-b border-gray-50 pb-2 last:border-0"
            >
              <div className="flex-1">
                <p className="font-medium text-gray-800 text-xs">
                  {game.home_team} vs {game.away_team}
                </p>
                <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400">
                  {new Date(game.date).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-4">
          INSIGHTS DO MODELO
        </h3>
        <div className="space-y-3">
          {leader && (
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <span className="text-lg">🏆</span>
              <div>
                <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 uppercase">
                  Líder
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {leader.team} ({leader.points} pts)
                </p>
              </div>
            </div>
          )}
          {mostUnlucky && mostUnlucky.deltaPTS < 0 && (
            <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
              <span className="text-lg">🍀</span>
              <div>
                <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 uppercase">
                  Mais Azarado
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {mostUnlucky.team} ({mostUnlucky.deltaPTS.toFixed(1)} ±PTS)
                </p>
              </div>
            </div>
          )}
          {mostLucky && mostLucky.deltaPTS > 0 && (
            <div className="flex items-center gap-3 p-3 bg-orange-50 rounded-lg">
              <span className="text-lg">⚠</span>
              <div>
                <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 uppercase">
                  Mais Sortudo
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {mostLucky.team} (+{mostLucky.deltaPTS.toFixed(1)} ±PTS)
                </p>
              </div>
            </div>
          )}
          {bestDefense && (
            <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
              <span className="text-lg">🛡</span>
              <div>
                <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-500 uppercase">
                  Melhor Defesa (xGA)
                </p>
                <p className="text-sm font-medium text-gray-900">
                  {bestDefense.team} ({(bestDefense.xGA / (bestDefense.played || 1)).toFixed(2)}/jogo)
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Glossary */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5">
        <h3 className="font-[family-name:var(--font-heading)] text-lg text-gray-900 mb-4">
          GLOSSÁRIO
        </h3>
        <div className="space-y-3">
          <div>
            <p className="font-[family-name:var(--font-data)] text-xs font-medium text-[var(--color-green-primary)]">
              xG (Expected Goals)
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Gols esperados com base na qualidade das chances criadas. Mede o quanto um time deveria ter feito de gol.
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-data)] text-xs font-medium text-[var(--color-green-primary)]">
              xGA (Expected Goals Against)
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Gols esperados sofridos. Quanto menor, melhor a defesa do time.
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-data)] text-xs font-medium text-[var(--color-green-primary)]">
              xPTS (Expected Points)
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Quantos pontos o time deveria ter baseado no seu desempenho real de xG e xGA.
            </p>
          </div>
          <div>
            <p className="font-[family-name:var(--font-data)] text-xs font-medium text-[var(--color-green-primary)]">
              ±PTS (Delta Points)
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Diferença entre pontos reais e xPTS. Positivo = sortudo (fez mais pontos do que merecia). Negativo = azarado (merecia mais pontos).
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
