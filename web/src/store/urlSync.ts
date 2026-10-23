import { useEffect, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  ASSUMPTION_KEYS, DEFAULTS, SCENARIOS, TICKERS, useDcfStore,
  type Assumptions, type DcfState, type Ticker,
} from './useDcfStore'
import type { Scenario } from '../data/types'

type Shared = Pick<DcfState, 'ticker' | 'scenario' | 'assumptions'>

/** Bounds keep hand-edited URLs from producing nonsense inputs. */
const BOUNDS: Record<(typeof ASSUMPTION_KEYS)[number], [number, number]> = {
  growth_start: [-0.3, 0.6],
  target_margin: [-0.2, 0.8],
  wacc: [0.02, 0.25],
  terminal_growth: [-0.02, 0.04],
  capex_to_rev: [0, 0.6],
}

/** State -> query string. Defaults are omitted so share links stay short. */
export function serialize(s: Shared): string {
  const q = new URLSearchParams()
  if (s.ticker !== DEFAULTS.ticker) q.set('t', s.ticker)
  if (s.scenario !== DEFAULTS.scenario) q.set('s', s.scenario)
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
  const a: Assumptions = {}
  for (const k of ASSUMPTION_KEYS) {
    const raw = q.get(k)
    if (raw === null) continue
    const v = Number(raw)
    const [lo, hi] = BOUNDS[k]
    if (Number.isFinite(v) && v >= lo && v <= hi) a[k] = v
  }
  if (Object.keys(a).length) out.assumptions = a
  return out
}

/** Two-way sync: URL -> store once on mount, then store -> URL (replace, no history spam). */
export function useUrlSync(): void {
  const [params, setParams] = useSearchParams()
  const hydrated = useRef(false)
  useEffect(() => {
    if (!hydrated.current) {
      useDcfStore.getState().hydrate({ ...DEFAULTS, ...parse(params) })
      hydrated.current = true
    }
    return useDcfStore.subscribe((s) => {
      const next = serialize(s)
      if (next !== new URLSearchParams(window.location.hash.split('?')[1] ?? '').toString()) {
        setParams(new URLSearchParams(next), { replace: true })
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
}
