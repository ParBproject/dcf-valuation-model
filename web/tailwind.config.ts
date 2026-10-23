import type { Config } from 'tailwindcss'
import { colors, fonts, spacing, radius, shadows } from './src/design/tokens'

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    spacing,
    extend: {
      colors: {
        bg: colors.bg,
        card: colors.card,
        line: colors.border,
        fg: colors.text,
        muted: colors.muted,
        accent: { DEFAULT: colors.accent, hover: colors.accentHover },
        negative: colors.negative,
        warning: colors.warning,
      },
      fontFamily: { sans: [...fonts.sans], mono: [...fonts.mono] },
      borderRadius: radius,
      boxShadow: { focus: shadows.focus, card: shadows.card },
    },
  },
  plugins: [],
} satisfies Config
