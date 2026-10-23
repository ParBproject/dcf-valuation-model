import { scaleBand, scaleLinear } from 'd3-scale'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { C, FONT_MONO, fmtUsdShort } from './theme'
import { useMeasure } from './useMeasure'
import { ChartTip } from './ChartTip'
import { useUiStore } from '../store/useDcfStore'

export interface FcfPoint { year: number; fcff: number; kind: 'historical' | 'forecast' }

export function FcfBars({ data, height = 260 }: { data: FcfPoint[]; height?: number }) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const hover = useUiStore((s) => s.hoverYear)
  const setHover = useUiStore((s) => s.setHoverYear)
  const [tip, setTip] = useState<{ x: number; y: number; d: FcfPoint } | null>(null)
  const m = { t: 12, r: 8, b: 24, l: 56 }
  const iw = Math.max(width - m.l - m.r, 10)
  const ih = height - m.t - m.b
  const x = scaleBand<number>().domain(data.map((d) => d.year)).range([0, iw]).padding(0.2)
  const vals = data.map((d) => d.fcff)
  const y = scaleLinear().domain([Math.min(0, ...vals), Math.max(0, ...vals)]).nice().range([ih, 0])
  const ticks = y.ticks(4)
  const firstF = data.find((d) => d.kind === 'forecast')?.year
  const leave = () => { setHover(null); setTip(null) }
  return (
    <div ref={ref} className="relative w-full touch-pan-y" onPointerLeave={leave} data-testid="fcf-bars">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Free cash flow by year, historical and forecast">
          <g transform={`translate(${m.l},${m.t})`}>
            {ticks.map((t) => (
              <g key={t} transform={`translate(0,${y(t)})`}>
                <line x2={iw} stroke={t === 0 ? C.border : C.grid} />
                <text x={-6} dy="0.32em" textAnchor="end" fill={C.muted} fontSize={10} fontFamily={FONT_MONO}>{fmtUsdShort(t)}</text>
              </g>
            ))}
            {firstF !== undefined && (
              <g>
                <line x1={x(firstF)! - (x.step() * x.padding()) / 2} x2={x(firstF)! - (x.step() * x.padding()) / 2} y2={ih} stroke={C.border} strokeDasharray="3 3" />
                <text x={x(firstF)! + 2} y={-2} fill={C.muted} fontSize={10}>forecast →</text>
              </g>
            )}
            {data.map((d) => {
              const y0 = y(Math.max(0, d.fcff)), h = Math.abs(y(d.fcff) - y(0))
              const active = hover === d.year
              const fill = d.fcff < 0 ? C.negative : d.kind === 'historical' ? (active ? C.histHover : C.hist) : active ? C.accentHover : C.accent
              return (
                <g key={d.year}>
                  <motion.rect initial={false} animate={{ y: y0, height: Math.max(h, 1) }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                    x={x(d.year)} width={x.bandwidth()} rx={3} fill={fill} opacity={hover === null || active ? 1 : 0.45}
                    data-year={d.year} data-active={active || undefined} />
                  <rect x={(x(d.year) ?? 0) - (x.step() * x.padding()) / 2} width={x.step()} y={0} height={ih} fill="transparent"
                    onPointerEnter={(e) => { setHover(d.year); setTip({ x: m.l + (x(d.year) ?? 0) + x.bandwidth() / 2, y: m.t + y0, d }); e.currentTarget.releasePointerCapture?.(e.pointerId) }}
                    onPointerDown={() => { setHover(d.year); setTip({ x: m.l + (x(d.year) ?? 0) + x.bandwidth() / 2, y: m.t + y0, d }) }} />
                  {(width > 520 || d.year % 2 === 0) && (
                    <text x={(x(d.year) ?? 0) + x.bandwidth() / 2} y={ih + 16} textAnchor="middle" fill={active ? C.text : C.muted} fontSize={10} fontFamily={FONT_MONO}>
                      {width > 520 ? d.year : `’${String(d.year).slice(2)}`}
                    </text>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
      )}
      {tip && (
        <ChartTip x={tip.x} y={tip.y} width={width}>
          <div className="font-semibold">FY{tip.d.year} · {tip.d.kind}</div>
          <div className="num">FCFF {fmtUsdShort(tip.d.fcff)}</div>
        </ChartTip>
      )}
      <div className="mt-1 flex gap-2 text-xs text-muted">
        <span className="flex items-center gap-0.5"><i className="inline-block h-1 w-1 rounded-[2px]" style={{ background: C.hist }} />Historical (10-K)</span>
        <span className="flex items-center gap-0.5"><i className="inline-block h-1 w-1 rounded-[2px]" style={{ background: C.accent }} />Forecast</span>
      </div>
    </div>
  )
}
