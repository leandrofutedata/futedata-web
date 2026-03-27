import type { TeamGameStats } from "@/lib/types"

interface Props {
  teamStats: TeamGameStats
  leagueStats: TeamGameStats
}

export function AdvancedStats({ teamStats, leagueStats }: Props) {
  if (teamStats.gamesWithStats === 0) return null

  const stats = [
    { label: "Posse", value: `${teamStats.possession}%`, league: `${leagueStats.possession}%`, better: teamStats.possession > leagueStats.possession },
    { label: "Finalizações/jogo", value: teamStats.shots.toFixed(1), league: leagueStats.shots.toFixed(1), better: teamStats.shots > leagueStats.shots },
    { label: "Chutes no gol/jogo", value: teamStats.shotsOnTarget.toFixed(1), league: leagueStats.shotsOnTarget.toFixed(1), better: teamStats.shotsOnTarget > leagueStats.shotsOnTarget },
    { label: "Escanteios/jogo", value: teamStats.corners.toFixed(1), league: leagueStats.corners.toFixed(1), better: teamStats.corners > leagueStats.corners },
    { label: "Passes/jogo", value: Math.round(teamStats.passes).toString(), league: Math.round(leagueStats.passes).toString(), better: teamStats.passes > leagueStats.passes },
    { label: "Precisão passes", value: `${teamStats.passAccuracy}%`, league: `${leagueStats.passAccuracy}%`, better: teamStats.passAccuracy > leagueStats.passAccuracy },
    { label: "Conversão chutes", value: `${teamStats.shotConversion}%`, league: `${leagueStats.shotConversion}%`, better: teamStats.shotConversion > leagueStats.shotConversion },
    { label: "Faltas/jogo", value: teamStats.fouls.toFixed(1), league: leagueStats.fouls.toFixed(1), better: teamStats.fouls < leagueStats.fouls },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-1">ESTATÍSTICAS AVANÇADAS</h2>
      <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 mb-4">
        Médias por jogo · {teamStats.gamesWithStats} jogos analisados
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
            <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase">{s.label}</p>
            <p className={`font-[family-name:var(--font-heading)] text-xl ${s.better ? "text-green-600" : "text-orange-500"}`}>
              {s.value}
            </p>
            <p className="font-[family-name:var(--font-data)] text-[9px] text-gray-400">
              liga: {s.league} {s.better ? "↑" : "↓"}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
