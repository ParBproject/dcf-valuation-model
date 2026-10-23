/**
 * TypeScript port of the Python model (src/dcf/model). Parity with Python is enforced
 * to 0.01% by parity.test.ts against fixtures exported by scripts/export_engine_fixtures.py.
 */
import type { EngineParams, ForecastYear, Overrides, Valuation, ValuationError } from './types'

export const G_CAP = 0.04 // terminal.py
export const COST_OF_DEBT_CAP = 0.15 // wacc.py

export const blume = (beta: number) => 0.67 * beta + 0.33
export const costOfEquity = (rf: number, beta: number, erp: number) => rf + beta * erp

/** interest / debt bounded to [rf, 15%]; rf + spread when interest is missing. */
export function pretaxCostOfDebt(interest: number | null, debt: number, rf: number, spread = 0.01): number {
  if (interest === null || interest <= 0 || debt <= 0) return rf + spread
  return Math.min(Math.max(interest / debt, rf), COST_OF_DEBT_CAP)
}

export function wacc(e: number, d: number, ke: number, kd: number, tax: number): number {
  const v = e + d
  return (e / v) * ke + (d / v) * kd * (1 - tax)
}

/** CAT-style captive finance: net finance receivables against gross debt (floored at 0). */
export const netDebt = (gross: number, receivables: number) => Math.max(gross - receivables, 0)

export function linearPath(start: number, end: number, n: number): number[] {
  if (n === 1) return [end]
  return Array.from({ length: n }, (_, i) => start + ((end - start) * i) / (n - 1))
}

export function project(p: EngineParams, a: { growth_start: number; terminal_growth: number; target_margin: number; capex_to_rev: number; forecast_years: number },
  growthPath?: number[]): ForecastYear[] {
  const n = a.forecast_years
  const growth = growthPath ?? linearPath(a.growth_start, a.terminal_growth, n)
  const out: ForecastYear[] = []
  let revPrev = p.base_revenue
  for (let i = 0; i < n; i++) {
    const g = growth[i]!
    const m = p.base_margin + ((a.target_margin - p.base_margin) * (i + 1)) / n
    const rev = revPrev * (1 + g)
    const ebit = rev * m
    const nopat = ebit * (1 - p.tax_rate)
    const da = rev * p.da_to_rev
    const cx = rev * a.capex_to_rev
    const dn = p.nwc_to_rev * (rev - revPrev)
    out.push({ year: p.base_fiscal_year + i + 1, growth: g, revenue: rev, ebit_margin: m, ebit, nopat, d_and_a: da, capex: cx, delta_nwc: dn, fcff: nopat + da - cx - dn })
    revPrev = rev
  }
  return out
}

export const terminalFcf = (nopat: number, g: number, roic: number) => nopat * (1 - g / roic)

export function gordon(fcf: number, r: number, g: number): number {
  if (g > G_CAP) throw new RangeError(`g=${(g * 100).toFixed(2)}% exceeds the ${G_CAP * 100}% cap`)
  if (g >= r) throw new RangeError(`g=${(g * 100).toFixed(2)}% must be below WACC=${(r * 100).toFixed(2)}%`)
  return (fcf * (1 + g)) / (r - g)
}

export function resolve(p: EngineParams, o: Overrides) {
  const rf = o.rf ?? p.rf
  const erp = o.erp ?? p.erp
  const beta = o.beta ?? p.beta
  const ke = costOfEquity(rf, beta, erp)
  const kd = pretaxCostOfDebt(p.interest_expense, p.debt, rf, p.debt_spread)
  const wacc_shift = o.wacc_shift ?? 0
  return {
    growth_start: o.growth_start ?? p.growth_start,
    terminal_growth: o.terminal_growth ?? p.terminal_growth,
    target_margin: o.target_margin ?? p.target_margin,
    capex_to_rev: o.capex_to_rev ?? p.capex_to_rev,
    forecast_years: o.forecast_years ?? p.forecast_years,
    terminal_roic: o.terminal_roic === undefined ? p.terminal_roic : o.terminal_roic,
    rf, erp, beta, wacc_shift,
    cost_of_equity: ke,
    pretax_cost_of_debt: kd,
    wacc: wacc(p.market_cap, p.debt, ke, kd, p.tax_rate) + wacc_shift,
  }
}

export function value(p: EngineParams, o: Overrides = {}, growthPath?: number[]): Valuation | ValuationError {
  const inputs = resolve(p, o)
  const proj = project(p, inputs, growthPath)
  const last = proj[proj.length - 1]!
  const r = inputs.wacc
  const g = inputs.terminal_growth
  const fcfN = inputs.terminal_roic === null ? last.fcff : terminalFcf(last.nopat, g, inputs.terminal_roic)
  let tv: number
  try { tv = gordon(fcfN, r, g) } catch (e) { return { ok: false, error: (e as Error).message } }
  let pvF = 0
  let df = 1
  for (const y of proj) { df /= 1 + r; pvF += y.fcff * df }
  const pvTv = tv * df
  const ev = pvF + pvTv
  const eq = ev - p.debt + p.cash
  const price = eq / p.shares
  const tvX = (last.ebit + last.d_and_a) * p.exit_ev_ebitda
  const priceX = (pvF + tvX * df - p.debt + p.cash) / p.shares
  return {
    ok: true, inputs, forecast: proj, terminal_value: tv, enterprise_value: ev, pv_fcf: pvF, pv_tv: pvTv,
    tv_share_of_ev: pvTv / ev, equity_value: eq, implied_price: price, implied_price_exit_multiple: priceX,
    upside: price / p.market_price - 1,
  }
}

/** Fast path: per-share value only (used by the reverse-DCF solver). */
export function priceOnly(p: EngineParams, o: Overrides = {}, growthPath?: number[]): number {
  const v = value(p, o, growthPath)
  if (!v.ok) throw new RangeError(v.error)
  return v.implied_price
}
