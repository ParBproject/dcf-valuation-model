import { scaleLinear, scalePoint } from 'd3-scale'
import { line } from 'd3-shape'
import { C, FONT_MONO } from './theme'
import { useMeasure } from './useMeasure'

export function Sparkline({ points, format }: { points: { x: number; y: number }[]; format: (v: number) => string }) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const h = 72, m = { t: 10, r: 8, b: 16, l: 8 }
  if (points.length === 0) return <p className="text-xs text-muted">No history.</p>
  const x = scalePoint<number>().domain(points.map((p) => p.x)).range([m.l, Math.max(width - m.r, m.l + 1)])
  const ys = points.map((p) => p.y)
  const y = scaleLinear().domain([Math.min(...ys), Math.max(...ys)]).nice().range([h - m.b, m.t])
  const d = line<{ x: number; y: number }>().x((p) => x(p.x)!).y((p) => y(p.y))(points) ?? ''
  return (
    <div ref={ref} className="w-full">
      {width > 0 && (
        <svg width={width} height={h} role="img" aria-label="Trend">
          <path d={d} fill="none" stroke={C.accent} strokeWidth={2} />
          {points.map((p) => <circle key={p.x} cx={x(p.x)} cy={y(p.y)} r={2.5} fill={C.accent} />)}
          {points.map((p, i) => (i === 0 || i === points.length - 1) && (
            <text key={`t${p.x}`} x={x(p.x)} y={h - 3} textAnchor={i === 0 ? 'start' : 'end'} fill={C.muted} fontSize={9} fontFamily={FONT_MONO}>{p.x}: {format(p.y)}</text>
          ))}
        </svg>
      )}
    </div>
  )
}
