import type { Metadata } from "next"
import { Bebas_Neue, Syne, DM_Mono } from "next/font/google"
import "./globals.css"
import { Navbar } from "@/components/Navbar"

const bebasNeue = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
})

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
})

const dmMono = DM_Mono({
  weight: ["300", "400", "500"],
  subsets: ["latin"],
  variable: "--font-data",
  display: "swap",
})

export const metadata: Metadata = {
  title: "Futedata — Análise Estatística do Futebol Brasileiro",
  description:
    "O melhor site de estatísticas avançadas do Brasileirão. xG, xGA, xPTS e dados que nenhum outro site brasileiro oferece.",
  keywords: [
    "brasileirão",
    "estatísticas futebol",
    "xG",
    "expected goals",
    "futebol brasileiro",
    "série A",
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${bebasNeue.variable} ${syne.variable} ${dmMono.variable} antialiased`}
    >
      <body className="min-h-screen bg-[#FAFAF9] text-gray-900 font-[family-name:var(--font-body)]">
        <Navbar />
        <main>{children}</main>
        <footer className="bg-[var(--color-green-dark)] mt-16">
          <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="font-[family-name:var(--font-heading)] text-2xl text-[var(--color-yellow-accent)] tracking-wide">
              FUTEDATA
            </span>
            <p className="font-[family-name:var(--font-data)] text-xs text-white/70 text-center sm:text-right">
              © 2026 — Dados calculados em tempo real a partir de fontes oficiais
            </p>
          </div>
        </footer>
      </body>
    </html>
  )
}
