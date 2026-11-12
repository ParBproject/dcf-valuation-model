import { describe, expect, it } from 'vitest'
import { value } from './model'
import type { EngineParams } from './types'

/** Same closed form as tests/test_model.py::test_captive_cost_of_debt_uses_gross_balance. */
function captiveParams(interest: number, gross: number, net: number): EngineParams {
  return {
    base_fiscal_year: 2025,
    base_revenue: 1000,
    base_margin: 0.2,
    tax_rate: 0.25,
    rf: 0.04,
    erp: 0.06,
    beta: 1,
    beta_method: 'config override',
    betas: { yfinance: 1, regression_raw: null, regression_blume: null, n_months: 0 },
    interest_expense: interest,
    debt_spread: 0.01,
    debt: net,
    gross_debt: gross,
    finance_receivables_netted: gross - net,
    cash: 50,
    market_cap: 750,
    shares: 100,
    market_price: 7.5,
    wacc: 0, // recomputed; left wrong on purpose so a stale field cannot pass the test
    growth_start: 0,
    terminal_growth: 0,
    target_margin: 0.2,
    capex_to_rev: 0,
    da_to_rev: 0,
    nwc_to_rev: 0,
    exit_ev_ebitda: 8,
    forecast_years: 1,
    terminal_roic: 0.15,
  }
}

describe('captive cost of debt', () => {
  it('divides interest by gross debt and discounts the hand-computed bridge', () => {
    // ke = 0.10, kd = 80/1000 = 0.08 (80/250 = 0.32 would cap at 15%)
    // WACC = 0.75*0.10 + 0.25*0.08*0.75 = 0.09
    // NOPAT = 150, g = 0, EV = 150/0.09, equity = EV - 250 + 50, price = equity/100
    const v = value(captiveParams(80, 1000, 250))
    expect(v.ok).toBe(true)
    if (!v.ok) return
    expect(v.inputs.pretax_cost_of_debt).toBeCloseTo(0.08, 10)
    expect(v.inputs.cost_of_equity).toBeCloseTo(0.1, 10)
    expect(v.inputs.wacc).toBeCloseTo(0.09, 10)
    const ev = 150 / 0.09
    expect(v.enterprise_value).toBeCloseTo(ev, 8)
    expect(v.equity_value).toBeCloseTo(ev - 200, 8)
    expect(v.implied_price).toBeCloseTo((ev - 200) / 100, 8)
  })

  it('keeps a negative net-debt claim (cash above net debt) in the bridge', () => {
    const p = captiveParams(80, 1000, 250)
    p.cash = 400 // net debt = 250 - 400 = -150
    const v = value(p)
    expect(v.ok).toBe(true)
    if (!v.ok) return
    const ev = 150 / 0.09
    expect(v.equity_value).toBeCloseTo(ev - 250 + 400, 6)
    expect(v.equity_value).toBeGreaterThan(v.enterprise_value)
  })
})
