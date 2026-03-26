import type { TeamStanding } from "@/lib/types"

interface HeroEditorialProps {
  roundNumber: number
  roundStatus: "encerrada" | "ao-vivo" | "futura"
  standings: TeamStanding[]
}

function generateHeadline(standings: TeamStanding[]): {
  headline: string
  subtitle: string
} {
  if (standings.length === 0) {
    return {
      headline: "O Brasileirão começa aqui.",
      subtitle: "Acompanhe com dados que vão além do placar.",
    }
  }

  // standings já vem ordenado por pontos reais — standings[0] é o líder real
  const leader = standings[0]

  // Classificação por xPTS: quem merece liderar
  const byXPTS = [...standings].sort((a, b) => b.xPTS - a.xPTS)
  const xptsLeader = byXPTS[0]

  // Time mais azarado (±PTS mais negativo)
  const mostUnlucky = standings.reduce((best, t) =>
    t.deltaPTS < best.deltaPTS ? t : best, standings[0]
  )

  // Z4: últimos 4 por pontos reais
  const totalTeams = standings.length
  const z4Start = totalTeams - 4
  const z4Teams = totalTeams >= 5 ? standings.slice(z4Start) : []
  // Posição por xPTS de cada time do Z4
  const z4Rescued = z4Teams.find((z4team) => {
    const xptsPos = byXPTS.findIndex((t) => t.team === z4team.team) + 1
    return xptsPos <= z4Start // estaria fora do Z4 por xPTS
  })

  // --- PRIORIDADE 1: líder por xPTS ≠ líder real ---
  if (xptsLeader.team !== leader.team) {
    const xptsLeaderRealPos = standings.findIndex((t) => t.team === xptsLeader.team) + 1
    return {
      headline: `${xptsLeader.team} lidera se depender dos dados. ${leader.team} está na frente por sorte.`,
      subtitle: `Por xPTS, ${xptsLeader.team} (${xptsLeader.xPTS.toFixed(1)} xPTS, ${xptsLeaderRealPos}º na tabela real) deveria estar no topo. ${leader.team} tem ±PTS de +${leader.deltaPTS.toFixed(1)}.`,
    }
  }

  // A partir daqui, líder real = líder por xPTS

  // --- PRIORIDADE 2: líder merecido + sortudo (±PTS > +2) ---
  if (leader.deltaPTS > 2) {
    return {
      headline: `${leader.team} faz por merecer a liderança. E ainda tem sorte do seu lado.`,
      subtitle: `${leader.team} lidera por pontos (${leader.points}) e por xPTS (${leader.xPTS.toFixed(1)}), mas com ±PTS de +${leader.deltaPTS.toFixed(1)} — ${leader.deltaPTS.toFixed(1)} pontos de bônus.`,
    }
  }

  // --- PRIORIDADE 3: líder merecido + justo (|±PTS| < 1) ---
  if (Math.abs(leader.deltaPTS) < 1) {
    return {
      headline: `${leader.team} é o melhor time do campeonato. Os dados confirmam.`,
      subtitle: `${leader.team} lidera com ${leader.points} pontos e xPTS de ${leader.xPTS.toFixed(1)} — diferença de apenas ${Math.abs(leader.deltaPTS).toFixed(1)}. Liderança legítima.`,
    }
  }

  // --- PRIORIDADE 4: time muito azarado (±PTS < -3) ---
  if (mostUnlucky.deltaPTS < -3) {
    const unluckyPos = standings.findIndex((t) => t.team === mostUnlucky.team) + 1
    const xptsPos = byXPTS.findIndex((t) => t.team === mostUnlucky.team) + 1
    return {
      headline: `${mostUnlucky.team} está sendo roubado pelo campeonato. Merecia ${Math.abs(mostUnlucky.deltaPTS).toFixed(1)} pontos a mais.`,
      subtitle: `${mostUnlucky.team} é o ${unluckyPos}º na tabela com ${mostUnlucky.points} pts, mas por xPTS seria o ${xptsPos}º com ${mostUnlucky.xPTS.toFixed(1)}. ±PTS de ${mostUnlucky.deltaPTS.toFixed(1)}.`,
    }
  }

  // --- PRIORIDADE 5: time no Z4 que por xPTS estaria fora ---
  if (z4Rescued) {
    const realPos = standings.findIndex((t) => t.team === z4Rescued.team) + 1
    const xptsPos = byXPTS.findIndex((t) => t.team === z4Rescued.team) + 1
    return {
      headline: `${z4Rescued.team} está no rebaixamento, mas os dados dizem que não merece.`,
      subtitle: `${z4Rescued.team} é o ${realPos}º com ${z4Rescued.points} pts, mas por xPTS seria o ${xptsPos}º (${z4Rescued.xPTS.toFixed(1)} xPTS). ±PTS de ${z4Rescued.deltaPTS.toFixed(1)}.`,
    }
  }

  // --- FALLBACK: líder merecido com ±PTS entre 1 e 2 ---
  if (leader.deltaPTS >= 1) {
    return {
      headline: `${leader.team} lidera com mérito, mas com uma ajuda da sorte.`,
      subtitle: `${leader.team} tem ${leader.points} pts (xPTS ${leader.xPTS.toFixed(1)}). A diferença de +${leader.deltaPTS.toFixed(1)} é pequena, mas existe.`,
    }
  }

  if (leader.deltaPTS <= -1) {
    return {
      headline: `${leader.team} lidera mesmo jogando contra a sorte.`,
      subtitle: `Com ±PTS de ${leader.deltaPTS.toFixed(1)}, o ${leader.team} deveria ter ${Math.abs(leader.deltaPTS).toFixed(1)} pontos a mais. Liderança por mérito puro.`,
    }
  }

  return {
    headline: `${leader.team} lidera o Brasileirão. Os dados estão de olho.`,
    subtitle: `Acompanhe o campeonato com xG, xGA, xPTS e ±PTS — dados que nenhum outro site brasileiro oferece.`,
  }
}

