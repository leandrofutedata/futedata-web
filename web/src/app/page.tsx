import Link from "next/link"

export const revalidate = 60

export default function HomePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-12 text-center">
      <h1 className="font-[family-name:var(--font-heading)] text-5xl text-gray-900 mb-4">FUTEDATA</h1>
      <p className="text-gray-500 text-lg mb-8">Homepage editorial em construção</p>
      <Link
        href="/brasileirao"
        className="inline-flex items-center gap-2 bg-[var(--color-green-primary)] text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-[var(--color-green-dark)] transition-colors"
      >
        Ir para o Brasileirão →
      </Link>
    </div>
  )
}
