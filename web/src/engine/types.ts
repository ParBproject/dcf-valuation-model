/** Engine inputs: `tickers[T].engine` in valuations.json (schema >= 1.2.0). */
export interface EngineParams {
  base_fiscal_year: number
  base_revenue: number
  base_margin: number
  tax_rate: number
  rf: number
  erp: number
  beta: number
  beta_method: string
  betas: { yfinance: number; regression_raw: number | null; regression_blume: number | null; n_months: number }
  interest_expense: number | null
  debt_spread: number
  debt: number
  gross_debt: number
  finance_receivables_netted: number
  cash: number
  market_cap: number
  shares: number
  market_price: number
  wacc: number
  growth_start: number
  terminal_growth: number
  target_margin: number
  capex_to_rev: number
  da_to_rev: number
  nwc_to_rev: number
  exit_ev_ebitda: number
  forecast_years: number
  terminal_roic: number | null
}

/** Model-level overrides (absolute values) plus rate inputs and a scenario WACC shift. */
export interface Overrides {
  growth_start?: number
  terminal_growth?: number
  target_margin?: number
  capex_to_rev?: number
  forecast_years?: number
  terminal_roic?: number | null
  rf?: number
  erp?: number
  beta?: number
  wacc_shift?: number
}

export interface ForecastYear {
  year: number; growth: number; revenue: number; ebit_margin: number; ebit: number
  nopat: number; d_and_a: number; capex: number; delta_nwc: number; fcff: number
}

export interface Valuation {
  ok: true
  inputs: Required<Omit<Overrides, 'terminal_roic'>> & { terminal_roic: number | null; cost_of_equity: number; pretax_cost_of_debt: number; wacc: number }
  forecast: ForecastYear[]
  terminal_value: number
  enterprise_value: number
  pv_fcf: number
  pv_tv: number
  tv_share_of_ev: number
  equity_value: number
  implied_price: number
  implied_price_exit_multiple: number
  upside: number
}

export interface ValuationError { ok: false; error: string }
