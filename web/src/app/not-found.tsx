import Link from "next/link"

export default function NotFound() {
  return (
    <div className="max-w-7xl mx-auto px-4 py-20 text-center">
      <div className="font-[family-name:var(--font-heading)] text-8xl text-gray-200 mb-4">
        404
      </div>
      <h1 className="font-[family-name:var(--font-heading)] text-3xl text-gray-900 mb-2">
        PÁGINA NÃO ENCONTRADA
      </h1>
      <p className="text-gray-500 text-sm mb-8">
        A página que você procura não existe ou foi movida.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 bg-[var(--color-green-primary)] text-white px-6 py-3 rounded-lg font-medium text-sm hover:bg-[var(--color-green-dark)] transition-colors"
      >
        Voltar para o Brasileirão
      </Link>
    </div>
  )
}
