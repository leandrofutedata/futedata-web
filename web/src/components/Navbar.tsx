"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { TEAMS } from "@/lib/teams"

const links = [
  { href: "/brasileirao", label: "Brasileirão" },
  { href: "/times", label: "Times" },
  { href: "/rankings", label: "Rankings" },
  { href: "/comparar", label: "Comparar" },
  { href: "/cartola", label: "Cartola FC" },
  { href: "/copa-brasil", label: "Copa do Brasil" },
  { href: "/projecoes", label: "Projeções" },
  { href: "/copa-mundo-2026", label: "Copa 2026" },
]

interface SearchResult {
  href: string
  label: string
  type: string
}

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Close search on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Focus input when search opens
  useEffect(() => {
    if (searchOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [searchOpen])

  // Search results
  const searchResults: SearchResult[] = searchQuery.trim().length >= 2
    ? [
        ...TEAMS
          .filter(t =>
            t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.slug.includes(searchQuery.toLowerCase())
          )
          .slice(0, 5)
          .map(t => ({ href: `/times/${t.slug}`, label: t.name, type: "Time" })),
        ...links
          .filter(l => l.label.toLowerCase().includes(searchQuery.toLowerCase()))
          .map(l => ({ href: l.href, label: l.label, type: "Página" })),
      ]
    : []

  function handleSearchSelect(href: string) {
    setSearchOpen(false)
    setSearchQuery("")
    router.push(href)
  }

  return (
    <header className="bg-[#1a472a] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <span className="font-[family-name:var(--font-heading)] text-2xl sm:text-3xl text-white tracking-wide">
              FUTEDATA
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {links.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-2.5 py-1.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-white/70 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>

          {/* Right side: search + mobile hamburger */}
          <div className="flex items-center gap-1">
            {/* Search */}
            <div ref={searchRef} className="relative">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Buscar"
              >
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>

              {searchOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50">
                  <div className="p-3 border-b border-gray-100">
                    <input
                      ref={inputRef}
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setSearchOpen(false)
                        if (e.key === "Enter" && searchResults.length > 0) {
                          handleSearchSelect(searchResults[0].href)
                        }
                      }}
                      placeholder="Buscar time ou página..."
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-[var(--color-green-primary)] focus:ring-1 focus:ring-[var(--color-green-primary)]"
                    />
                  </div>
                  {searchQuery.trim().length >= 2 && (
                    <div className="max-h-64 overflow-y-auto">
                      {searchResults.length === 0 ? (
                        <p className="px-4 py-3 text-sm text-gray-400">Nenhum resultado encontrado</p>
                      ) : (
                        searchResults.map((result) => (
                          <button
                            key={result.href}
                            onClick={() => handleSearchSelect(result.href)}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors flex items-center justify-between"
                          >
                            <span className="text-sm text-gray-900">{result.label}</span>
                            <span className="font-[family-name:var(--font-data)] text-[10px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                              {result.type}
                            </span>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="lg:hidden p-2 rounded-lg hover:bg-white/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label="Menu"
            >
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {mobileOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile nav */}
        {mobileOpen && (
          <nav className="lg:hidden pb-4 border-t border-white/20 pt-2">
            {links.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/")
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`block px-3 py-3 rounded-lg text-sm font-medium ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "text-white/80 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              )
            })}
          </nav>
        )}
      </div>
    </header>
  )
}
