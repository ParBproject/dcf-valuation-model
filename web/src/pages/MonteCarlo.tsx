import { useState } from 'react'
import { useLive, useMonteCarlo } from '../engine/useLive'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { PageHeader } from './PageHeader'
import { Histogram } from '../charts/Histogram'
import { ScrollX } from '../components/ui/ScrollX'
import { AnimatedNumber } from '../components/ui/AnimatedNumber'

const pct = (v: number, d = 1) => `${(v * 100).toFixed(d)}%`
const usd = (v: number) => `$${v.toFixed(2)}`

export function MonteCarlo() {
  const live = useLive()
  const { summary: mc, running } = useMonteCarlo(live)
  const [bin, setBin] = useState<number | null>(null)
  if (!live) return <div className="h-48 animate-pulse rounded-card bg-line" />
  const detail = mc && bin !== null ? mc.bins?.[bin] : undefined
  return (
    <>
      <PageHeader title={`${live.ticker} Monte Carlo`} sub="10,000 draws in a Web Worker: growth ~N(base, 3pp), margin ~N(base, 2pp), WACC ~N(base, 1pp) floored at rf, g ~Tri(1%, base, 3.5%), g < WACC − 0.5pp."
        right={running ? <Badge>updating…</Badge> : mc ? <Badge tone="positive"><span className="num" data-volatile>{mc.ms.toFixed(0)} ms</span></Badge> : null} />
      {mc ? (
        <div className="grid gap-2 xl:grid-cols-3">
          <Card title="Distribution of intrinsic value" className="xl:col-span-2">
            <Histogram edges={mc.histogram.edges} counts={mc.histogram.counts} p5={mc.percentiles.p5} p50={mc.percentiles.p50} p95={mc.percentiles.p95}
              market={live.params.market_price} selected={bin} onPick={setBin} />
            <p className="mt-1 text-xs text-muted">Bins span P1–P99; tails are folded into the end bins. Click a bin to inspect its draws.</p>
          </Card>
          <div className="grid gap-2">
            <Card title="Summary">
              <dl className="grid grid-cols-2 gap-1 text-sm">
                {(['p5', 'p25', 'p50', 'p75', 'p95'] as const).map((k) => (<div key={k}><dt className="text-xs uppercase text-muted">{k}</dt><dd className="text-lg font-semibold"><AnimatedNumber value={mc.percentiles[k]} format={usd} /></dd></div>))}
                <div><dt className="text-xs uppercase text-muted">P(value &gt; price)</dt><dd className="text-lg font-semibold"><AnimatedNumber value={mc.prob_value_gt_price} format={(v) => pct(v)} /></dd></div>
              </dl>
            </Card>
            <Card title={bin === null ? 'Bin draws' : `Bin ${usd(mc.histogram.edges[bin]!)}–${usd(mc.histogram.edges[bin + 1]!)}`}>
              {detail ? (
                <div data-testid="bin-draws">
                  <p className="num text-sm">{detail.count} draws · mean growth {pct(detail.mean.growth_start)} · margin {pct(detail.mean.target_margin)} · WACC {pct(detail.mean.wacc, 2)} · g {pct(detail.mean.g, 2)}</p>
                  <ScrollX label="Draws in bin" className="mt-1">
                    <table className="num w-full min-w-[320px] text-right text-xs">
                      <thead className="text-muted"><tr><th className="text-left font-medium">Value</th><th className="font-medium">Growth</th><th className="font-medium">Margin</th><th className="font-medium">WACC</th><th className="font-medium">g</th></tr></thead>
                      <tbody>{detail.samples.map((s, i) => (<tr key={i} className="border-t border-line"><td className="py-0.5 text-left">{usd(s.value)}</td><td>{pct(s.growth_start)}</td><td>{pct(s.target_margin)}</td><td>{pct(s.wacc, 2)}</td><td>{pct(s.g, 2)}</td></tr>))}</tbody>
                    </table>
                  </ScrollX>
                  <p className="mt-1 text-[11px] text-muted">First {detail.samples.length} draws that landed in this bin.</p>
                </div>
              ) : <p className="text-sm text-muted">Click a histogram bar to see the input draws behind it.</p>}
            </Card>
          </div>
        </div>
      ) : <div className="h-48 animate-pulse rounded-card bg-line" />}
    </>
  )
}