export function HeroEditorial({
  roundNumber,
  roundStatus,
  standings,
}: HeroEditorialProps) {
  const { headline, subtitle } = generateHeadline(standings)

  return (
    <div className="bg-[var(--color-green-dark)] rounded-xl p-6 md:p-8 lg:p-10 shadow-lg mb-8">
      <div className="flex items-center gap-2 mb-5">
        <span className="font-[family-name:var(--font-data)] text-xs font-medium bg-white/15 text-white px-2.5 py-1 rounded-full">
          RODADA {roundNumber}
        </span>
        <span className="font-[family-name:var(--font-data)] text-xs font-medium bg-white/10 text-white/70 px-2.5 py-1 rounded-full">
          {roundStatus === "ao-vivo"
            ? "AO VIVO"
            : roundStatus === "futura"
              ? "EM BREVE"
              : "ENCERRADA"}
        </span>
        <span className="font-[family-name:var(--font-data)] text-[10px] text-[var(--color-yellow-accent)] bg-white/10 px-2.5 py-1 rounded-full ml-auto hidden sm:inline-block">
          xG · xGA · xPTS · ±PTS
        </span>
      </div>
      <h1 className="font-[family-name:var(--font-heading)] text-[2.25rem] sm:text-[3rem] md:text-[3.5rem] lg:text-[4rem] text-white leading-[1.05] tracking-wide uppercase max-w-4xl">
        <span className="text-[var(--color-yellow-accent)]">{headline.split('.')[0]}.</span>
        {headline.includes('.') && headline.split('.').slice(1).join('.').trim() && (
          <> {headline.split('.').slice(1).join('.').trim()}</>
        )}
      </h1>
      <p className="text-[var(--color-green-light)] text-sm md:text-base mt-4 max-w-2xl leading-relaxed">
        {subtitle}
      </p>
    </div>
  )
}
