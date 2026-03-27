"use client"

import { useState, useEffect } from "react"

interface CountdownProps {
  targetDate: string
}

export function Countdown({ targetDate }: CountdownProps) {
  const [days, setDays] = useState<number | null>(null)

  useEffect(() => {
    const calc = () => {
      const diff = new Date(targetDate).getTime() - Date.now()
      setDays(Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24))))
    }
    calc()
    const timer = setInterval(calc, 60000)
    return () => clearInterval(timer)
  }, [targetDate])

  if (days === null) {
    return <span className="font-[family-name:var(--font-heading)] text-5xl text-[var(--color-yellow-accent)]">...</span>
  }

  if (days === 0) {
    return (
      <div className="text-center">
        <span className="font-[family-name:var(--font-heading)] text-3xl text-[var(--color-yellow-accent)]">EM ANDAMENTO</span>
      </div>
    )
  }

  return (
    <div className="text-center">
      <span className="font-[family-name:var(--font-heading)] text-5xl text-[var(--color-yellow-accent)]">{days}</span>
      <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 block mt-1 uppercase tracking-wider">dias para a Copa</span>
    </div>
  )
}
