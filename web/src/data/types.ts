import type { EngineParams } from '../engine/types'
/** Subset of results/valuations.json (schema 1.x) used by the app. */
export type Scenario = 'bear' | 'base' | 'bull'

export interface BaseValuation {
  ticker: string
  base_fiscal_year: number
  wacc: number
  implied_price: number
  implied_price_exit_multiple: number
  market_price: number
  upside: number
  tv_share_of_ev: number
  enterprise_value: number
  equity_value: number
  inputs: {
    rf: number
    erp: number
    beta: number
    beta_method: string
    betas: { yfinance: number; regression_raw: number | null; regression_blume: number | null; n_months: number }
    cost_of_equity: number
    pretax_cost_of_debt: number
    tax_rate: number
    debt: number
    cash: number
    market_cap: number
    shares: number
  }
  assumptions: {
    growth_start: number
    terminal_growth: number
    target_margin: number
    capex_to_rev: number
    da_to_rev: number
    nwc_to_rev: number
    exit_ev_ebitda: number
  }
  notes: string[]
}

export interface ScenarioResult {
  assumptions: Record<string, number | null>
  implied_price: number
  upside: number
  wacc: number
  terminal_growth: number
  tv_share_of_ev: number
}

export interface TickerResult {
  base: BaseValuation
  scenarios: Record<Scenario, ScenarioResult>
  monte_carlo: {
    n_draws: number
    percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number }
    prob_value_gt_price: number
  }
  reverse_dcf: { implied_growth: number | null; implied_growth_margin_held?: number | null; historical_cagr?: number; status: string; years?: number }
  engine: EngineParams
}

export interface Valuations {
  schema_version: string
  snapshot_date: string
  rates: { rf: number; rf_date: string; erp: { value: number; as_of: string; source: string } }
  tickers: Record<string, TickerResult>
}
