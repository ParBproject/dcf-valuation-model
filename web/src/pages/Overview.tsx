import { useValuations } from '../data/useValuations'
import { useDcfStore } from '../store/useDcfStore'
import { bn, pct, signedPct, usd } from '../data/format'
import { StatTile } from '../components/ui/StatTile'
import { Card } from '../components/ui/Card'
import { Tabs } from '../components/ui/Tabs'
import { Badge } from '../components/ui/Badge'
import { PageHeader } from './PageHeader'
import type { Scenario } from '../data/types'

const SCEN: { value: Scenario; label: string }[] = [
  { value: 'bear', label: 'Bear' }, { value: 'base', label: 'Base' }, { value: 'bull', label: 'Bull' },
]

export function Overview() {
  const { data, error } = useValuations()
  const ticker = useDcfStore((s) => s.ticker)
  const scenario = useDcfStore((s) => s.scenario)
  const setScenario = useDcfStore((s) => s.setScenario)
  const t = data?.tickers[ticker]
  const loading = !t
  const sc = t?.scenarios[scenario]
  const gap = sc && t ? sc.implied_price / t.base.market_price - 1 : 0
  const mc = t?.monte_carlo
  const rv = t?.reverse_dcf

  if (error) return <Card><p className="text-negative">Could not load results: {error}</p></Card>

  return (
    <>
      <PageHeader title={`${ticker} overview`}
        sub={t ? <>Base fiscal year {t.base.base_fiscal_year} · snapshot <span className="num">{data?.snapshot_date}</span></> : 'Loading…'}
        right={<Tabs label="Scenario" value={scenario} onChange={setScenario} items={SCEN} />} />

      <div className="grid grid-cols-2 gap-1.5 sm:gap-2 lg:grid-cols-4">
        <StatTile loading={loading} label={`Implied price (${scenario})`} value={sc ? usd(sc.implied_price) : ''}
          tone={gap >= 0 ? 'positive' : 'negative'} sub={sc ? `${signedPct(gap)} vs market` : undefined}
          hint="Per-share equity value from the 5-year FCFF forecast plus a Gordon-growth terminal value." />
        <StatTile loading={loading} label="Market price" value={t ? usd(t.base.market_price) : ''}
          sub={t ? `Mkt cap ${bn(t.base.inputs.market_cap)}` : undefined} hint="Yahoo Finance price at snapshot time." />
        <StatTile loading={loading} label="WACC" value={sc ? pct(sc.wacc, 2) : ''}
          sub={t ? `β ${t.base.inputs.beta.toFixed(2)} · rf ${pct(t.base.inputs.rf, 2)}` : undefined}
          hint="CAPM cost of equity (Blume-adjusted regression beta, Damodaran ERP) blended with after-tax cost of debt at market weights." />
        <StatTile loading={loading} label="Terminal growth" value={sc ? pct(sc.terminal_growth, 1) : ''}
          sub={sc ? `TV ${pct(sc.tv_share_of_ev, 0)} of EV` : undefined}
          tone={sc && sc.tv_share_of_ev > 0.8 ? 'warning' : 'neutral'} hint="Share of enterprise value coming from the terminal value." />
      </div>

      <div className="mt-2 grid gap-2 lg:grid-cols-3">
        <Card title="Monte Carlo (10,000 draws)" className="lg:col-span-2">
          {mc && t ? (
            <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
              {(['p5', 'p25', 'p50', 'p75', 'p95'] as const).map((k) => (
                <div key={k} className="min-w-0">
                  <div className="text-xs uppercase text-muted">{k}</div>
                  <div className="num truncate text-lg font-semibold">{usd(mc.percentiles[k])}</div>
                </div>
              ))}
              <div className="col-span-3 mt-1 text-sm text-muted sm:col-span-5">
                P(intrinsic value &gt; price) <span className="num font-semibold text-fg">{pct(mc.prob_value_gt_price, 1)}</span>
              </div>
            </div>
          ) : <div className="h-8 animate-pulse rounded-control bg-line" />}
        </Card>
        <Card title="Reverse DCF">
          {rv && t ? (
            <>
              <div className="num text-2xl font-semibold">{rv.implied_growth === null ? 'n/a' : pct(rv.implied_growth, 1)}</div>
              <p className="mt-0.5 text-sm text-muted">
                constant 5-year revenue growth the market price implies
                {rv.historical_cagr !== undefined && <> (historical CAGR <span className="num text-fg">{pct(rv.historical_cagr, 1)}</span>)</>}
              </p>
            </>
          ) : <div className="h-8 animate-pulse rounded-control bg-line" />}
        </Card>
      </div>

      {t && t.base.notes.length > 0 && (
        <Card title="Data caveats" className="mt-2" action={<Badge tone="warning">{t.base.notes.length}</Badge>}>
          <ul className="list-disc space-y-0.5 pl-2 text-sm text-muted">
            {t.base.notes.map((n) => <li key={n}>{n}</li>)}
          </ul>
        </Card>
      )}
    </>
  )
}
