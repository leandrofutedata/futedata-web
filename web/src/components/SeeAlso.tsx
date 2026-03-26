import Link from "next/link"

interface SeeAlsoItem {
  href: string
  title: string
  description: string
}

interface SeeAlsoProps {
  items: SeeAlsoItem[]
}

export function SeeAlso({ items }: SeeAlsoProps) {
  if (items.length === 0) return null

  return (
    <section className="mt-12 pt-8 border-t border-gray-200">
      <h3 className="font-[family-name:var(--font-heading)] text-xl text-gray-900 mb-4">
        VEJA TAMBÉM
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-[var(--color-green-primary)]/30 transition-all group"
          >
            <h4 className="text-sm font-medium text-gray-900 group-hover:text-[var(--color-green-primary)] transition-colors">
              {item.title}
            </h4>
            <p className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 mt-1">
              {item.description}
            </p>
            <span className="font-[family-name:var(--font-data)] text-[10px] text-[var(--color-green-primary)] mt-2 inline-block group-hover:underline">
              Ver mais →
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
