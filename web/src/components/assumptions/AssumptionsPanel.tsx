import { useEffect, useState } from 'react'
import * as S from '@radix-ui/react-slider'
import { clsx } from 'clsx'
import { useLive } from '../../engine/useLive'
import { recomputeStats } from '../../engine/perf'
import { DAMODARAN_PAIR, useDcfStore, type AssumptionKey } from '../../store/useDcfStore'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { Tabs } from '../ui/Tabs'
import { InfoTip } from '../ui/Tooltip'
import type { Valuation } from '../../engine/types'

type Kind = 'pct' | 'x' | 'yrs'
interface Field { key: AssumptionKey; label: string; min: number; max: number; step: number; kind: Kind; hint: string }

const FIELDS: Field[] = [
  { key: 'growth_start', label: 'Revenue growth (yr 1)', min: -0.1, max: 0.3, step: 0.0025, kind: 'pct', hint: 'Year-1 revenue growth; fades linearly to terminal g over the horizon.' },
  { key: 'target_margin', label: 'Target EBIT margin', min: 0, max: 0.6, step: 0.0025, kind: 'pct', hint: 'Margin reached in the final explicit year (linear from the last actual).' },
  { key: 'capex_to_rev', label: 'Capex / revenue', min: 0, max: 0.4, step: 0.0025, kind: 'pct', hint: 'Capital expenditure as a share of revenue during the explicit period.' },
  { key: 'terminal_roic', label: 'Terminal ROIC', min: 0.05, max: 0.4, step: 0.005, kind: 'pct', hint: 'Return on new capital in perpetuity; terminal reinvestment = g / ROIC.' },
  { key: 'rf', label: 'Risk-free rate', min: 0, max: 0.08, step: 0.0005, kind: 'pct', hint: '10-year US Treasury yield. Also floors the pre-tax cost of debt.' },
  { key: 'erp', label: 'Equity risk premium', min: 0.02, max: 0.08, step: 0.0005, kind: 'pct', hint: 'Damodaran implied ERP (Jan 2026) by default.' },
  { key: 'beta', label: 'Beta', min: 0, max: 2.5, step: 0.01, kind: 'x', hint: 'Default: Blume-adjusted 5y monthly regression beta vs S&P 500.' },
  { key: 'wacc', label: 'WACC (override)', min: 0.04, max: 0.16, step: 0.0005, kind: 'pct', hint: 'Normally built from rf, ERP, beta and the cost of debt. Setting it here (or clicking a heatmap cell) overrides that; reset to return to the CAPM build.' },
  { key: 'terminal_growth', label: 'Terminal growth g', min: 0, max: 0.04, step: 0.0005, kind: 'pct', hint: 'Perpetual growth after the horizon; capped at 4% and must stay below WACC.' },
  { key: 'forecast_years', label: 'Horizon', min: 5, max: 15, step: 1, kind: 'yrs', hint: 'Explicit forecast years before the terminal value.' },
]

const toDisplay = (k: Kind, v: number) => (k === 'pct' ? +(v * 100).toFixed(2) : k === 'x' ? +v.toFixed(2) : v)
const fromDisplay = (k: Kind, v: number) => (k === 'pct' ? v / 100 : v)

function diffLabel(k: Kind, d: number): string | null {
  if (k === 'pct') { const pp = d * 100; return Math.abs(pp) < 0.005 ? null : `${pp > 0 ? '+' : '−'}${Math.abs(pp).toFixed(2)}pp` }
  if (k === 'x') return Math.abs(d) < 0.005 ? null : `${d > 0 ? '+' : '−'}${Math.abs(d).toFixed(2)}`
  return d === 0 ? null : `${d > 0 ? '+' : '−'}${Math.abs(d)}y`
}

