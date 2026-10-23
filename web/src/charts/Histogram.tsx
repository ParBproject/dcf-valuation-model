import { scaleLinear } from 'd3-scale'
import { motion } from 'framer-motion'
import { useState } from 'react'
import { C, FONT_MONO } from './theme'
import { useMeasure } from './useMeasure'
import { ChartTip } from './ChartTip'

export function Histogram({ edges, counts, p5, p50, p95, market, selected, onPick, height = 280 }: {
  edges: number[]; counts: number[]; p5: number; p50: number; p95: number; market: number
  selected: number | null; onPick: (bin: number) => void; height?: number
}) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const [tip, setTip] = useState<{ x: number; y: number; i: number } | null>(null)
  const m = { t: 28, r: 12, b: 28, l: 12 }
  const iw = Math.max(width - m.l - m.r, 10), ih = height - m.t - m.b
  const lo = Math.min(edges[0]!, market), hi = Math.max(edges[edges.length - 1]!, market)
  const x = scaleLinear().domain([lo, hi]).nice().range([0, iw])
  const y = scaleLinear().domain([0, Math.max(...counts)]).range([ih, 0])
  const n = counts.reduce((a, b) => a + b, 0)
  const marks = [
    { v: p5, label: 'P5', color: C.muted }, { v: p50, label: 'P50', color: C.text }, { v: p95, label: 'P95', color: C.muted },
    { v: market, label: 'Market', color: C.warning },
  ]
  return (
    <div ref={ref} className="relative w-full" onPointerLeave={() => setTip(null)} data-testid="histogram">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Distribution of intrinsic value per share">
          <g transform={`translate(${m.l},${m.t})`}>
            {counts.map((c, i) => {
              const x0 = x(edges[i]!), x1 = x(edges[i + 1]!)
              const active = selected === i
              return (
                <g key={i} className="cursor-pointer" data-bin={i} role="button" tabIndex={-1} aria-label={`Bin ${i + 1}: ${c} draws`}
                  onClick={() => onPick(i)} onPointerEnter={() => setTip({ x: m.l + (x0 + x1) / 2, y: m.t + y(c), i })}>
                  <rect x={x0} width={Math.max(x1 - x0, 1)} y={0} height={ih} fill="transparent" />
                  <motion.rect initial={false} animate={{ y: y(c), height: ih - y(c) }} transition={{ type: 'spring', stiffness: 220, damping: 28 }}
                    x={x0 + 0.5} width={Math.max(x1 - x0 - 1, 1)} rx={1.5}
                    fill={active ? C.accentHover : edges[i + 1]! <= market ? C.hist : C.accent} opacity={selected === null || active ? 1 : 0.5} />
                </g>
              )
            })}
            <line y1={ih} y2={ih} x2={iw} stroke={C.border} />
            {x.ticks(width < 480 ? 3 : 6).map((t) => (
              <text key={t} x={x(t)} y={ih + 16} textAnchor="middle" fill={C.muted} fontSize={10} fontFamily={FONT_MONO}>${t}</text>
            ))}
            {marks.map((mk, i) => (
              <motion.g key={mk.label} initial={false} animate={{ x: x(mk.v) }} transition={{ type: 'spring', stiffness: 220, damping: 28 }} pointerEvents="none">
                <line y1={-4} y2={ih} stroke={mk.color} strokeWidth={mk.label === 'Market' ? 2 : 1.25} strokeDasharray={mk.label === 'Market' ? undefined : '4 3'} />
                <text y={-8 - (i % 2) * 10} textAnchor="middle" fill={mk.color} fontSize={10} fontFamily={FONT_MONO}>{mk.label}</text>
              </motion.g>
            ))}
          </g>
        </svg>
      )}
      {tip && (
        <ChartTip x={tip.x} y={tip.y} width={width}>
          <div className="num">${edges[tip.i]!.toFixed(0)}–${edges[tip.i + 1]!.toFixed(0)}</div>
          <div className="num font-semibold">{counts[tip.i]} draws ({((counts[tip.i]! / n) * 100).toFixed(1)}%)</div>
          <div className="text-muted">Click to see the draws</div>
        </ChartTip>
      )}
    </div>
  )
}
