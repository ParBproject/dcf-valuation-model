import { useMemo } from 'react'
import { useLive } from '../engine/useLive'
import { impliedGrowth } from '../engine/reverse'
import { Card } from '../components/ui/Card'
import { PageHeader } from './PageHeader'
import { GrowthChart } from '../charts/GrowthChart'
import { StatTile } from '../components/ui/StatTile'

const pct = (v: number | null) => (v === null ? 'n/a' : `${(v * 100).toFixed(1)}%`)

export function ReverseDcf() {
  const live = useLive()
  const d = useMemo(() => {
    if (!live) return null
    const ys = live.t.history.years
    const hist = ys.slice(1).map((y, i) => ({ year: y.fiscal_year, growth: (y.values.revenue as number) / (ys[i]!.values.revenue as number) - 1 }))
    const held = impliedGrowth(live.params, { ...live.overrides, target_margin: live.params.base_margin })
    const first = ys[0]!.values.revenue as number, last = ys[ys.length - 1]!.values.revenue as number
    return { hist, held, cagr: (last / first) ** (1 / (ys.length - 1)) - 1 }
  }, [live])
  if (!live || !d) return <div className="h-48 animate-pulse rounded-card bg-line" />
  const n = live.result.ok ? live.result.inputs.forecast_years : live.params.forecast_years
  return (
    <>
      <PageHeader title={`${live.ticker} reverse DCF`} sub={`The constant ${n}-year revenue growth that makes intrinsic value equal the market price, with everything else at current assumptions.`} />
      <div className="mb-2 grid grid-cols-1 gap-1.5 sm:grid-cols-3">
        <StatTile label="Implied growth (margins revert)" value={pct(live.impliedGrowth)} tone="positive" hint="Margins move to the target margin as in the base case." />
        <StatTile label="Implied growth (margins held)" value={pct(d.held)} hint="Margins stay at the last reported level, which avoids inflating implied growth when margins revert downward." />
        <StatTile label="Historical revenue CAGR" value={pct(d.cagr)} tone="warning" sub={`FY${live.t.history.years[0]!.fiscal_year}–FY${live.t.history.years.slice(-1)[0]!.fiscal_year}`} />
      </div>
      <Card title="Implied vs historical growth"><GrowthChart history={d.hist} implied={live.impliedGrowth} held={d.held} cagr={d.cagr} /></Card>
    </>
  )
}
