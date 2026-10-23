import { scaleBand, scaleLinear } from 'd3-scale'
import { motion } from 'framer-motion'
import { C, FONT_MONO } from './theme'
import { useMeasure } from './useMeasure'

/** Historical YoY revenue growth bars vs implied constant growth (margins reverting / held). */
export function GrowthChart({ history, implied, held, cagr, height = 280 }: {
  history: { year: number; growth: number }[]; implied: number | null; held: number | null; cagr: number; height?: number
}) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const m = { t: 16, r: 12, b: 28, l: 48 }
  const iw = Math.max(width - m.l - m.r, 10), ih = height - m.t - m.b
  const x = scaleBand<number>().domain(history.map((h) => h.year)).range([0, iw]).padding(0.3)
  const vals = [...history.map((h) => h.growth), cagr, implied ?? 0, held ?? 0, 0]
  const y = scaleLinear().domain([Math.min(...vals), Math.max(...vals)]).nice().range([ih, 0])
  const lines = [
    { v: implied, label: 'implied (margins revert)', color: C.accent, dash: undefined },
    { v: held, label: 'implied (margins held)', color: C.accentHover, dash: '6 4' },
    { v: cagr, label: 'historical CAGR', color: C.warning, dash: '2 3' },
  ]
  return (
    <div ref={ref} className="w-full" data-testid="growth-chart">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Implied versus historical revenue growth">
          <g transform={`translate(${m.l},${m.t})`}>
            {y.ticks(5).map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x2={iw} stroke={t === 0 ? C.border : C.grid} />
                <text x={-6} dy="0.32em" textAnchor="end" fill={C.muted} fontSize={10} fontFamily={FONT_MONO}>{(t * 100).toFixed(0)}%</text>
              </g>
            ))}
            {history.map((h) => (
              <g key={h.year}>
                <motion.rect initial={false} animate={{ y: y(Math.max(0, h.growth)), height: Math.max(Math.abs(y(h.growth) - y(0)), 1) }}
                  x={x(h.year)} width={x.bandwidth()} rx={3} fill={h.growth < 0 ? C.negative : C.hist} />
                <text x={x(h.year)! + x.bandwidth() / 2} y={ih + 16} textAnchor="middle" fill={C.muted} fontSize={10} fontFamily={FONT_MONO}>{width > 480 ? h.year : `’${String(h.year).slice(2)}`}</text>
              </g>
            ))}
            {lines.map((l) => l.v !== null && (
              <motion.g key={l.label} initial={false} animate={{ y: y(l.v) }} transition={{ type: 'spring', stiffness: 220, damping: 28 }}>
                <line x2={iw} stroke={l.color} strokeWidth={2} strokeDasharray={l.dash} />
              </motion.g>
            ))}
          </g>
        </svg>
      )}
      <div className="mt-1 flex flex-wrap gap-x-2 gap-y-0.5 text-xs text-muted">
        <span className="flex items-center gap-0.5"><i className="inline-block h-1 w-1 rounded-[2px]" style={{ background: C.hist }} />YoY revenue growth (10-K)</span>
        {lines.map((l) => <span key={l.label} className="flex items-center gap-0.5"><i className="inline-block h-0.5 w-2" style={{ background: l.color }} />{l.label}{l.v !== null && <span className="num text-fg">&nbsp;{(l.v * 100).toFixed(1)}%</span>}</span>)}
      </div>
    </div>
  )
}
