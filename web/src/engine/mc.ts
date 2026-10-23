/**
 * Monte Carlo, same distributions as src/dcf/analysis/montecarlo.py:
 *   growth_start ~ N(base, 3pp) clipped [-10%, 25%]; target_margin ~ N(base, 2pp) clipped [1%, 60%]
 *   wacc ~ N(base, 1pp) clipped [rf, 20%]; g ~ Triangular(1%, base, 3.5%)
 *   (w, g) pairs with g >= w - 0.5pp are rejected and redrawn.
 * The PRNG differs from NumPy's (mulberry32 + Box-Muller), so results agree statistically,
 * not draw-for-draw. Tolerance vs Python at 10,000 draws: see mc.test.ts.
 */
import type { EngineParams } from './types'
import { resolve } from './model'
import type { Overrides } from './types'

export const SPREAD = 0.005

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function normal(rand: () => number): () => number {
  let spare: number | null = null
  return () => {
    if (spare !== null) { const s = spare; spare = null; return s }
    let u = 0
    while (u === 0) u = rand()
    const v = rand()
    const r = Math.sqrt(-2 * Math.log(u))
    spare = r * Math.sin(2 * Math.PI * v)
    return r * Math.cos(2 * Math.PI * v)
  }
}

export function triangular(u: number, a: number, c: number, b: number): number {
  const m = Math.min(Math.max(c, a), b)
  const f = (m - a) / (b - a)
  return u < f ? a + Math.sqrt(u * (b - a) * (m - a)) : b - Math.sqrt((1 - u) * (b - a) * (b - m))
}

const clip = (x: number, lo: number, hi: number) => Math.min(Math.max(x, lo), hi)

export function percentile(sorted: Float64Array, q: number): number {
  // NumPy default ("linear") interpolation
  const h = (sorted.length - 1) * (q / 100)
  const lo = Math.floor(h)
  const hi = Math.min(lo + 1, sorted.length - 1)
  return sorted[lo]! + (h - lo) * (sorted[hi]! - sorted[lo]!)
}

export interface McSummary {
  n_draws: number; seed: number
  percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number }
  mean: number; prob_value_gt_price: number
  histogram: { edges: number[]; counts: number[] }
  ms: number
}

export function simulate(p: EngineParams, o: Overrides = {}, n = 10_000, seed = 20261022): Float64Array {
  const a = resolve(p, o)
  const rand = mulberry32(seed)
  const nrm = normal(rand)
  const out = new Float64Array(n)
  const years = a.forecast_years
  const t = p.tax_rate
  for (let k = 0; k < n; k++) {
    const gs = clip(a.growth_start + 0.03 * nrm(), -0.1, 0.25)
    const tm = clip(a.target_margin + 0.02 * nrm(), 0.01, 0.6)
    let w = clip(a.wacc + 0.01 * nrm(), a.rf, 0.2)
    let g = triangular(rand(), 0.01, a.terminal_growth, 0.035)
    while (g >= w - SPREAD) {
      w = clip(a.wacc + 0.01 * nrm(), a.rf, 0.2)
      g = triangular(rand(), 0.01, a.terminal_growth, 0.035)
    }
    let revPrev = p.base_revenue, pv = 0, df = 1, nopat = 0, fcf = 0
    for (let i = 0; i < years; i++) {
      const frac = years > 1 ? i / (years - 1) : 1
      const gi = gs + (g - gs) * frac
      const mi = p.base_margin + ((tm - p.base_margin) * (i + 1)) / years
      const rev = revPrev * (1 + gi)
      nopat = rev * mi * (1 - t)
      fcf = nopat + rev * p.da_to_rev - rev * a.capex_to_rev - p.nwc_to_rev * (rev - revPrev)
      df /= 1 + w
      pv += fcf * df
      revPrev = rev
    }
    const fcfN = a.terminal_roic === null ? fcf : nopat * (1 - g / a.terminal_roic)
    const tv = (fcfN * (1 + g)) / (w - g)
    out[k] = (pv + tv * df - p.debt + p.cash) / p.shares
  }
  return out
}

export function summarize(x: Float64Array, price: number, seed: number, bins = 40, ms = 0): McSummary {
  const s = Float64Array.from(x).sort()
  let gt = 0, sum = 0
  for (const v of s) { sum += v; if (v > price) gt++ }
  const lo = percentile(s, 1), hi = percentile(s, 99)
  const counts = new Array<number>(bins).fill(0)
  const width = (hi - lo) / bins || 1
  for (const v of s) counts[Math.min(bins - 1, Math.max(0, Math.floor((clip(v, lo, hi) - lo) / width)))]!++
  return {
    n_draws: s.length, seed,
    percentiles: { p5: percentile(s, 5), p25: percentile(s, 25), p50: percentile(s, 50), p75: percentile(s, 75), p95: percentile(s, 95) },
    mean: sum / s.length, prob_value_gt_price: gt / s.length,
    histogram: { edges: Array.from({ length: bins + 1 }, (_, i) => lo + i * width), counts }, ms,
  }
}

export function runMc(p: EngineParams, o: Overrides = {}, n = 10_000, seed = 20261022): McSummary {
  const t0 = performance.now()
  const x = simulate(p, o, n, seed)
  return summarize(x, p.market_price, seed, 40, performance.now() - t0)
}