function NumberBox({ field, value, onCommit }: { field: Field; value: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(toDisplay(field.kind, value)))
  useEffect(() => setText(String(toDisplay(field.kind, value))), [value, field.kind])
  const commit = () => {
    const n = Number(text)
    if (text.trim() === '' || !Number.isFinite(n)) return setText(String(toDisplay(field.kind, value)))
    const v = Math.min(Math.max(fromDisplay(field.kind, n), field.min), field.max)
    onCommit(field.kind === 'yrs' ? Math.round(v) : v)
  }
  return (
    <div className="relative w-[88px] shrink-0">
      <input aria-label={`${field.label} value`} inputMode="decimal" value={text}
        onChange={(e) => setText(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()}
        className="num h-4 w-full rounded-control border border-line bg-bg pl-1 pr-3 text-right text-sm text-fg focus:border-accent focus:outline-none focus-visible:shadow-focus" />
      <span className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-xs text-muted">
        {field.kind === 'pct' ? '%' : field.kind === 'x' ? '×' : 'y'}
      </span>
    </div>
  )
}

const inputValue = (v: Valuation, k: AssumptionKey): number => (v.inputs as unknown as Record<string, number>)[k] ?? 0

export function AssumptionsPanel({ compact = false }: { compact?: boolean }) {
  const live = useLive()
  const assumptions = useDcfStore((s) => s.assumptions)
  const setAssumption = useDcfStore((s) => s.setAssumption)
  const clearAssumption = useDcfStore((s) => s.clearAssumption)
  const reset = useDcfStore((s) => s.resetAssumptions)
  const pairing = useDcfStore((s) => s.pairing)
  const setPairing = useDcfStore((s) => s.setPairing)
  const scenario = useDcfStore((s) => s.scenario)
  const [stats, setStats] = useState(recomputeStats())
  useEffect(() => { setStats(recomputeStats()) }, [live])

  if (!live) return <div className="h-48 animate-pulse rounded-card bg-line" />
  const ref = live.reference.ok ? live.reference : live.base
  const cur = live.result.ok ? live.result : null
  const waccNow = cur?.inputs.wacc ?? ref.inputs.wacc
  const waccDiff = waccNow - live.base.inputs.wacc
  const nOver = Object.keys(assumptions).length

  return (
    <div className={clsx('flex flex-col gap-2', compact && 'pb-2')}>
      <div className="flex items-center justify-between gap-1">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Assumptions</h2>
        <Button variant="ghost" size="sm" onClick={reset} disabled={nOver === 0} aria-label="Reset all assumptions to base">
          Reset to base{nOver ? ` (${nOver})` : ''}
        </Button>
      </div>

      <div className="rounded-control border border-line bg-bg p-1.5">
        <div className="mb-1 flex items-center gap-1 text-xs text-muted">
          Rate pairing <InfoTip text="Calibration (docs/calibration.md) found the risk-free rate is the single biggest driver. Snapshot uses the FRED 10-year yield on the snapshot date with Damodaran's January ERP; Damodaran pair uses his matched 4.18% T-bond and the 4.23% ERP implied from it." />
        </div>
        <Tabs small label="Rate pairing" value={pairing} onChange={setPairing} items={[
          { value: 'snapshot', label: <span className="num">Snapshot {(live.params.rf * 100).toFixed(2)}%</span> },
          { value: 'damodaran', label: <span className="num">Damodaran {(DAMODARAN_PAIR.rf * 100).toFixed(2)}%</span> },
        ]} />
        <p className="mt-1 text-xs text-muted">
          {pairing === 'snapshot'
            ? <>rf = FRED DGS10 on the snapshot date; ERP {(live.params.erp * 100).toFixed(2)}% (Damodaran, Jan 2026)</>
            : <>Damodaran matched pair: T-bond {(DAMODARAN_PAIR.rf * 100).toFixed(2)}% with ERP {(DAMODARAN_PAIR.erp * 100).toFixed(2)}% ({DAMODARAN_PAIR.as_of})</>}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-1">
        <Badge tone={Math.abs(waccDiff) < 5e-5 ? 'neutral' : waccDiff > 0 ? 'negative' : 'positive'}>
          <span className="num" data-testid="wacc-badge">WACC {(waccNow * 100).toFixed(2)}%{Math.abs(waccDiff) >= 5e-5 && ` · ${waccDiff > 0 ? '+' : '−'}${Math.abs(waccDiff * 100).toFixed(1)}pp vs base`}</span>
        </Badge>
        {scenario !== 'base' && <Badge tone="warning">{scenario} scenario</Badge>}
      </div>

      {assumptions.wacc !== undefined && (
        <p className="rounded-control border border-warning/40 bg-warning/10 p-1 text-xs text-warning">WACC is overridden, so rf, ERP and beta don't affect it. Reset WACC (↺) to restore the CAPM build.</p>
      )}
      {!live.result.ok && <div role="alert" className="rounded-control border border-warning/40 bg-warning/10 p-1 text-xs text-warning">{live.result.error}</div>}

      <div className="flex flex-col gap-1.5">
        {FIELDS.map((f) => {
          const refV = inputValue(ref, f.key)
          const baseV = inputValue(live.base, f.key)
          const v = assumptions[f.key] ?? refV
          const d = diffLabel(f.kind, v - baseV)
          const overridden = assumptions[f.key] !== undefined
          return (
            <div key={f.key} data-field={f.key}>
              <div className="mb-0.5 flex items-center justify-between gap-1 text-sm">
                <span className="flex min-w-0 items-center gap-1 text-muted">
                  <span className="truncate">{f.label}</span><InfoTip text={f.hint} />
                </span>
                <span className="flex shrink-0 items-center gap-0.5">
                  {d && <Badge tone="warning"><span className="num">{d}</span></Badge>}
                  {overridden && (
                    <button type="button" onClick={() => clearAssumption(f.key)} aria-label={`Reset ${f.label}`}
                      className="h-2.5 rounded-control px-0.5 text-xs text-muted hover:text-accent">↺</button>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <S.Root className="relative flex h-4 min-w-0 flex-1 touch-none select-none items-center" value={[v]}
                  min={f.min} max={f.max} step={f.step} aria-label={f.label}
                  onValueChange={(x) => setAssumption(f.key, x[0] ?? v)}>
                  <S.Track className="relative h-0.5 grow rounded-pill bg-line">
                    <S.Range className="absolute h-full rounded-pill bg-accent" />
                  </S.Track>
                  <S.Thumb className="block h-2 w-2 rounded-pill border-2 border-accent bg-bg transition-transform hover:scale-110 focus-visible:shadow-focus" />
                </S.Root>
                <NumberBox field={f} value={v} onCommit={(x) => setAssumption(f.key, x)} />
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[11px] text-muted">Badges show the difference from the base case.</p>
      <p className="num text-[11px] text-muted" data-testid="recompute-ms">
        recompute {live.ms.toFixed(2)} ms · avg {stats.avg.toFixed(2)} / max {stats.max.toFixed(2)} ms (last {stats.n})
      </p>
    </div>
  )
}
