import { scaleBand, scaleLinear } from 'd3-scale'
import { motion } from 'framer-motion'
import { C, FONT_MONO } from './theme'
import { useMeasure } from './useMeasure'
import type { TornadoRow } from '../engine/sensitivity'

const NAME: Record<string, string> = { growth_start: 'Revenue growth', target_margin: 'Target margin', wacc: 'WACC', terminal_growth: 'Terminal g', capex_to_rev: 'Capex / rev', tax_rate: 'Tax rate' }
const unit = (k: string, s: number) => `±${(s * 100).toFixed(k === 'terminal_growth' ? 1 : 0)}pp`

export function Tornado({ base, rows }: { base: number; rows: TornadoRow[] }) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const narrow = width < 480
  const labelW = narrow ? 112 : 136
  const m = { t: 8, r: 16, b: 24, l: labelW }
  const rowH = 34
  const iw = Math.max(width - m.l - m.r, 10), ih = rows.length * rowH
  const vals = rows.flatMap((r) => [r.low ?? base, r.high ?? base, base])
  const x = scaleLinear().domain([Math.min(...vals), Math.max(...vals)]).nice().range([0, iw])
  const y = scaleBand<string>().domain(rows.map((r) => r.driver)).range([0, ih]).padding(0.25)
  return (
    <div ref={ref} className="w-full" data-testid="tornado">
      {width > 0 && (
        <svg width={width} height={ih + m.t + m.b} role="img" aria-label="Tornado chart of driver sensitivities">
          <g transform={`translate(${m.l},${m.t})`}>
            {x.ticks(4).map((t) => (
              <g key={t} transform={`translate(${x(t)},0)`}>
                <line y2={ih} stroke={C.grid} />
                <text y={ih + 14} textAnchor="middle" fill={C.muted} fontSize={10} fontFamily={FONT_MONO}>${t}</text>
              </g>
            ))}
            {rows.map((r) => {
              const lo = r.low ?? base, hi = r.high ?? base
              const yy = y(r.driver)!
              return (
                <g key={r.driver}>
                  <text x={-8} y={yy + y.bandwidth() / 2} dy="0.32em" textAnchor="end" fill={C.text} fontSize={11}>
                    {NAME[r.driver]} {!narrow && <tspan fill={C.muted} fontFamily={FONT_MONO} fontSize={9}>{unit(r.driver, r.shock)}</tspan>}
                  </text>
                  {/* low-input side and high-input side, coloured by effect on value */}
                  {[lo, hi].map((v, i) => (
                    <motion.rect key={i} initial={false} animate={{ x: Math.min(x(base), x(v)), width: Math.max(Math.abs(x(v) - x(base)), 1) }}
                      transition={{ type: 'spring', stiffness: 260, damping: 30 }} y={yy} height={y.bandwidth()} rx={3}
                      fill={v >= base ? C.accent : C.negative} opacity={0.85} />
                  ))}
                </g>
              )
            })}
            <line x1={x(base)} x2={x(base)} y1={-4} y2={ih} stroke={C.text} strokeWidth={1.5} />
          </g>
        </svg>
      )}
    </div>
  )
}
