import { useMemo } from 'react'
import { useLive } from '../engine/useLive'
import { grid, tornado } from '../engine/sensitivity'
import { useDcfStore } from '../store/useDcfStore'
import { Card } from '../components/ui/Card'
import { PageHeader } from './PageHeader'
import { Heatmap } from '../charts/Heatmap'
import { Tornado } from '../charts/Tornado'

export function Sensitivity() {
  const live = useLive()
  const set = useDcfStore((s) => s.setAssumption)
  const data = useMemo(() => live ? { g: grid(live.params, live.overrides), t: tornado(live.params, live.overrides) } : null, [live])
  if (!live || !data) return <div className="h-48 animate-pulse rounded-card bg-line" />
  const cur = live.result.ok ? live.result.inputs : null
  return (
    <>
      <PageHeader title={`${live.ticker} sensitivity`} sub="Click a cell to apply that WACC and g. Hatched cells are invalid (g ≥ WACC or g above the 4% cap)." />
      <div className="grid gap-2 xl:grid-cols-5">
        <Card title="Implied price: WACC × terminal growth" className="xl:col-span-3">
          <Heatmap waccs={data.g.waccs} gs={data.g.gs} price={data.g.price} market={live.params.market_price}
            current={{ wacc: cur?.wacc ?? data.g.waccs[2]!, g: cur?.terminal_growth ?? live.params.terminal_growth }}
            onPick={(w, g) => { set('wacc', w); set('terminal_growth', g) }} />
          <p className="mt-1 text-xs text-muted">Colour: red below market price, emerald above (scaled 0.5×–1.5×). Ring = current assumptions.</p>
        </Card>
        <Card title="Tornado (live)" className="xl:col-span-2">
          {data.t.base !== null ? <Tornado base={data.t.base} rows={data.t.rows} /> : <p className="text-sm text-warning">Current inputs are invalid.</p>}
          <p className="mt-1 text-xs text-muted">Each bar shocks one driver; emerald raises value, red lowers it.</p>
        </Card>
      </div>
    </>
  )
}
