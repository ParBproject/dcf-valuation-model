/**
 * Design tokens: the single source of truth for colour, type, spacing and radius.
 * Tailwind's theme is generated from this file (see tailwind.config.ts).
 */
export const colors = {
  bg: '#0B0F14',
  card: '#111827',
  border: '#1F2937',
  text: '#E5E7EB',
  muted: '#9CA3AF',
  accent: '#10B981',
  accentHover: '#34D399',
  negative: '#F87171',
  warning: '#FBBF24',
} as const

export const fonts = {
  sans: ['Inter', 'system-ui', 'sans-serif'],
  mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
} as const

/** 8px grid: spacing.n = n * 8px */
export const GRID = 8
export const spacing = Object.fromEntries(
  [0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 32, 48].map((n) => [String(n), `${n * GRID}px`]),
) as Record<string, string>

export const radius = { card: '12px', control: '8px', pill: '9999px' } as const

export const shadows = {
  focus: '0 0 0 2px rgba(16,185,129,0.55), 0 0 16px rgba(16,185,129,0.25)',
  card: '0 1px 0 rgba(255,255,255,0.03) inset',
} as const

export const motion = { fast: 0.15, base: 0.25, spring: { type: 'spring', stiffness: 380, damping: 32 } } as const
