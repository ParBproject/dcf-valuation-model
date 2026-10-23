import { scaleLinear } from 'd3-scale'
import { motion } from 'framer-motion'
import { C, FONT_MONO } from './theme'
import { useMeasure } from './useMeasure'

export interface FFRow { label: string; lo: number; hi: number; mid?: number; note?: string }

/** Football field: valuation ranges per method, with a market-price line. */
export function FootballField({ rows, market }: { rows: FFRow[]; market: number }) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const labelW = width < 480 ? 108 : 140
  const m = { t: 18, r: 16, b: 24, l: labelW }
  const rowH = 36
  const iw = Math.max(width - m.l - m.r, 10), ih = rows.length * rowH
  const all = rows.flatMap((r) => [r.lo, r.hi]).concat(market)
  const x = scaleLinear().domain([Math.min(...all) * 0.95, Math.max(...all) * 1.05]).nice().range([0, iw])
  return (
    <div ref={ref} className="w-full" data-testid="football-field">
      {width > 0 && (
        <svg width={width} height={ih + m.t + m.b} role="img" aria-label="Valuation football field">
          <g transform={`translate(${m.l},${m.t})`}>
            {x.ticks(width < 480 ? 3 : 5).map((t) => (
              <g key={t} transform={`translate(${x(t)},0)`}>
                <line y2={ih} stroke={C.grid} />
                <text y={ih + 14} textAnchor="middle" fill={C.muted} fontSize={10} fontFamily={FONT_MONO}>${t}</text>
              </g>
            ))}
            {rows.map((r, i) => {
              const yy = i * rowH + 8
              return (
                <g key={r.label}>
                  <text x={-8} y={yy + 10} dy="0.32em" textAnchor="end" fill={C.text} fontSize={11}>{r.label}</text>
                  <motion.rect initial={false} animate={{ x: x(r.lo), width: Math.max(x(r.hi) - x(r.lo), 3) }} transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                    y={yy} height={20} rx={4} fill={C.accent} opacity={0.35} stroke={C.accent} />
                  {r.mid !== undefined && (
                    <motion.line initial={false} animate={{ x1: x(r.mid), x2: x(r.mid) }} y1={yy - 2} y2={yy + 22} stroke={C.text} strokeWidth={2} />
                  )}
                </g>
              )
            })}
            <motion.g initial={false} animate={{ x: x(market) }}>
              <line y1={-6} y2={ih} stroke={C.warning} strokeWidth={2} />
              <text y={-8} textAnchor="middle" fill={C.warning} fontSize={10} fontFamily={FONT_MONO}>Market ${market.toFixed(0)}</text>
            </motion.g>
          </g>
        </svg>
      )}
    </div>
  )
}
