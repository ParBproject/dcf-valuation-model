import { scaleLinear } from 'd3-scale'
import { m as M } from 'framer-motion'
import { useState } from 'react'
import { C, FONT_MONO } from './theme'
import { useMeasure } from './useMeasure'
import { ChartTip } from './ChartTip'
import { SrTable, useRoving } from './a11y'

/** WACC (rows) × g (cols) value grid. Impossible cells (g ≥ WACC or above cap) are hatched. */
export function Heatmap({ waccs, gs, price, market, current, onPick }: {
  waccs: number[]; gs: number[]; price: (number | null)[][]; market: number
  current: { wacc: number; g: number }; onPick: (wacc: number, g: number) => void
}) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const [tip, setTip] = useState<{ x: number; y: number; w: number; g: number; v: number | null } | null>(null)
  const m = { t: 8, r: 8, b: 36, l: 52 }
  const cellH = width < 480 ? 44 : 48
  const iw = Math.max(width - m.l - m.r, 10), ih = cellH * waccs.length
  const cw = iw / gs.length
  // diverging around market price: red below, emerald above
  const ratio = scaleLinear<string>().domain([0.5, 1, 1.5]).range([C.negative, '#1F2937', C.accent]).clamp(true)
  const px = scaleLinear().domain([gs[0]!, gs[gs.length - 1]!]).range([cw / 2, iw - cw / 2])
  const py = scaleLinear().domain([waccs[0]!, waccs[waccs.length - 1]!]).range([cellH / 2, ih - cellH / 2])
  const cols = gs.length
  const tipAt = (i: number, j: number) => setTip({ x: m.l + j * cw + cw / 2, y: m.t + i * cellH, w: waccs[i]!, g: gs[j]!, v: price[i]![j]! })
  const rv = useRoving(waccs.length * cols, cols, (k) => tipAt(Math.floor(k / cols), k % cols))
  const short = (v: number) => (v >= 1000 ? v.toFixed(0) : v.toFixed(v >= 100 ? 0 : 1))
  const cx = Math.min(Math.max(px(current.g), 0), iw), cy = Math.min(Math.max(py(current.wacc), 0), ih)
  return (
    <div ref={ref} className="relative w-full" style={{ minWidth: 60 + gs.length * 56 }} onPointerLeave={() => setTip(null)} data-testid="heatmap">
      {width === 0 && <div style={{ height: ih + m.t + m.b }} />}
      {width > 0 && (
        <svg ref={rv.ref} width={width} height={ih + m.t + m.b} role="grid" aria-label="Implied price by WACC (rows) and terminal growth (columns). Arrow keys move, Enter applies."
          onKeyDown={rv.onKeyDown} onBlur={() => setTip(null)}>
          <defs>
            <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="6" height="6" fill={C.bg} />
              <line x1="0" y1="0" x2="0" y2="6" stroke={C.border} strokeWidth="2" />
            </pattern>
          </defs>
          <g transform={`translate(${m.l},${m.t})`}>
            {waccs.map((w, i) => (
              <g key={i} role="row">
                <text role="rowheader" x={-6} y={i * cellH + cellH / 2} dy="0.32em" textAnchor="end" fill={C.muted} fontSize={10} fontFamily={FONT_MONO}>{(w * 100).toFixed(1)}%</text>
                {gs.map((g, j) => {
                  const v = price[i]![j]!
                  return (
                    <g key={j} role="gridcell" {...rv.item(i * cols + j)}
                      aria-label={v === null ? `Not valid: WACC ${(w * 100).toFixed(2)}%, g ${(g * 100).toFixed(1)}%` : `${cw > 44 ? short(v) : ''} $${v.toFixed(2)} at WACC ${(w * 100).toFixed(2)}%, g ${(g * 100).toFixed(1)}%`.trim()}
                      aria-disabled={v === null || undefined} aria-selected={Math.abs(w - current.wacc) < 1e-9 && Math.abs(g - current.g) < 1e-9}
                      data-cell={`${i}-${j}`} data-valid={v !== null}
                      onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && v !== null) { e.preventDefault(); onPick(w, g) } }}
                      className={v === null ? 'cursor-not-allowed' : 'cursor-pointer'}
                      onPointerEnter={() => tipAt(i, j)}
                      onClick={() => v !== null && onPick(w, g)}>
                      <rect x={j * cw} y={i * cellH} width={cw} height={cellH} fill="transparent" />
                      <M.rect initial={false} animate={{ fill: v === null ? 'url(#hatch)' : ratio(v / market) }} transition={{ duration: 0.3 }}
                        x={j * cw + 1} y={i * cellH + 1} width={cw - 2} height={cellH - 2} rx={4} />
                      {v !== null && cw > 44 && (
                        <text x={j * cw + cw / 2} y={i * cellH + cellH / 2} dy="0.32em" textAnchor="middle" fill={C.text} fontSize={cw > 70 ? 11 : 9} fontFamily={FONT_MONO} pointerEvents="none">
                          {short(v)}
                        </text>
                      )}
                    </g>
                  )
                })}
              </g>
            ))}
            <g role="row">
            {gs.map((g, j) => (
              <text role="columnheader" key={j} x={j * cw + cw / 2} y={ih + 14} textAnchor="middle" fill={C.muted} fontSize={10} fontFamily={FONT_MONO}>{(g * 100).toFixed(1)}%</text>
            ))}
            </g>
            <text aria-hidden="true" x={iw / 2} y={ih + 30} textAnchor="middle" fill={C.muted} fontSize={10}>terminal growth g →</text>
            <M.g initial={false} animate={{ x: cx, y: cy }} transition={{ type: 'spring', stiffness: 300, damping: 30 }} pointerEvents="none" data-testid="heatmap-current">
              <circle r={9} fill="none" stroke={C.text} strokeWidth={2} />
              <circle r={2.5} fill={C.text} />
            </M.g>
          </g>
        </svg>
      )}
      <SrTable caption="Implied price per share by WACC (rows) and terminal growth g (columns); blank = invalid (g ≥ WACC)"
        head={['WACC', ...gs.map((g) => `g ${(g * 100).toFixed(1)}%`)]}
        rows={waccs.map((w, i) => [`${(w * 100).toFixed(2)}%`, ...price[i]!.map((v) => (v === null ? 'invalid' : `$${v.toFixed(2)}`))])} />
      {tip && (
        <ChartTip x={tip.x} y={tip.y} width={width}>
          <div className="num">WACC {(tip.w * 100).toFixed(2)}% · g {(tip.g * 100).toFixed(1)}%</div>
          <div className="num font-semibold">{tip.v === null ? 'invalid: g must be < WACC' : `$${tip.v.toFixed(2)} (${((tip.v / market - 1) * 100).toFixed(0)}% vs market)`}</div>
          {tip.v !== null && <div className="text-muted">Click to apply</div>}
        </ChartTip>
      )}
    </div>
  )
}
