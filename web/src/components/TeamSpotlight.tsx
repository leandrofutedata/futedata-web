import type { TeamStanding } from "@/lib/types"

interface TeamSpotlightProps {
  team: TeamStanding
  position: number
}

export function TeamSpotlight({ team, position }: TeamSpotlightProps) {
  const xgPerGame = team.played > 0 ? team.xG / team.played : 0
  const xgaPerGame = team.played > 0 ? team.xGA / team.played : 0
  const goalsPerGame = team.played > 0 ? team.goalsFor / team.played : 0
  const gcPerGame = team.played > 0 ? team.goalsAgainst / team.played : 0

  const deltaPTSInsight =
    team.deltaPTS > 2
      ? `${team.team} está com mais pontos do que o desempenho justifica (+${team.deltaPTS.toFixed(1)}). Pode haver uma correção nas próximas rodadas.`
      : team.deltaPTS < -2
        ? `${team.team} está sendo prejudicado pela sorte. Com base no xG, deveria ter ${Math.abs(team.deltaPTS).toFixed(1)} pontos a mais.`
        : `${team.team} está com pontuação condizente com o desempenho real.`

  return (
    <div className="bg-[var(--color-green-light)] border-t border-[var(--color-green-primary)]/20 p-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Stats */}
        <div>
          <h3 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">
            {team.team}
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between font-[family-name:var(--font-data)] text-xs">
              <span className="text-gray-500">Posição</span>
              <span className="font-medium">{position}º</span>
            </div>
            <div className="flex justify-between font-[family-name:var(--font-data)] text-xs">
              <span className="text-gray-500">Pontos</span>
              <span className="font-medium">{team.points}</span>
            </div>
            <div className="flex justify-between font-[family-name:var(--font-data)] text-xs">
              <span className="text-gray-500">xPTS</span>
              <span className="font-medium text-[var(--color-green-primary)]">
                {team.xPTS.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between font-[family-name:var(--font-data)] text-xs">
              <span className="text-gray-500">±PTS</span>
              <span
                className={`font-bold ${team.deltaPTS > 0 ? "text-orange-500" : team.deltaPTS < 0 ? "text-green-600" : "text-gray-500"}`}
              >
                {team.deltaPTS > 0 ? "+" : ""}
                {team.deltaPTS.toFixed(1)}
              </span>
            </div>
            <div className="flex justify-between font-[family-name:var(--font-data)] text-xs">
              <span className="text-gray-500">Aproveitamento</span>
              <span className="font-medium">
                {team.played > 0
                  ? ((team.points / (team.played * 3)) * 100).toFixed(0)
                  : 0}
                %
              </span>
            </div>
          </div>
        </div>

        {/* xG vs Real goals bar chart */}
        <div>
          <h4 className="font-[family-name:var(--font-data)] text-xs text-gray-500 uppercase mb-4">
            xG vs Gols Reais (por jogo)
          </h4>
          <div className="space-y-3">
            <div>
              <div className="flex justify-between font-[family-name:var(--font-data)] text-xs mb-1">
                <span>Gols marcados</span>
                <span>{goalsPerGame.toFixed(2)}</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-green-primary)] rounded-full transition-all"
                  style={{ width: `${Math.min(goalsPerGame / 3 * 100, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-[family-name:var(--font-data)] text-xs mb-1">
                <span>xG</span>
                <span>{xgPerGame.toFixed(2)}</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-green-primary)]/50 rounded-full transition-all"
                  style={{ width: `${Math.min(xgPerGame / 3 * 100, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-[family-name:var(--font-data)] text-xs mb-1">
                <span>Gols sofridos</span>
                <span>{gcPerGame.toFixed(2)}</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-alert-red)] rounded-full transition-all"
                  style={{ width: `${Math.min(gcPerGame / 3 * 100, 100)}%` }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-[family-name:var(--font-data)] text-xs mb-1">
                <span>xGA</span>
                <span>{xgaPerGame.toFixed(2)}</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--color-alert-red)]/50 rounded-full transition-all"
                  style={{ width: `${Math.min(xgaPerGame / 3 * 100, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Insight */}
        <div>
          <h4 className="font-[family-name:var(--font-data)] text-xs text-gray-500 uppercase mb-4">
            Insight ±PTS
          </h4>
          <p className="text-sm text-gray-700 leading-relaxed">
            {deltaPTSInsight}
          </p>
          <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
            <p className="font-[family-name:var(--font-data)] text-xs text-gray-500 mb-1">
              Impacto no Cartola
            </p>
            <p className="text-sm text-gray-700">
              {xgPerGame > 1.5
                ? `Atacantes do ${team.team} são boas opções — time cria muitas chances (xG ${xgPerGame.toFixed(2)}/jogo).`
                : xgaPerGame < 1.0
                  ? `Defesa do ${team.team} é sólida (xGA ${xgaPerGame.toFixed(2)}/jogo) — bom para pontuar com SG.`
                  : `Desempenho médio — avalie individualmente os jogadores.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
