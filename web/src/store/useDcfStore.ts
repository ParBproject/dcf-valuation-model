import { create } from 'zustand'
import type { Scenario } from '../data/types'

export const TICKERS = ['AAPL', 'MSFT', 'KO', 'JNJ', 'CAT', 'XOM'] as const
export type Ticker = (typeof TICKERS)[number]
export const SCENARIOS: readonly Scenario[] = ['bear', 'base', 'bull']

/** User overrides on top of the model's base assumptions (decimals, e.g. 0.025). */
export const ASSUMPTION_KEYS = ['growth_start', 'target_margin', 'wacc', 'terminal_growth', 'capex_to_rev'] as const
export type AssumptionKey = (typeof ASSUMPTION_KEYS)[number]
export type Assumptions = Partial<Record<AssumptionKey, number>>

export interface DcfState {
  ticker: Ticker
  scenario: Scenario
  assumptions: Assumptions
  setTicker: (t: Ticker) => void
  setScenario: (s: Scenario) => void
  setAssumption: (k: AssumptionKey, v: number) => void
  resetAssumptions: () => void
  hydrate: (s: Partial<Pick<DcfState, 'ticker' | 'scenario' | 'assumptions'>>) => void
}

export const DEFAULTS = { ticker: 'AAPL' as Ticker, scenario: 'base' as Scenario, assumptions: {} as Assumptions }

export const useDcfStore = create<DcfState>()((set) => ({
  ...DEFAULTS,
  // switching company clears overrides: they are company-specific
  setTicker: (ticker) => set({ ticker, assumptions: {} }),
  setScenario: (scenario) => set({ scenario }),
  setAssumption: (k, v) => set((s) => ({ assumptions: { ...s.assumptions, [k]: v } })),
  resetAssumptions: () => set({ assumptions: {} }),
  hydrate: (p) => set((s) => ({ ...s, ...p })),
}))
