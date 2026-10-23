import { create } from 'zustand'
import type { Scenario } from '../data/types'

export const TICKERS = ['AAPL', 'MSFT', 'KO', 'JNJ', 'CAT', 'XOM'] as const
export type Ticker = (typeof TICKERS)[number]
export const SCENARIOS: readonly Scenario[] = ['bear', 'base', 'bull']

/** User overrides (absolute values, decimals) on top of the scenario's assumptions. */
export const ASSUMPTION_KEYS = [
  'growth_start', 'target_margin', 'capex_to_rev', 'terminal_roic',
  'rf', 'erp', 'beta', 'terminal_growth', 'forecast_years', 'wacc',
] as const
export type AssumptionKey = (typeof ASSUMPTION_KEYS)[number]
export type Assumptions = Partial<Record<AssumptionKey, number>>

/**
 * Risk-free / ERP pairing.
 *  snapshot:  rf = FRED DGS10 at snapshot date, ERP = Damodaran Jan-2026 implied ERP
 *  damodaran: Damodaran's matched pair, 4.18% T-bond with the 4.23% ERP derived from it
 */
export type Pairing = 'snapshot' | 'damodaran'
export const DAMODARAN_PAIR = { rf: 0.0418, erp: 0.0423, as_of: '2026-01-01' } as const

export interface DcfState {
  ticker: Ticker
  scenario: Scenario
  pairing: Pairing
  assumptions: Assumptions
  setTicker: (t: Ticker) => void
  setScenario: (s: Scenario) => void
  setPairing: (p: Pairing) => void
  setAssumption: (k: AssumptionKey, v: number) => void
  clearAssumption: (k: AssumptionKey) => void
  resetAssumptions: () => void
  hydrate: (s: Partial<Pick<DcfState, 'ticker' | 'scenario' | 'pairing' | 'assumptions'>>) => void
}

export const DEFAULTS = {
  ticker: 'AAPL' as Ticker, scenario: 'base' as Scenario, pairing: 'snapshot' as Pairing, assumptions: {} as Assumptions,
}

export const useDcfStore = create<DcfState>()((set) => ({
  ...DEFAULTS,
  // switching company clears overrides: they are company-specific
  setTicker: (ticker) => set({ ticker, assumptions: {} }),
  setScenario: (scenario) => set({ scenario }),
  setPairing: (pairing) => set((s) => {
    // a manual rf/ERP would silently defeat the toggle, so drop them
    const { rf: _rf, erp: _erp, ...rest } = s.assumptions
    return { pairing, assumptions: rest }
  }),
  setAssumption: (k, v) => set((s) => ({ assumptions: { ...s.assumptions, [k]: v } })),
  clearAssumption: (k) => set((s) => {
    const a = { ...s.assumptions }
    delete a[k]
    return { assumptions: a }
  }),
  resetAssumptions: () => set({ assumptions: {} }),
  hydrate: (p) => set((s) => ({ ...s, ...p })),
}))

/** Ephemeral UI state shared across charts (linked highlighting); not synced to the URL. */
interface UiState {
  hoverYear: number | null
  setHoverYear: (y: number | null) => void
}
export const useUiStore = create<UiState>()((set) => ({
  hoverYear: null,
  setHoverYear: (hoverYear) => set({ hoverYear }),
}))
