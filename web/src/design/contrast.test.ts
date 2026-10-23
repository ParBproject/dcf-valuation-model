import { describe, expect, it } from 'vitest'
import { colors } from './tokens'
import { blend, contrast } from './contrast'

// Every foreground/background pairing the UI actually uses. AA: 4.5 for text, 3 for UI graphics.
const surfaces = { bg: colors.bg, card: colors.card }
const textTokens = ['text', 'muted', 'accent', 'accentHover', 'negative', 'warning'] as const
type Pair = { fg: string; bg: string; name: string; min: number }
const pairs: Pair[] = [
  ...textTokens.flatMap((t) => Object.entries(surfaces).map(([s, bg]) => ({ name: `${t} on ${s}`, fg: colors[t], bg, min: 4.5 }))),
  { name: 'bg on accent (primary button, active tab)', fg: colors.bg, bg: colors.accent, min: 4.5 },
  { name: 'bg on accentHover (primary button hover)', fg: colors.bg, bg: colors.accentHover, min: 4.5 },
  { name: 'accent on accent/10 over bg (active nav item)', fg: colors.accent, bg: blend(colors.accent, colors.bg, 0.1), min: 4.5 },
  { name: 'warning on warning/10 over card (alerts)', fg: colors.warning, bg: blend(colors.warning, colors.card, 0.1), min: 4.5 },
  { name: 'warning on warning/10 over bg (alerts)', fg: colors.warning, bg: blend(colors.warning, colors.bg, 0.1), min: 4.5 },
  { name: 'text on #0F1620 (chart tooltip)', fg: colors.text, bg: '#0F1620', min: 4.5 },
  { name: 'muted on #0F1620 (chart tooltip)', fg: colors.muted, bg: '#0F1620', min: 4.5 },
  // non-text (WCAG 1.4.11): focus ring, slider knob, chart marks
  { name: 'focus ring accentHover vs bg', fg: colors.accentHover, bg: colors.bg, min: 3 },
  { name: 'focus ring accentHover vs card', fg: colors.accentHover, bg: colors.card, min: 3 },
  { name: 'accent chart marks vs card', fg: colors.accent, bg: colors.card, min: 3 },
  { name: 'negative chart marks vs card', fg: colors.negative, bg: colors.card, min: 3 },
]

describe('WCAG AA contrast for design-token pairs', () => {
  it.each(pairs)('$name ≥ $min', ({ fg, bg, min }) => {
    expect(contrast(fg, bg)).toBeGreaterThanOrEqual(min)
  })
  it('computes known reference ratios', () => {
    expect(contrast('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
    expect(contrast('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2)
  })
})

// Written out for docs/a11y.md
export const CONTRAST_TABLE = pairs.map((p) => ({ ...p, ratio: +contrast(p.fg, p.bg).toFixed(2) }))
