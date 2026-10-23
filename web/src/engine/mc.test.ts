import { describe, expect, it } from 'vitest'
import fixtures from './__fixtures__/parity.json'
import { mulberry32, percentile, runMc, simulate, triangular } from './mc'
import type { EngineParams } from './types'

type Fx = { params: EngineParams; monte_carlo: { percentiles: Record<string, number>; prob_value_gt_price: number } }
const tickers = (fixtures as unknown as { tickers: Record<string, Fx> }).tickers

/**
 * Documented tolerance (10,000 draws, different PRNG from NumPy):
 *   P50 within 2%, P25/P75 within 3%, P5/P95 within 5% (relative), P(value>price) within 2pp.
 * Sampling error alone is ~1% at the median and ~2-3% in the 5%/95% tails.
 */
const TOL: Record<string, number> = { p5: 0.05, p25: 0.03, p50: 0.02, p75: 0.03, p95: 0.05 }

describe('Monte Carlo vs Python', () => {
  for (const [t, fx] of Object.entries(tickers)) {
    it(`${t} percentiles within tolerance`, () => {
      const s = runMc(fx.params)
      for (const [k, tol] of Object.entries(TOL)) {
        const py = fx.monte_carlo.percentiles[k]!
        const got = s.percentiles[k as keyof typeof s.percentiles]
        expect(Math.abs(got / py - 1), `${k} ${got} vs ${py}`).toBeLessThan(tol)
      }
      expect(Math.abs(s.prob_value_gt_price - fx.monte_carlo.prob_value_gt_price)).toBeLessThan(0.02)
    })
  }
})

describe('MC primitives', () => {
  it('PRNG is seeded and deterministic', () => {
    const a = mulberry32(1), b = mulberry32(1)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })
  it('triangular inverse CDF hits bounds and mode', () => {
    expect(triangular(0, 0.01, 0.025, 0.035)).toBeCloseTo(0.01)
    expect(triangular(1, 0.01, 0.025, 0.035)).toBeCloseTo(0.035)
    expect(triangular(0.6, 0.01, 0.025, 0.035)).toBeCloseTo(0.025)
  })
  it('percentile uses NumPy linear interpolation', () => {
    expect(percentile(Float64Array.from([1, 2, 3, 4]), 50)).toBe(2.5)
  })
  it('same seed gives same draws; small n is fast', () => {
    const p = tickers.KO!.params
    expect(simulate(p, {}, 200, 7)).toEqual(simulate(p, {}, 200, 7))
  })
})
