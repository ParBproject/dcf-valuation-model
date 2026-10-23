import { useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ASSUMPTION_KEYS, DEFAULTS, SCENARIOS, TICKERS, useDcfStore,
  type Assumptions, type DcfState, type Ticker,
} from './useDcfStore'
import type { Scenario } from '../data/types'

type Shared = Pick<DcfState, 'ticker' | 'scenario' | 'assumptions'> & { pairing?: DcfState['pairing'] }

/** Bounds keep hand-edited URLs from producing nonsense inputs. */
export const BOUNDS: Record<(typeof ASSUMPTION_KEYS)[number], [number, number]> = {
  growth_start: [-0.3, 0.6],
  target_margin: [-0.2, 0.8],
  capex_to_rev: [0, 0.6],
  terminal_roic: [0.03, 0.6],
  rf: [0, 0.1],
  erp: [0, 0.12],
  beta: [0, 3],
  terminal_growth: [-0.02, 0.04],
  forecast_years: [3, 15],
  wacc: [0.02, 0.25],
}

/** State -> query string. Defaults are omitted so share links stay short. */
export function serialize(s: Shared): string {
  const q = new URLSearchParams()
  if (s.ticker !== DEFAULTS.ticker) q.set('t', s.ticker)
  if (s.scenario !== DEFAULTS.scenario) q.set('s', s.scenario)
  if (s.pairing && s.pairing !== DEFAULTS.pairing) q.set('p', s.pairing)
  for (const k of ASSUMPTION_KEYS) {
    const v = s.assumptions[k]
    if (v !== undefined) q.set(k, String(Number(v.toFixed(6))))
  }
  return q.toString()
}

/** Query string -> validated partial state. Unknown or invalid values are dropped. */
export function parse(search: string | URLSearchParams): Partial<Shared> {
  const q = typeof search === 'string' ? new URLSearchParams(search) : search
  const out: Partial<Shared> = {}
  const t = q.get('t')?.toUpperCase()
  if (t && (TICKERS as readonly string[]).includes(t)) out.ticker = t as Ticker
  const s = q.get('s')
  if (s && (SCENARIOS as readonly string[]).includes(s)) out.scenario = s as Scenario
  const pr = q.get('p')
  if (pr === 'damodaran' || pr === 'snapshot') out.pairing = pr
  const a: Assumptions = {}
  for (const k of ASSUMPTION_KEYS) {
    const raw = q.get(k)
    if (raw === null) continue
    const v = Number(raw)
    const [lo, hi] = BOUNDS[k]
    if (Number.isFinite(v) && v >= lo && v <= hi) a[k] = k === 'forecast_years' ? Math.round(v) : v
  }
  if (Object.keys(a).length) out.assumptions = a
  return out
}

/** Two-way sync: URL -> store once on mount, then store -> URL (replace, no history spam). */
export function useUrlSync(): void {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const hydrated = useRef(false)
  useEffect(() => {
    if (!hydrated.current) {
      useDcfStore.getState().hydrate({ ...DEFAULTS, ...parse(params) })
      hydrated.current = true
    }
    return useDcfStore.subscribe((s) => {
      const next = serialize(s)
      if (next !== new URLSearchParams(window.location.hash.split('?')[1] ?? '').toString()) {
        // read the current path at write time: the subscription outlives route changes, and
        // react-router's setSearchParams would navigate back to the path it was created on
        const pathname = window.location.hash.slice(1).split('?')[0] || '/'
        navigate({ pathname, search: next ? `?${next}` : '' }, { replace: true })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
