import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { useValuations } from '../data/useValuations'
import { useDcfStore, type Ticker } from '../store/useDcfStore'
import { buildOverrides } from '../engine/useLive'
import { serialize } from '../store/urlSync'
import { value } from '../engine/model'
import { Card } from '../components/ui/Card'
import { PageHeader } from './PageHeader'
import { ScrollX } from '../components/ui/ScrollX'
import { CompareBars } from '../charts/CompareBars'

type Key = 'ticker' | 'gap' | 'wacc' | 'tv' | 'prob'
const COLS: { k: Key; label: string }[] = [
  { k: 'ticker', label: 'Ticker' }, { k: 'gap', label: 'Value vs price' }, { k: 'wacc', label: 'WACC' }, { k: 'tv', label: 'TV share' }, { k: 'prob', label: 'P(value>price)' },
]

export function Compare() {
  const { data } = useValuations()
  const scenario = useDcfStore((s) => s.scenario)
  const pairing = useDcfStore((s) => s.pairing)
  const setTicker = useDcfStore((s) => s.setTicker)
  const nav = useNavigate()
  const [sort, setSort] = useState<{ k: Key; dir: 1 | -1 }>({ k: 'gap', dir: -1 })
  const rows = useMemo(() => !data ? [] : Object.entries(data.tickers).map(([t, r]) => {
    // shared scenario + rate pairing; per-company manual overrides are not carried across
    const v = value(r.engine, buildOverrides(r, scenario, pairing, {}))
    return { ticker: t, value: v.ok ? v.implied_price : null, price: r.engine.market_price, wacc: v.ok ? v.inputs.wacc : NaN,
      tv: v.ok ? v.tv_share_of_ev : NaN, gap: v.ok ? v.implied_price / r.engine.market_price - 1 : NaN, prob: r.monte_carlo.prob_value_gt_price }
  }), [data, scenario, pairing])
  const sorted = [...rows].sort((a, b) => {
    const x = a[sort.k], y = b[sort.k]
    return (typeof x === 'string' ? x.localeCompare(y as string) : (x as number) - (y as number)) * sort.dir
  })
  const open = (t: string) => {
    setTicker(t as Ticker)
    // carry the shared state (now with the new ticker) into the link
    const q = serialize(useDcfStore.getState())
    nav({ pathname: '/overview', search: q ? `?${q}` : '' })
  }
  return (
    <>
      <PageHeader title="Compare" sub={`All six companies under the ${scenario} scenario and ${pairing === 'snapshot' ? 'snapshot' : 'Damodaran'} rates. Click a company to open it.`} />
      <div className="grid gap-2 xl:grid-cols-2">
        <Card title="Implied value vs market price"><CompareBars rows={sorted} onPick={open} /></Card>
        <Card title="Table">
          <ScrollX label="Comparison table">
            <table className="num w-full min-w-[420px] text-right text-sm" data-testid="compare-table">
              <thead><tr>{COLS.map((c) => (
                <th key={c.k} className="px-1 py-1 font-medium text-muted first:text-left" aria-sort={sort.k === c.k ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                  <button type="button" className="hit rounded-control hover:text-fg focus-visible:shadow-focus" onClick={() => setSort((s) => ({ k: c.k, dir: s.k === c.k ? (s.dir === 1 ? -1 : 1) : -1 }))}>
                    {c.label}{sort.k === c.k ? (sort.dir === 1 ? ' ↑' : ' ↓') : ''}
                  </button>
                </th>))}</tr></thead>
              <tbody>{sorted.map((r) => (
                <tr key={r.ticker} className="cursor-pointer border-t border-line hover:bg-white/5" onClick={() => open(r.ticker)} data-row={r.ticker}>
                  <td className="px-1 py-1 text-left font-semibold">
                    <button type="button" className="hit rounded-control hover:text-accent focus-visible:shadow-focus" aria-label={`Open ${r.ticker}`}
                      onClick={(e) => { e.stopPropagation(); open(r.ticker) }}>{r.ticker}</button>
                  </td>
                  <td className={clsx('px-1', r.gap >= 0 ? 'text-accent' : 'text-negative')}>{Number.isFinite(r.gap) ? `${(r.gap * 100).toFixed(0)}%` : 'n/a'}</td>
                  <td className="px-1">{(r.wacc * 100).toFixed(2)}%</td><td className="px-1">{(r.tv * 100).toFixed(0)}%</td><td className="px-1">{(r.prob * 100).toFixed(1)}%</td>
                </tr>))}</tbody>
            </table>
          </ScrollX>
          <p className="mt-1 text-xs text-muted">P(value&gt;price) is from the committed base-case Monte Carlo (Python, 10,000 draws).</p>
        </Card>
      </div>
    </>
  )
}
