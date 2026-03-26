/**
 * Design system constants — single source of truth for reusable Tailwind classes.
 * Extracted from the Brasileirao homepage to ensure consistency across all pages.
 */
export const t = {
  // Layout
  page: "max-w-7xl mx-auto px-4 py-6",

  // Cards
  card: "bg-white border border-gray-200 rounded-xl shadow-sm",
  cardHover: "bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow",

  // Hero (dark green banner)
  hero: "bg-[var(--color-green-dark)] rounded-xl p-6 md:p-8 shadow-lg mb-8",

  // Typography
  h1: "font-[family-name:var(--font-heading)] text-4xl md:text-5xl text-gray-900",
  h2: "font-[family-name:var(--font-heading)] text-xl text-gray-900",
  h3: "font-[family-name:var(--font-heading)] text-lg text-gray-900",
  label: "font-[family-name:var(--font-data)] text-[10px] text-gray-400 uppercase tracking-wide",
  data: "font-[family-name:var(--font-data)]",

  // Section header (title + separator line)
  sectionHeader: "flex items-center gap-3 mb-4",
  separator: "flex-1 h-px bg-gray-200",

  // Tabs
  tabBase: "font-[family-name:var(--font-data)] text-[10px] px-3 py-1.5 rounded-full transition-colors",
  tabActive: "bg-[var(--color-green-light)] text-[var(--color-green-primary)] font-medium",
  tabInactive: "bg-gray-100 text-gray-500 hover:bg-gray-200",

  // Badges
  badge: "font-[family-name:var(--font-data)] text-[10px] px-2 py-0.5 rounded-full",
  badgeGreen: "bg-[var(--color-green-light)] text-[var(--color-green-primary)]",
  badgeYellow: "bg-yellow-100 text-yellow-700",
  badgeRed: "bg-red-100 text-red-700",
  badgeGray: "bg-gray-100 text-gray-500",
  badgeBlue: "bg-blue-100 text-blue-700",
  badgeOrange: "bg-orange-100 text-orange-700",

  // Progress bars
  barBg: "bg-gray-100 rounded-full overflow-hidden",
  barFill: "bg-[var(--color-green-primary)] rounded-full",

  // Colors (for inline styles or conditional logic)
  accent: "text-[var(--color-green-primary)]",
  accentBg: "bg-[var(--color-green-primary)]",
  accentLight: "text-[var(--color-green-light)]",
  yellow: "text-[var(--color-yellow-dark)]",
} as const
