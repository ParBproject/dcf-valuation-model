/** Live WACC × g grid and tornado; same steps and shocks as src/dcf/analysis/sensitivity.py. */
import { resolve, value } from './model'
import type { EngineParams, Overrides } from './types'

export const WACC_STEPS = [-0.02, -0.01, 0, 0.01, 0.02]
export const G_VALUES = [0.01, 0.015, 0.02, 0.025, 0.03, 0.035, 0.04]
export const TORNADO_SHOCKS = {
  growth_start: 0.02, target_margin: 0.02, wacc: 0.01, terminal_growth: 0.005, capex_to_rev: 0.01, tax_rate: 0.02,
} as const
export type TornadoDriver = keyof typeof TORNADO_SHOCKS

const safe = (p: EngineParams, o: Overrides) => { const v = value(p, o); return v.ok ? v.implied_price : null }

export function grid(p: EngineParams, o: Overrides) {
  const base = resolve(p, o)
  const waccs = WACC_STEPS.map((d) => base.wacc + d)
  return { waccs, gs: G_VALUES, price: waccs.map((w) => G_VALUES.map((g) => safe(p, { ...o, wacc: w, terminal_growth: g }))) }
}

export interface TornadoRow { driver: TornadoDriver; shock: number; base_value: number; low: number | null; high: number | null; swing: number }

export function tornado(p: EngineParams, o: Overrides): { base: number | null; rows: TornadoRow[] } {
  const r = resolve(p, o)
  const rows = (Object.keys(TORNADO_SHOCKS) as TornadoDriver[]).map((k) => {
    const s = TORNADO_SHOCKS[k]
    const bv = r[k] as number
    const low = safe(p, { ...o, wacc: r.wacc, [k]: bv - s })
    const high = safe(p, { ...o, wacc: r.wacc, [k]: bv + s })
    return { driver: k, shock: s, base_value: bv, low, high, swing: low === null || high === null ? 0 : Math.abs(high - low) }
  })
  rows.sort((a, b) => b.swing - a.swing)
  return { base: safe(p, o), rows }
}
