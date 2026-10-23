import { scaleBand, scaleLinear } from 'd3-scale'
import { m as M } from 'framer-motion'
import { useState } from 'react'
import { C, FONT_MONO, fmtUsdShort } from './theme'
import { useMeasure } from './useMeasure'
import { ChartTip } from './ChartTip'
import { SrTable, Stepper, useRoving } from './a11y'
import { useUiStore } from '../store/useDcfStore'

export type StepKey = 'pv_fcf' | 'pv_tv' | 'ev' | 'debt' | 'cash' | 'equity'
export interface WaterfallInput {
  pvByYear: { year: number; pv: number }[]
  pvTv: number; debt: number; cash: number; shares: number
}

const LABEL: Record<StepKey, string> = { pv_fcf: 'PV of FCF', pv_tv: 'PV of TV', ev: 'EV', debt: '− Debt', cash: '+ Cash', equity: 'Equity' }

/** EV bridge. The PV-of-FCF bar is stacked by forecast year, so year hover links here. */
export function Waterfall({ d, onSelect, height = 280 }: { d: WaterfallInput; onSelect: (k: StepKey) => void; height?: number }) {
  const [ref, width] = useMeasure<HTMLDivElement>()
  const hover = useUiStore((s) => s.hoverYear)
  const [tip, setTip] = useState<{ x: number; y: number; k: StepKey; v: number } | null>(null)
  const pvF = d.pvByYear.reduce((a, b) => a + b.pv, 0)
  const ev = pvF + d.pvTv
  const eq = ev - d.debt + d.cash
  const steps: { k: StepKey; from: number; to: number; total?: boolean }[] = [
    { k: 'pv_fcf', from: 0, to: pvF },
    { k: 'pv_tv', from: pvF, to: ev },
    { k: 'ev', from: 0, to: ev, total: true },
    { k: 'debt', from: ev, to: ev - d.debt },
    { k: 'cash', from: ev - d.debt, to: eq },
    { k: 'equity', from: 0, to: eq, total: true },
  ]
  const m = { t: 16, r: 8, b: 28, l: 56 }
  const iw = Math.max(width - m.l - m.r, 10), ih = height - m.t - m.b
  const x = scaleBand<StepKey>().domain(steps.map((s) => s.k)).range([0, iw]).padding(0.22)
  const all = steps.flatMap((s) => [s.from, s.to])
  const y = scaleLinear().domain([Math.min(0, ...all), Math.max(...all)]).nice().range([ih, 0])
  const tipFor = (i: number) => {
    const s = steps[i]!
    setTip({ x: m.l + x(s.k)! + x.bandwidth() / 2, y: m.t + y(Math.max(s.from, s.to)), k: s.k, v: s.to - s.from })
  }
  const rv = useRoving(steps.length, steps.length, tipFor)
  const [cur, setCur] = useState(0)
  const stepTo = (i: number) => { setCur(i); tipFor(i) }
  return (
    <div ref={ref} className="relative w-full" onPointerLeave={() => setTip(null)} data-testid="waterfall">
      {width === 0 && <div style={{ height: height }} />}
      {width > 0 && (
        <svg ref={rv.ref} width={width} height={height} role="group" data-touch-alt="wf-step" aria-label="Enterprise value to equity bridge. Arrow keys move between steps, Enter opens line items."
          onKeyDown={rv.onKeyDown} onBlur={() => setTip(null)}>
          <g transform={`translate(${m.l},${m.t})`}>
            {y.ticks(4).map((t) => (
              <g aria-hidden="true" key={t} transform={`translate(0,${y(t)})`}>
                <line x2={iw} stroke={t === 0 ? C.border : C.grid} />
                <text x={-6} dy="0.32em" textAnchor="end" fill={C.muted} fontSize={10} fontFamily={FONT_MONO}>{fmtUsdShort(t)}</text>
              </g>
            ))}
            {steps.map((s, i) => {
              const top = y(Math.max(s.from, s.to)), h = Math.max(Math.abs(y(s.from) - y(s.to)), 1)
              const neg = s.to < s.from
              const fill = s.total ? C.text : neg ? C.negative : C.accent
              const xx = x(s.k)!
              const v = s.to - s.from
              const next = steps[i + 1]
              return (
                <g key={s.k} className="cursor-pointer" role="button" {...rv.item(i)} aria-haspopup="dialog" aria-label={`${fmtUsdShort(v)} ${LABEL[s.k]}: open line items`}
                  data-step={s.k}
                  onClick={() => onSelect(s.k)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s.k) } }}
                  onPointerEnter={() => setTip({ x: m.l + xx + x.bandwidth() / 2, y: m.t + top, k: s.k, v })}>
                  <rect x={xx - (x.step() - x.bandwidth()) / 2} width={x.step()} y={0} height={ih} fill="transparent" />
                  {s.k === 'pv_fcf' && hover !== null ? (
                    // stacked by year; highlight hovered year
                    (() => {
                      let acc = 0
                      return d.pvByYear.map((p) => {
                        const y1 = y(acc + p.pv), y0 = y(acc)
                        acc += p.pv
                        return <rect key={p.year} x={xx} width={x.bandwidth()} y={Math.min(y0, y1)} height={Math.max(Math.abs(y0 - y1), 0.5)}
                          fill={p.year === hover ? C.accentHover : C.accentSoft} stroke={C.bg} strokeWidth={0.5} data-pv-year={p.year} data-active={p.year === hover || undefined} />
                      })
                    })()
                  ) : (
                    <M.rect initial={false} animate={{ y: top, height: h }} transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                      x={xx} width={x.bandwidth()} rx={3} fill={fill} opacity={s.total ? 0.9 : 1} />
                  )}
                  {next && !s.total && <line x1={xx + x.bandwidth()} x2={x(next.k)!} y1={y(s.to)} y2={y(s.to)} stroke={C.muted} strokeDasharray="2 2" />}
                  <text x={xx + x.bandwidth() / 2} y={top - 4} textAnchor="middle" fill={C.text} fontSize={10} fontFamily={FONT_MONO}>{fmtUsdShort(v)}</text>
                  <text x={xx + x.bandwidth() / 2} y={ih + 16} textAnchor="middle" fill={C.muted} fontSize={width < 480 ? 9 : 11}>{LABEL[s.k]}</text>
                </g>
              )
            })}
          </g>
        </svg>
      )}
      <Stepper id="wf-step" label="bridge step" text={`${LABEL[steps[cur]!.k]} · ${fmtUsdShort(steps[cur]!.to - steps[cur]!.from)}`}
        onPrev={() => stepTo(Math.max(0, cur - 1))} onNext={() => stepTo(Math.min(steps.length - 1, cur + 1))}
        action={{ label: 'Details', onClick: () => onSelect(steps[cur]!.k) }} />
      <SrTable caption="Enterprise value to equity bridge" head={['Step', 'Amount']}
        rows={[...steps.map((s) => [LABEL[s.k], fmtUsdShort(s.to - s.from)]), ['Per share', `$${(eq / d.shares).toFixed(2)}`]]} />
      {tip && (
        <ChartTip x={tip.x} y={tip.y} width={width}>
          <div className="font-semibold">{LABEL[tip.k]}</div>
          <div className="num">{fmtUsdShort(tip.v)}{tip.k === 'equity' && ` · $${(eq / d.shares).toFixed(2)}/share`}</div>
          <div className="text-muted">Click for line items</div>
        </ChartTip>
      )}
      <p className="num mt-1 text-xs text-muted">Equity ÷ {(d.shares / 1e9).toFixed(3)}B shares = <span className="text-fg">${(eq / d.shares).toFixed(2)}</span> per share</p>
    </div>
  )
}
