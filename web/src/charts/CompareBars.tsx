import { scaleBand, scaleLinear } from 'd3-scale'
import { motion } from 'framer-motion'
import { C, FONT_MONO } from './theme'
import { useMeasure } from './useMeasure'

/** Implied value vs market price per ticker (horizontal grouped bars). */
export function CompareBars({ rows, onPick }: { rows: { ticker: string; value: number | null; price: number }[]; onPick: (t: string) => void }) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const m = { t: 8, r: 56, b: 24, l: 48 }
  const rowH = 44
  const iw = Math.max(width - m.l - m.r, 10), ih = rows.length * rowH
  const x = scaleLinear().domain([0, Math.max(...rows.flatMap((r) => [r.value ?? 0, r.price]))]).nice().range([0, iw])
  const y = scaleBand<string>().domain(rows.map((r) => r.ticker)).range([0, ih]).padding(0.2)
  const bh = y.bandwidth() / 2
  return (
    <div ref={ref} className="w-full" data-testid="compare-bars">
      {width > 0 && (
        <svg width={width} height={ih + m.t + m.b} role="img" aria-label="Implied value versus market price by company">
          <g transform={`translate(${m.l},${m.t})`}>
            {x.ticks(4).map((t) => (
              <g key={t} transform={`translate(${x(t)},0)`}>
                <line y2={ih} stroke={C.grid} />
                <text y={ih + 14} textAnchor="middle" fill={C.muted} fontSize={10} fontFamily={FONT_MONO}>${t}</text>
              </g>
            ))}
            {rows.map((r) => {
              const yy = y(r.ticker)!
              return (
                <motion.g key={r.ticker} layout initial={false} animate={{ y: yy }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                  className="cursor-pointer" role="link" tabIndex={0} aria-label={`Open ${r.ticker}`} data-compare={r.ticker}
                  onClick={() => onPick(r.ticker)} onKeyDown={(e) => e.key === 'Enter' && onPick(r.ticker)}>
                  <text x={-8} y={bh} dy="0.32em" textAnchor="end" fill={C.text} fontSize={12} fontWeight={600} fontFamily={FONT_MONO}>{r.ticker}</text>
                  <motion.rect initial={false} animate={{ width: Math.max(x(r.value ?? 0), 1) }} height={bh - 2} rx={3} fill={(r.value ?? 0) >= r.price ? C.accent : C.negative} />
                  <motion.rect initial={false} animate={{ width: Math.max(x(r.price), 1) }} y={bh} height={bh - 2} rx={3} fill={C.hist} />
                  <text x={x(Math.max(r.value ?? 0, r.price)) + 6} y={bh} dy="0.32em" fill={C.muted} fontSize={10} fontFamily={FONT_MONO}>
                    {r.value === null ? 'n/a' : `${((r.value / r.price - 1) * 100).toFixed(0)}%`}
                  </text>
                </motion.g>
              )
            })}
          </g>
        </svg>
      )}
      <div className="mt-1 flex gap-2 text-xs text-muted">
        <span className="flex items-center gap-0.5"><i className="inline-block h-1 w-1 rounded-[2px]" style={{ background: C.accent }} />Implied value</span>
        <span className="flex items-center gap-0.5"><i className="inline-block h-1 w-1 rounded-[2px]" style={{ background: C.hist }} />Market price</span>
      </div>
    </div>
  )
}
