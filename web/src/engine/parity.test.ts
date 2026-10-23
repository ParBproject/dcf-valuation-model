import { describe, expect, it } from 'vitest'
import fixtures from './__fixtures__/parity.json'
import { value } from './model'
import { impliedGrowth } from './reverse'
import type { EngineParams, Overrides } from './types'

/** Hard gate: every TS output within 0.01% (relative) of the Python model. */
const REL = 1e-4
const close = (a: number, b: number) => Math.abs(a - b) <= REL * Math.max(Math.abs(b), 1e-12)

type Fx = { params: EngineParams; cases: { name: string; overrides: Overrides; expected: Record<string, number> }[]
  reverse_dcf: { implied_growth: number | null; implied_growth_margin_held: number | null } }
const tickers = (fixtures as unknown as { tickers: Record<string, Fx> }).tickers

describe('parity with Python (0.01%)', () => {
  for (const [t, fx] of Object.entries(tickers)) {
    for (const c of fx.cases) {
      it(`${t} ${c.name}`, () => {
        const v = value(fx.params, c.overrides)
        expect(v.ok).toBe(true)
        if (!v.ok) return
        for (const k of ['wacc', 'implied_price', 'implied_price_exit_multiple', 'enterprise_value', 'terminal_value', 'tv_share_of_ev'] as const) {
          const got = k === 'wacc' ? v.inputs.wacc : v[k]
          expect(close(got, c.expected[k]!), `${k}: ${got} vs ${c.expected[k]}`).toBe(true)
        }
      })
    }
    it(`${t} reverse DCF`, () => {
      const g = impliedGrowth(fx.params)
      const held = impliedGrowth({ ...fx.params, target_margin: fx.params.base_margin })
      // solver tolerance 1e-7 on growth; compare absolutely at 1e-5 (0.001pp)
      expect(Math.abs(g! - fx.reverse_dcf.implied_growth!)).toBeLessThan(1e-5)
      expect(Math.abs(held! - fx.reverse_dcf.implied_growth_margin_held!)).toBeLessThan(1e-5)
    })
  }
})
