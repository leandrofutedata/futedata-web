"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import type { TeamStanding } from "@/lib/types"

interface HeroEditorialProps {
  roundNumber: number
  roundStatus: "encerrada" | "ao-vivo" | "futura"
  standings: TeamStanding[]
}

interface HeroBlock {
  tag: string
  headline: string
  stat: string
  statLabel: string
  context: string
}

function generateBlocks(standings: TeamStanding[]): HeroBlock[] {
  if (standings.length === 0) return []

  const leader = standings[0]
  const byXPTS = [...standings].sort((a, b) => b.xPTS - a.xPTS)
  const xptsLeader = byXPTS[0]

  // Surprise: highest positive ±PTS
  const surprise = [...standings].sort((a, b) => b.deltaPTS - a.deltaPTS)[0]
  const surprisePos = standings.findIndex(s => s.team === surprise.team) + 1
  const surpriseXPTSPos = byXPTS.findIndex(s => s.team === surprise.team) + 1

  // Crisis: most negative ±PTS
  const crisis = [...standings].sort((a, b) => a.deltaPTS - b.deltaPTS)[0]
  const crisisPos = standings.findIndex(s => s.team === crisis.team) + 1
  const crisisXPTSPos = byXPTS.findIndex(s => s.team === crisis.team) + 1

  const blocks: HeroBlock[] = []

  // Block 1: Leader analysis
  const leaderMerit = xptsLeader.team === leader.team
  blocks.push({
    tag: "LIDERANCA",
    headline: leaderMerit
      ? `${leader.team} lidera com merecimento.`
      : `${leader.team} lidera, mas ${xptsLeader.team} merecia mais.`,
    stat: `${leader.points}`,
    statLabel: "PONTOS",
    context: leaderMerit
      ? `${leader.team} é 1º em pontos (${leader.points}) e em xPTS (${leader.xPTS.toFixed(1)}). ±PTS de ${leader.deltaPTS > 0 ? '+' : ''}${leader.deltaPTS.toFixed(1)} — ${Math.abs(leader.deltaPTS) < 1.5 ? 'liderança justa e merecida' : leader.deltaPTS > 0 ? 'liderando com bônus da sorte' : 'liderando apesar da má sorte'}.`
      : `${leader.team} tem ${leader.points} pts com ±PTS de +${leader.deltaPTS.toFixed(1)}, enquanto ${xptsLeader.team} tem xPTS de ${xptsLeader.xPTS.toFixed(1)} e deveria estar no topo. Os dados discordam da tabela.`,
  })

  // Block 2: Positive surprise
  if (surprise.deltaPTS > 0.5) {
    blocks.push({
      tag: "SURPRESA",
      headline: `${surprise.team} está acima do esperado.`,
      stat: `+${surprise.deltaPTS.toFixed(1)}`,
      statLabel: "±PTS",
      context: `${surprisePos}º na tabela real, seria ${surpriseXPTSPos}º por xPTS. ${surprise.team} tem ${surprise.points} pontos mas os dados dizem que merecia ${surprise.xPTS.toFixed(1)} — está convertendo chances acima da média ou tendo goleiro decisivo.`,
    })
  }

  // Block 3: Team in crisis
  if (crisis.deltaPTS < -0.5) {
    blocks.push({
      tag: "EM CRISE",
      headline: `${crisis.team} merecia mais do campeonato.`,
      stat: `${crisis.deltaPTS.toFixed(1)}`,
      statLabel: "±PTS",
      context: `${crisisPos}º na tabela com ${crisis.points} pts, mas por xPTS seria ${crisisXPTSPos}º com ${crisis.xPTS.toFixed(1)}. ${crisis.team} cria chances (xG ${crisis.xG.toFixed(1)}) mas não converte — ${Math.abs(crisis.deltaPTS).toFixed(1)} pontos perdidos pelo azar.`,
    })
  }

  return blocks
}

export function HeroEditorial({
  roundNumber,
  roundStatus,
  standings,
}: HeroEditorialProps) {
  const blocks = useMemo(() => generateBlocks(standings), [standings])
  const [activeIndex, setActiveIndex] = useState(0)

  const goTo = useCallback((index: number) => {
    setActiveIndex(index)
  }, [])

  // Auto-rotate every 8 seconds
  useEffect(() => {
    if (blocks.length <= 1) return
    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % blocks.length)
    }, 8000)
    return () => clearInterval(timer)
  }, [blocks.length])

  if (blocks.length === 0) {
    return (
      <div className="bg-[var(--color-green-dark)] rounded-xl p-6 md:p-8 lg:p-10 shadow-lg mb-8">
        <h1 className="font-[family-name:var(--font-heading)] text-[2.5rem] text-white">
          O BRASILEIRÃO COMEÇA AQUI.
        </h1>
        <p className="text-[var(--color-green-light)] text-sm mt-3">
          Acompanhe com dados que vão além do placar.
        </p>
      </div>
    )
  }

  const block = blocks[activeIndex]

  return (
    <div className="bg-[var(--color-green-dark)] rounded-xl p-6 md:p-8 lg:p-10 shadow-lg mb-8 relative overflow-hidden">
      {/* Top badges */}
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

      {/* Block content with transition */}
      <div className="min-h-[180px] md:min-h-[160px]">
        {/* Tag */}
        <span className="font-[family-name:var(--font-data)] text-[10px] font-bold tracking-widest text-[var(--color-yellow-accent)] mb-2 block">
          {block.tag}
        </span>

        <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-8">
          {/* Headline + context */}
          <div className="flex-1">
            <h1 className="font-[family-name:var(--font-heading)] text-[2rem] sm:text-[2.5rem] md:text-[3rem] lg:text-[3.5rem] text-white leading-[1.05] tracking-wide uppercase max-w-3xl">
              <span className="text-[var(--color-yellow-accent)]">
                {block.headline.split('.')[0]}.
              </span>
              {block.headline.includes('.') && block.headline.split('.').slice(1).join('.').trim() && (
                <> {block.headline.split('.').slice(1).join('.').trim()}</>
              )}
            </h1>
            <p className="text-[var(--color-green-light)] text-sm md:text-base mt-4 max-w-2xl leading-relaxed">
              {block.context}
            </p>
          </div>

          {/* Key stat */}
          <div className="flex-shrink-0 text-right md:pt-2">
            <p className="font-[family-name:var(--font-heading)] text-[3.5rem] md:text-[5rem] text-[var(--color-yellow-accent)] leading-none">
              {block.stat}
            </p>
            <p className="font-[family-name:var(--font-data)] text-[10px] text-white/50 tracking-widest mt-1">
              {block.statLabel}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation dots */}
      {blocks.length > 1 && (
        <div className="flex items-center gap-2 mt-6">
          {blocks.map((b, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`transition-all ${
                i === activeIndex
                  ? "w-8 h-2 bg-[var(--color-yellow-accent)] rounded-full"
                  : "w-2 h-2 bg-white/30 rounded-full hover:bg-white/50"
              }`}
              aria-label={`Ir para bloco ${i + 1}: ${b.tag}`}
            />
          ))}
          <span className="font-[family-name:var(--font-data)] text-[9px] text-white/30 ml-2">
            {activeIndex + 1}/{blocks.length}
          </span>
        </div>
      )}
    </div>
  )
}
