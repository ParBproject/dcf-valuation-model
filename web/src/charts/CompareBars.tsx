import { scaleBand, scaleLinear } from 'd3-scale'
import { m as M } from 'framer-motion'
import { C, FONT_MONO } from './theme'
import { useMeasure } from './useMeasure'
import { SrTable, useRoving } from './a11y'

/** Implied value vs market price per ticker (horizontal grouped bars). */
export function CompareBars({ rows, onPick }: { rows: { ticker: string; value: number | null; price: number }[]; onPick: (t: string) => void }) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const m = { t: 8, r: 56, b: 24, l: 48 }
  const rowH = 56
  const iw = Math.max(width - m.l - m.r, 10), ih = rows.length * rowH
  const x = scaleLinear().domain([0, Math.max(...rows.flatMap((r) => [r.value ?? 0, r.price]))]).nice().range([0, iw])
  const y = scaleBand<string>().domain(rows.map((r) => r.ticker)).range([0, ih]).padding(0.2)
  const bh = y.bandwidth() / 2
  const rv = useRoving(rows.length, 1)
  const pct = (r: { value: number | null; price: number }) => (r.value === null ? 'n/a' : `${((r.value / r.price - 1) * 100).toFixed(0)}%`)
  return (
    <div ref={ref} className="w-full" data-testid="compare-bars">
      {width === 0 && <div style={{ height: ih + m.t + m.b }} />}
      {width > 0 && (
        <svg ref={rv.ref} width={width} height={ih + m.t + m.b} role="group" aria-label="Implied value versus market price by company. Arrow keys move, Enter opens."
          onKeyDown={rv.onKeyDown}>
          <g transform={`translate(${m.l},${m.t})`}>
            {x.ticks(4).map((t) => (
              <g aria-hidden="true" key={t} transform={`translate(${x(t)},0)`}>
                <line y2={ih} stroke={C.grid} />
                <text y={ih + 14} textAnchor="middle" fill={C.muted} fontSize={10} fontFamily={FONT_MONO}>${t}</text>
              </g>
            ))}
            {rows.map((r, i) => {
              const yy = y(r.ticker)!
              return (
                <M.g key={r.ticker} layout initial={false} animate={{ y: yy }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                  className="cursor-pointer" role="link" {...rv.item(i)} aria-label={`${r.ticker}: implied ${r.value === null ? 'n/a' : `$${r.value.toFixed(2)}`} vs price $${r.price.toFixed(2)} (${pct(r)}). Open ${r.ticker}`} data-compare={r.ticker}
                  onClick={() => onPick(r.ticker)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); onPick(r.ticker) } }}>
                  <rect x={-m.l} y={-(y.step() - y.bandwidth()) / 2} width={iw + m.l + m.r} height={y.step()} fill="transparent" />
                  <text x={-8} y={bh} dy="0.32em" textAnchor="end" fill={C.text} fontSize={12} fontWeight={600} fontFamily={FONT_MONO}>{r.ticker}</text>
                  <M.rect initial={false} animate={{ width: Math.max(x(r.value ?? 0), 1) }} height={bh - 2} rx={3} fill={(r.value ?? 0) >= r.price ? C.accent : C.negative} />
                  <M.rect initial={false} animate={{ width: Math.max(x(r.price), 1) }} y={bh} height={bh - 2} rx={3} fill={C.hist} />
                  <text x={x(Math.max(r.value ?? 0, r.price)) + 6} y={bh} dy="0.32em" fill={C.muted} fontSize={10} fontFamily={FONT_MONO}>
                    {pct(r)}
                  </text>
                </M.g>
              )
            })}
          </g>
        </svg>
      )}
      <SrTable caption="Implied value versus market price" head={['Ticker', 'Implied value', 'Market price', 'Upside']}
        rows={rows.map((r) => [r.ticker, r.value === null ? 'n/a' : `$${r.value.toFixed(2)}`, `$${r.price.toFixed(2)}`, pct(r)])} />
      <div className="mt-1 flex gap-2 text-xs text-muted" aria-hidden="true">
        <span className="flex items-center gap-0.5"><i className="inline-block h-1 w-1 rounded-[2px]" style={{ background: C.accent }} />Implied value</span>
        <span className="flex items-center gap-0.5"><i className="inline-block h-1 w-1 rounded-[2px]" style={{ background: C.hist }} />Market price</span>
      </div>
    </div>
  )
}
