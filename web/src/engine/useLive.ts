import { useEffect, useMemo, useRef, useState } from 'react'
import { useValuations } from '../data/useValuations'
import { DAMODARAN_PAIR, useDcfStore } from '../store/useDcfStore'
import type { TickerResult, Scenario } from '../data/types'
import { value } from './model'
import { impliedGrowth } from './reverse'
import { recordRecompute } from './perf'
import type { McSummary } from './mc'
import type { EngineParams, Overrides, Valuation, ValuationError } from './types'
import type { Pairing, Assumptions } from '../store/useDcfStore'

const SCEN_KEYS = ['growth_start', 'terminal_growth', 'target_margin', 'capex_to_rev', 'forecast_years', 'terminal_roic'] as const

export function scenarioOverrides(t: TickerResult, s: Scenario): Overrides {
  if (s === 'base') return {}
  const sc = t.scenarios[s]
  const o: Overrides = { wacc_shift: sc.wacc - t.base.wacc }
  for (const k of SCEN_KEYS) {
    const v = sc.assumptions[k]
    if (v !== undefined) (o as Record<string, number | null>)[k] = v
  }
  return o
}

export function buildOverrides(t: TickerResult, s: Scenario, pairing: Pairing, a: Assumptions): Overrides {
  const o: Overrides = { ...scenarioOverrides(t, s) }
  if (pairing === 'damodaran') { o.rf = DAMODARAN_PAIR.rf; o.erp = DAMODARAN_PAIR.erp }
  return { ...o, ...a }
}

export interface Live {
  ticker: string
  t: TickerResult
  params: EngineParams
  overrides: Overrides
  result: Valuation | ValuationError
  base: Valuation
  /** scenario + pairing, without the user's manual overrides: what the sliders reset to */
  reference: Valuation | ValuationError
  impliedGrowth: number | null
  ms: number
}

export function useLive(): Live | null {
  const { data } = useValuations()
  const ticker = useDcfStore((s) => s.ticker)
  const scenario = useDcfStore((s) => s.scenario)
  const pairing = useDcfStore((s) => s.pairing)
  const assumptions = useDcfStore((s) => s.assumptions)
  return useMemo(() => {
    const t = data?.tickers[ticker]
    if (!t?.engine) return null
    const params = t.engine
    const t0 = performance.now()
    const overrides = buildOverrides(t, scenario, pairing, assumptions)
    const result = value(params, overrides)
    const base = value(params, {}) as Valuation
    const reference = value(params, buildOverrides(t, scenario, pairing, {}))
    const ig = result.ok ? impliedGrowth(params, overrides) : null
    // full recompute: valuation + base + reference + reverse-DCF solve
    const ms = performance.now() - t0
    recordRecompute(ms)
    return { ticker, t, params, overrides, result, base, reference, impliedGrowth: ig, ms }
  }, [data, ticker, scenario, pairing, assumptions])
}

/** Monte Carlo in a Web Worker; debounced so slider drags never queue up work. */
export function useMonteCarlo(live: Live | null, n = 10_000, seed = 20261022): { summary: McSummary | null; running: boolean } {
  const [summary, setSummary] = useState<McSummary | null>(null)
  const [running, setRunning] = useState(false)
  const worker = useRef<Worker | null>(null)
  const reqId = useRef(0)
  useEffect(() => {
    worker.current = new Worker(new URL('./mc.worker.ts', import.meta.url), { type: 'module' })
    worker.current.onmessage = (e: MessageEvent<{ id: number; summary: McSummary }>) => {
      if (e.data.id === reqId.current) { setSummary(e.data.summary); setRunning(false) }
    }
    return () => worker.current?.terminate()
  }, [])
  const key = live ? JSON.stringify([live.ticker, live.overrides]) : ''
  useEffect(() => {
    if (!live || !live.result.ok) return
    setRunning(true)
    const h = setTimeout(() => {
      reqId.current += 1
      worker.current?.postMessage({ id: reqId.current, params: live.params, overrides: live.overrides, n, seed })
    }, 150)
    return () => clearTimeout(h)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])
  return { summary, running }
}
