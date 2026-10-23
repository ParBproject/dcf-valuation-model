/** Reverse DCF: constant explicit-period revenue growth at which value = market price.
 * Bisection on [-30%, 80%], same bracket and stopping rule as reverse_dcf.py. */
import { priceOnly } from './model'
import type { EngineParams, Overrides } from './types'

const LO = -0.3
const HI = 0.8

export function impliedGrowth(p: EngineParams, o: Overrides = {}, tol = 1e-7): number | null {
  const n = o.forecast_years ?? p.forecast_years
  const f = (g: number) => priceOnly(p, o, Array(n).fill(g)) - p.market_price
  let flo: number, fhi: number
  try { flo = f(LO); fhi = f(HI) } catch { return null }
  if (flo * fhi > 0) return null
  let a = LO, b = HI, m = (a + b) / 2
  for (let i = 0; i < 200; i++) {
    m = (a + b) / 2
    const fm = f(m)
    if (Math.abs(fm) < 1e-6 || b - a < tol) break
    if (fm > 0 === fhi > 0) b = m
    else a = m
  }
  return m
}
