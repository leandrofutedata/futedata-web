import Link from "next/link"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const baseUrl = "https://futedata.com.br"
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Futedata", item: baseUrl },
      ...items.map((item, i) => ({
        "@type": "ListItem",
        position: i + 2,
        name: item.label,
        ...(item.href ? { item: `${baseUrl}${item.href}` } : {}),
      })),
    ],
  }

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav className="flex items-center gap-1.5 mb-4 flex-wrap" aria-label="Breadcrumb">
        <Link
          href="/"
          className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 hover:text-[var(--color-green-primary)] transition-colors"
        >
          Futedata
        </Link>
        {items.map((item, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-300">›</span>
            {item.href ? (
              <Link
                href={item.href}
                className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 hover:text-[var(--color-green-primary)] transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-600 font-medium">
                {item.label}
              </span>
            )}
          </span>
        ))}
      </nav>
    </>
  )
}
