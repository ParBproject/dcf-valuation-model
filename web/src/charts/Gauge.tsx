import { motion, useReducedMotion } from 'framer-motion'
import { arc } from 'd3-shape'
import { C, FONT_MONO } from './theme'

/** Value-vs-price gauge: needle at implied/market, scale 0×–2×. */
export function Gauge({ ratio, size = 220 }: { ratio: number; size?: number }) {
  const reduce = useReducedMotion()
  const r = size / 2 - 8
  const clamp = Math.min(Math.max(ratio, 0), 2)
  const angle = -90 + (clamp / 2) * 180
  const seg = (a0: number, a1: number) => arc()({ innerRadius: r - 14, outerRadius: r, startAngle: (a0 * Math.PI) / 180, endAngle: (a1 * Math.PI) / 180 }) ?? ''
  return (
    <svg width={size} height={size / 2 + 28} viewBox={`0 0 ${size} ${size / 2 + 28}`} role="img" aria-label={`Implied value is ${(ratio * 100).toFixed(0)}% of market price`} className="mx-auto block max-w-full" data-testid="gauge">
      <g transform={`translate(${size / 2},${size / 2})`}>
        <path d={seg(-90, -18)} fill={C.negative} opacity={0.7} />
        <path d={seg(-18, 18)} fill={C.border} />
        <path d={seg(18, 90)} fill={C.accent} opacity={0.7} />
        {[0, 0.5, 1, 1.5, 2].map((t) => {
          const a = ((-90 + (t / 2) * 180) * Math.PI) / 180
          return <text key={t} x={Math.sin(a) * (r - 26)} y={-Math.cos(a) * (r - 26)} textAnchor="middle" dy="0.32em" fill={C.muted} fontSize={9} fontFamily={FONT_MONO}>{t}×</text>
        })}
        {/* animate the needle tip (not a CSS rotate, whose SVG transform-origin is unreliable) */}
        <motion.line x1={0} y1={0} initial={false}
          animate={{ x2: Math.sin((angle * Math.PI) / 180) * (r - 6), y2: -Math.cos((angle * Math.PI) / 180) * (r - 6) }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 16 }}
          stroke={C.text} strokeWidth={3} strokeLinecap="round" data-testid="gauge-needle" />
        <circle r={6} fill={C.text} />
        <text y={22} textAnchor="middle" fill={C.text} fontSize={16} fontWeight={600} fontFamily={FONT_MONO}>{ratio.toFixed(2)}×</text>
      </g>
    </svg>
  )
}
