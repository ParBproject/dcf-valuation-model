import { useMemo, useState } from 'react'
import { useLive } from '../engine/useLive'
import { useDcfStore, useUiStore, type AssumptionKey } from '../store/useDcfStore'
import { Card } from '../components/ui/Card'
import { PageHeader } from './PageHeader'
import { FcfBars, type FcfPoint } from '../charts/FcfBars'
import { Waterfall, type StepKey } from '../charts/Waterfall'
import { DrillPanel } from '../components/ui/DrillPanel'
import { Sparkline } from '../charts/Sparkline'
import { fmtUsdShort } from '../charts/theme'
import { clsx } from 'clsx'
import type { TickerResult } from '../data/types'
import { ScrollX } from '../components/ui/ScrollX'
import type { Valuation } from '../engine/types'

const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`

const EDITABLE: { key: AssumptionKey; label: string; kind: 'pct' | 'yrs' }[] = [
  { key: 'growth_start', label: 'Growth yr 1', kind: 'pct' },
  { key: 'terminal_growth', label: 'Terminal g', kind: 'pct' },
  { key: 'target_margin', label: 'Target margin', kind: 'pct' },
  { key: 'capex_to_rev', label: 'Capex / rev', kind: 'pct' },
  { key: 'terminal_roic', label: 'Terminal ROIC', kind: 'pct' },
  { key: 'forecast_years', label: 'Horizon', kind: 'yrs' },
]

function EditCell({ k, kind, value, label }: { k: AssumptionKey; kind: 'pct' | 'yrs'; value: number; label: string }) {
  const set = useDcfStore((s) => s.setAssumption)
  const shown = kind === 'pct' ? +(value * 100).toFixed(2) : value
  const [txt, setTxt] = useState<string | null>(null)
  const commit = () => {
    if (txt === null) return
    const n = Number(txt)
    if (txt.trim() !== '' && Number.isFinite(n)) set(k, kind === 'pct' ? n / 100 : Math.round(Math.min(Math.max(n, 3), 15)))
    setTxt(null)
  }
  return (
    <input aria-label={label} data-key={k} value={txt ?? String(shown)} onChange={(e) => setTxt(e.target.value)} onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()} inputMode="decimal"
      className="num h-[44px] w-full rounded-control border border-line bg-bg px-1 lg:h-4 text-right text-sm focus:border-accent focus:outline-none focus-visible:shadow-focus" />
  )
}

function Item({ label, value, src }: { label: string; value: string; src?: { tag: string; accn?: string; filed?: string } }) {
  return (
    <div className="border-b border-line py-1 last:border-b-0">
      <div className="flex items-baseline justify-between gap-2 text-sm"><span className="text-muted">{label}</span><span className="num text-fg">{value}</span></div>
      {src && <div className="num mt-0.5 break-all text-[11px] text-muted">{src.tag}{src.accn && <> · accn {src.accn}</>}{src.filed && <> · filed {src.filed}</>}</div>}
    </div>
  )
}

const TITLE: Record<StepKey, string> = { pv_fcf: 'PV of forecast FCF', pv_tv: 'PV of terminal value', ev: 'Enterprise value', debt: 'Debt', cash: 'Cash & short-term investments', equity: 'Equity value' }

function Drill({ k, t, v }: { k: StepKey; t: TickerResult; v: Valuation }) {
  const ys = t.history.years
  const last = ys[ys.length - 1]!
  const series = (f: string) => ys.filter((y) => y.values[f] != null).map((y) => ({ x: y.fiscal_year, y: y.values[f] as number }))
  const val = (f: string) => last.values[f]
  const S = (f: string) => last.sources[f]
  const p = t.engine
  const r = v.inputs.wacc
  switch (k) {
    case 'pv_fcf': {
      let df = 1
      return (<>
        <p className="mb-1 text-sm text-muted">Each forecast year's FCFF = NOPAT + D&A − capex − ΔNWC, discounted at WACC {pct(r, 2)}.</p>
        {v.forecast.map((f) => { df /= 1 + r; return <Item key={f.year} label={`FY${f.year}`} value={`${fmtUsdShort(f.fcff)} → PV ${fmtUsdShort(f.fcff * df)}`} /> })}
        <h3 className="mt-2 text-xs uppercase text-muted">Historical FCFF trend</h3>
        <Sparkline points={ys.filter((y) => y.fcff !== null).map((y) => ({ x: y.fiscal_year, y: y.fcff! }))} format={fmtUsdShort} />
        <h3 className="mt-2 text-xs uppercase text-muted">Source filing (FY{last.fiscal_year})</h3>
        {['revenue', 'operating_income', 'd_and_a', 'capex'].map((f) => val(f) != null && <Item key={f} label={f} value={fmtUsdShort(val(f)!)} src={S(f)} />)}
      </>)
    }
    case 'pv_tv': {
      const lf = v.forecast[v.forecast.length - 1]!
      return (<>
        <Item label={`Final-year NOPAT (FY${lf.year})`} value={fmtUsdShort(lf.nopat)} />
        <Item label="Terminal growth g" value={pct(v.inputs.terminal_growth)} />
        <Item label="Terminal ROIC (reinvestment = g/ROIC)" value={v.inputs.terminal_roic === null ? 'n/a' : pct(v.inputs.terminal_roic)} />
        <Item label="WACC" value={pct(r, 2)} />
        <Item label="Terminal value (Gordon)" value={fmtUsdShort(v.terminal_value)} />
        <Item label={`Discounted ${v.inputs.forecast_years} years`} value={fmtUsdShort(v.pv_tv)} />
        <Item label="Share of EV" value={pct(v.tv_share_of_ev, 0)} />
        <h3 className="mt-2 text-xs uppercase text-muted">Operating income trend</h3>
        <Sparkline points={series('operating_income')} format={fmtUsdShort} />
        <Item label="Operating income (latest)" value={fmtUsdShort(val('operating_income') ?? 0)} src={S('operating_income')} />
      </>)
    }
    case 'ev':
      return (<><Item label="PV of FCF" value={fmtUsdShort(v.pv_fcf)} /><Item label="PV of TV" value={fmtUsdShort(v.pv_tv)} /><Item label="Enterprise value" value={fmtUsdShort(v.enterprise_value)} />
        <Item label="Exit-multiple cross-check price" value={`$${v.implied_price_exit_multiple.toFixed(2)} (${p.exit_ev_ebitda}× EBITDA)`} /></>)
    case 'debt':
      return (<>
        {['debt_noncurrent', 'debt_current', 'short_term_borrowings'].map((f) => val(f) != null && <Item key={f} label={f} value={fmtUsdShort(val(f)!)} src={S(f)} />)}
        <Item label="Gross debt" value={fmtUsdShort(p.gross_debt)} />
        {p.finance_receivables_netted > 0 && <>
          {['finance_receivables_current', 'finance_receivables_noncurrent'].map((f) => val(f) != null && <Item key={f} label={`− ${f}`} value={fmtUsdShort(val(f)!)} src={S(f)} />)}
          <p className="mt-1 text-xs text-warning">Captive-finance receivables are netted against debt (see docs/calibration.md).</p>
        </>}
        <Item label="Debt used in bridge" value={fmtUsdShort(p.debt)} />
        <h3 className="mt-2 text-xs uppercase text-muted">Total debt trend</h3>
        <Sparkline points={series('total_debt')} format={fmtUsdShort} />
      </>)
    case 'cash':
      return (<>
        <Item label="Cash & equivalents" value={fmtUsdShort(val('cash') ?? 0)} src={S('cash')} />
        {val('short_term_investments') != null && <Item label="Short-term investments" value={fmtUsdShort(val('short_term_investments')!)} src={S('short_term_investments')} />}
        <Item label="Cash used in bridge" value={fmtUsdShort(p.cash)} />
        <h3 className="mt-2 text-xs uppercase text-muted">Cash trend</h3>
        <Sparkline points={series('cash')} format={fmtUsdShort} />
      </>)
    case 'equity':
      return (<>
        <Item label="Enterprise value" value={fmtUsdShort(v.enterprise_value)} />
        <Item label="− Debt" value={fmtUsdShort(p.debt)} />
        <Item label="+ Cash" value={fmtUsdShort(p.cash)} />
        <Item label="Equity value" value={fmtUsdShort(v.equity_value)} />
        <Item label="Shares outstanding (yfinance)" value={`${(p.shares / 1e9).toFixed(3)}B`} />
        <Item label="Implied price per share" value={`$${v.implied_price.toFixed(2)}`} />
        <h3 className="mt-2 text-xs uppercase text-muted">Diluted shares trend (10-K)</h3>
        <Sparkline points={series('diluted_shares')} format={(x) => `${(x / 1e9).toFixed(2)}B`} />
        <Item label="Diluted shares (latest)" value={`${((val('diluted_shares') ?? 0) / 1e9).toFixed(3)}B`} src={S('diluted_shares')} />
      </>)
  }
}

export function Forecast() {
  const live = useLive()
  const hover = useUiStore((s) => s.hoverYear)
  const setHover = useUiStore((s) => s.setHoverYear)
  const [step, setStep] = useState<StepKey | null>(null)
  const v = live?.result.ok ? live.result : null
  const bars: FcfPoint[] = useMemo(() => {
    if (!live || !v) return []
    const hist = live.t.history.years.filter((y) => y.fcff !== null).map((y) => ({ year: y.fiscal_year, fcff: y.fcff!, kind: 'historical' as const }))
    return [...hist, ...v.forecast.map((f) => ({ year: f.year, fcff: f.fcff, kind: 'forecast' as const }))]
  }, [live, v])
  if (!live) return <div className="h-48 animate-pulse rounded-card bg-line" />
  if (!v) return <Card><p role="alert" className="text-warning">{!live.result.ok && live.result.error}</p></Card>
  let df = 1
  const pvByYear = v.forecast.map((f) => { df /= 1 + v.inputs.wacc; return { year: f.year, pv: f.fcff * df } })
  return (
    <>
      <PageHeader title={`${live.ticker} forecast`} sub={`${v.inputs.forecast_years}-year FCFF forecast · hover a year to link the bars, the bridge and the table`} />
      <div className="grid gap-2 xl:grid-cols-2">
        <Card title="Free cash flow to firm"><FcfBars data={bars} /></Card>
        <Card title="EV → equity bridge"><Waterfall d={{ pvByYear, pvTv: v.pv_tv, debt: live.params.debt, cash: live.params.cash, shares: live.params.shares }} onSelect={setStep} /></Card>
      </div>
      <Card title="Assumptions" className="mt-2">
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3 lg:grid-cols-6">
          {EDITABLE.map((e) => (
            <label key={e.key} className="min-w-0 text-xs text-muted">{e.label}{e.kind === 'pct' ? ' (%)' : ' (yrs)'}
              <EditCell k={e.key} label={e.label} kind={e.kind} value={(v.inputs as unknown as Record<string, number>)[e.key] ?? 0} />
            </label>
          ))}
        </div>
      </Card>
      <Card title="Forecast table" className="mt-2">
        <ScrollX label="Forecast table">
          <table className="num w-full min-w-[640px] text-right text-xs" data-testid="forecast-table">
            <thead className="text-muted"><tr>{['FY', 'Growth', 'Revenue', 'Margin', 'EBIT', 'NOPAT', 'D&A', 'Capex', 'ΔNWC', 'FCFF', 'PV'].map((h) => <th key={h} className="px-1 py-1 font-medium first:text-left">{h}</th>)}</tr></thead>
            <tbody>
              {v.forecast.map((f, i) => (
                <tr key={f.year} data-row={f.year} data-active={hover === f.year || undefined} onPointerEnter={() => setHover(f.year)} onPointerLeave={() => setHover(null)}
                  className={clsx('border-t border-line transition-colors', hover === f.year && 'bg-accent/10 text-accent-hover')}>
                  <td className="px-1 py-0.5 text-left">{f.year}</td><td className="px-1">{pct(f.growth)}</td><td className="px-1">{fmtUsdShort(f.revenue)}</td>
                  <td className="px-1">{pct(f.ebit_margin)}</td><td className="px-1">{fmtUsdShort(f.ebit)}</td><td className="px-1">{fmtUsdShort(f.nopat)}</td>
                  <td className="px-1">{fmtUsdShort(f.d_and_a)}</td><td className="px-1">{fmtUsdShort(f.capex)}</td><td className="px-1">{fmtUsdShort(f.delta_nwc)}</td>
                  <td className="px-1 font-semibold">{fmtUsdShort(f.fcff)}</td><td className="px-1">{fmtUsdShort(pvByYear[i]!.pv)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </ScrollX>
      </Card>
      <DrillPanel open={step !== null} onOpenChange={(o) => !o && setStep(null)} title={step ? TITLE[step] : ''}>
        {step && <Drill k={step} t={live.t} v={v} />}
      </DrillPanel>
    </>
  )
}
