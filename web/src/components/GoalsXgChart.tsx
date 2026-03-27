"use client"

import { useMemo } from "react"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js"
import { Bar } from "react-chartjs-2"

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend)

export interface GoalsXgEntry {
  round: number
  gf: number
  xg: number | null
  opponent: string
  score: string
  isHome: boolean
}

interface GoalsXgChartProps {
  data: GoalsXgEntry[]
}

export function GoalsXgChart({ data }: GoalsXgChartProps) {
  const hasAnyXg = data.some(d => d.xg !== null && d.xg !== d.gf)
  const firstXgRound = data.find(d => d.xg !== null && d.xg !== d.gf)?.round

  const chartData = useMemo(() => ({
    labels: data.map(d => `R${d.round}`),
    datasets: [
      {
        label: "Gols",
        data: data.map(d => d.gf),
        backgroundColor: "#005C2B",
        borderRadius: 3,
        barPercentage: hasAnyXg ? 0.8 : 0.6,
        categoryPercentage: hasAnyXg ? 0.7 : 0.5,
      },
      ...(hasAnyXg
        ? [
            {
              label: "xG",
              data: data.map(d => d.xg ?? 0),
              backgroundColor: "#00843D66",
              borderRadius: 3,
              barPercentage: 0.8,
              categoryPercentage: 0.7,
            },
          ]
        : []),
    ],
  }), [data, hasAnyXg])

  const options = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index" as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: true,
        position: "bottom" as const,
        labels: {
          boxWidth: 12,
          boxHeight: 12,
          padding: 16,
          font: { size: 11, family: "var(--font-data)" },
          color: "#6b7280",
        },
      },
      tooltip: {
        backgroundColor: "#1a1a1a",
        titleFont: { size: 11, family: "var(--font-data)" },
        bodyFont: { size: 12, family: "var(--font-body)" },
        padding: 10,
        cornerRadius: 8,
        callbacks: {
          title: (items: { dataIndex: number }[]) => {
            const idx = items[0]?.dataIndex
            if (idx === undefined) return ""
            const entry = data[idx]
            return `Rodada ${entry.round} — ${entry.isHome ? "vs" : "@"} ${entry.opponent}`
          },
          afterTitle: (items: { dataIndex: number }[]) => {
            const idx = items[0]?.dataIndex
            if (idx === undefined) return ""
            const entry = data[idx]
            return `Placar: ${entry.score}`
          },
          label: (item: { dataset: { label?: string }; raw: unknown }) => {
            const val = item.raw as number
            return ` ${item.dataset.label}: ${val.toFixed(1)}`
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          font: { size: 9, family: "var(--font-data)" },
          color: "#9ca3af",
          maxRotation: 0,
        },
      },
      y: {
        beginAtZero: true,
        grid: { color: "#f3f4f6" },
        ticks: {
          stepSize: 1,
          font: { size: 10, family: "var(--font-data)" },
          color: "#9ca3af",
        },
      },
    },
  }), [data])

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
      <h2 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">GOLS vs xG POR RODADA</h2>
      <div style={{ height: "220px" }}>
        <Bar data={chartData} options={options} />
      </div>
      {!hasAnyXg && (
        <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 text-center mt-2">
          xG disponível a partir da rodada {firstXgRound ?? "futura"}
        </p>
      )}
    </div>
  )
}
