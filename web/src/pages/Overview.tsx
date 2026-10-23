import { useValuations } from '../data/useValuations'
import { useDcfStore } from '../store/useDcfStore'
import { bn, pct, signedPct, usd } from '../data/format'
import { StatTile } from '../components/ui/StatTile'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { Badge } from '../components/ui/Badge'
import { PageHeader } from './PageHeader'
import { useLive, useMonteCarlo } from '../engine/useLive'
import type { Scenario } from '../data/types'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'
import { Gauge } from '../charts/Gauge'
import { FootballField, type FFRow } from '../charts/FootballField'
import { buildOverrides } from '../engine/useLive'
import { value } from '../engine/model'
import { m } from 'framer-motion'

const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.06 } } }
const item = { hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.25 } } }

const SCEN: { value: Scenario; label: string }[] = [
  { value: 'bear', label: 'Bear' }, { value: 'base', label: 'Base' }, { value: 'bull', label: 'Bull' },
]

export function Overview() {
  const { data, error } = useValuations()
  const ticker = useDcfStore((s) => s.ticker)
  const scenario = useDcfStore((s) => s.scenario)
  const setScenario = useDcfStore((s) => s.setScenario)
  const nOver = useDcfStore((s) => Object.keys(s.assumptions).length)
  const pairing = useDcfStore((s) => s.pairing)
  const live = useLive()
  const { summary: mc, running } = useMonteCarlo(live)

  if (error) return <Card><p className="text-negative">Could not load results: {error}</p></Card>
  const r = live?.result.ok ? live.result : null
  const loading = !live
  const market = live?.params.market_price ?? 0
  const gap = r ? r.implied_price / market - 1 : 0
  const custom = nOver > 0 || pairing !== 'snapshot'

  return (
    <>
      <PageHeader title={`${ticker} overview`}
        sub={live ? <>Base fiscal year {live.params.base_fiscal_year} · snapshot <span className="num">{data?.snapshot_date}</span>
          {custom && <> · <span className="text-warning">custom assumptions</span></>}</> : 'Loading…'}
        right={<Tabs label="Scenario" value={scenario} onChange={setScenario} items={SCEN} />} />

      {live && !live.result.ok && (
        <Card className="mb-2 border-warning/40"><p role="alert" className="text-sm text-warning">{live.result.error}. Adjust g or the discount-rate inputs.</p></Card>
      )}

      <m.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-1.5 sm:gap-2 xl:grid-cols-4">
        <m.div variants={item}><StatTile loading={loading} label={`Implied price (${scenario}${custom ? ', custom' : ''})`} value={r ? <span data-testid="implied-value"><AnimatedNumber value={r.implied_price} format={usd} /></span> : '—'}
          tone={!r ? 'warning' : gap >= 0 ? 'positive' : 'negative'} sub={r ? `${signedPct(gap)} vs market` : undefined}
          hint="Per-share equity value: explicit FCFF forecast plus a Gordon terminal value with reinvestment g/ROIC. Recomputed live in the browser." /></m.div>
        <m.div variants={item}><StatTile loading={loading} label="Market price" value={live ? usd(market) : ''}
          sub={live ? `Mkt cap ${bn(live.params.market_cap)}` : undefined} hint="Yahoo Finance price at snapshot time." /></m.div>
        <m.div variants={item}><StatTile loading={loading} label="WACC" value={r ? <AnimatedNumber value={r.inputs.wacc} format={(x) => pct(x, 2)} /> : '—'}
          sub={r ? `β ${r.inputs.beta.toFixed(2)} · rf ${pct(r.inputs.rf, 2)} · ERP ${pct(r.inputs.erp, 2)}` : undefined}
          hint="CAPM cost of equity blended with after-tax cost of debt at market-value weights." /></m.div>
        <m.div variants={item}><StatTile loading={loading} label="Terminal growth" value={r ? pct(r.inputs.terminal_growth, 1) : '—'}
          sub={r ? `TV ${pct(r.tv_share_of_ev, 0)} of EV · ${r.inputs.forecast_years}y` : undefined}
          tone={r && r.tv_share_of_ev > 0.8 ? 'warning' : 'neutral'} hint="Share of enterprise value from the terminal value." /></m.div>
      </m.div>

      <div className="mt-2 grid gap-2 xl:grid-cols-3">
        <Card title={`Monte Carlo (${(mc?.n_draws ?? 10000).toLocaleString('en-US')} draws)`} className="xl:col-span-2"
          action={running ? <Badge tone="neutral">updating…</Badge> : mc ? <Badge tone="positive"><span className="num" data-volatile>{mc.ms.toFixed(0)} ms in worker</span></Badge> : null}>
          {/* same markup while the worker runs, so the card doesn't change height when results land */}
          <div className={running || !mc ? 'opacity-60 transition-opacity' : 'transition-opacity'} aria-busy={!mc}>
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {(['p5', 'p25', 'p50', 'p75', 'p95'] as const).map((k) => (
                <div key={k} className="min-w-0">
                  <div className="text-xs uppercase text-muted">{k}</div>
                  <div className="num truncate text-lg font-semibold">{mc ? usd(mc.percentiles[k]) : <span className="inline-block h-[0.9em] w-4/5 animate-pulse rounded-control bg-line align-middle" />}</div>
                </div>
              ))}
            </div>
            <div className="mt-1 text-sm text-muted">
              P(intrinsic value &gt; price) <span className="num font-semibold text-fg">{mc ? pct(mc.prob_value_gt_price, 1) : '…'}</span>
            </div>
          </div>
        </Card>
        <Card title="Reverse DCF">
          {live ? (
            <>
              <div className="num text-2xl font-semibold">{live.impliedGrowth === null ? 'n/a' : pct(live.impliedGrowth, 1)}</div>
              <p className="mt-0.5 text-sm text-muted">
                constant {r?.inputs.forecast_years ?? live.params.forecast_years}-year revenue growth the market price implies under these assumptions
                {live.t.reverse_dcf.historical_cagr !== undefined && <> (historical CAGR <span className="num text-fg">{pct(live.t.reverse_dcf.historical_cagr, 1)}</span>)</>}
              </p>
            </>
          ) : <div className="h-8 animate-pulse rounded-control bg-line" />}
        </Card>
      </div>

      {live && r && (
        <div className="mt-2 grid gap-2 xl:grid-cols-3">
          <Card title="Value vs price">
            <Gauge ratio={r.implied_price / market} />
            <p className="text-center text-xs text-muted">implied ÷ market price · 1× = fairly valued under these assumptions</p>
          </Card>
          <Card title="Football field" className="xl:col-span-2">
            <FootballField market={market} rows={(() => {
              const sc = (s: Scenario) => { const v = value(live.params, buildOverrides(live.t, s, pairing, {})); return v.ok ? v.implied_price : null }
              const bear = sc('bear'), bull = sc('bull')
              const rows: FFRow[] = []
              if (bear !== null && bull !== null) rows.push({ label: 'DCF bear–bull', lo: Math.min(bear, bull), hi: Math.max(bear, bull), mid: r.implied_price })
              rows.push({ label: `Exit ${live.params.exit_ev_ebitda}× EBITDA`, lo: Math.min(r.implied_price_exit_multiple, r.implied_price), hi: Math.max(r.implied_price_exit_multiple, r.implied_price), mid: r.implied_price_exit_multiple })
              if (mc) rows.push({ label: 'MC P5–P95', lo: mc.percentiles.p5, hi: mc.percentiles.p95, mid: mc.percentiles.p50 })
              return rows
            })()} />
            <p className="mt-1 text-xs text-muted">Tick = point estimate (current DCF, exit-multiple price, MC median). The exit-multiple bar spans Gordon to exit-multiple value. No 52-week range: the snapshot has month-end closes only.</p>
          </Card>
        </div>
      )}

      {live && live.t.base.notes.length > 0 && (
        <Card title="Data caveats" className="mt-2" action={<Badge tone="warning">{live.t.base.notes.length}</Badge>}>
          <ul className="list-disc space-y-0.5 pl-2 text-sm text-muted">
            {live.t.base.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </Card>
      )}
    </>
  )
}
