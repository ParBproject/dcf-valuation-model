import { colors } from '../design/tokens'
export const C = {
  ...colors,
  grid: '#1A2330',
  hist: '#475569',
  histHover: '#64748B',
  accentSoft: 'rgba(16,185,129,0.25)',
}
export const FONT_MONO = '"JetBrains Mono", ui-monospace, monospace'
export const fmtUsdShort = (v: number) => {
  const a = Math.abs(v)
  const s = a >= 1e12 ? `${(a / 1e12).toFixed(2)}T` : a >= 1e9 ? `${(a / 1e9).toFixed(1)}B` : a >= 1e6 ? `${(a / 1e6).toFixed(0)}M` : a.toFixed(0)
  return `${v < 0 ? '−' : ''}$${s}`
}
