import * as S from '@radix-ui/react-slider'
import { clsx } from 'clsx'

export function Slider({ label, value, min, max, step, onChange, format, disabled }: {
  label: string; value: number; min: number; max: number; step: number
  onChange: (v: number) => void; format: (v: number) => string; disabled?: boolean
}) {
  return (
    <div className={clsx('w-full', disabled && 'opacity-50')}>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-sm">
        <span className="text-muted">{label}</span>
        <span className="num text-fg">{format(value)}</span>
      </div>
      <S.Root className="relative flex h-3 w-full touch-none select-none items-center" value={[value]}
        min={min} max={max} step={step} disabled={disabled} onValueChange={(v) => onChange(v[0] ?? value)}
        aria-label={label}>
        <S.Track className="relative h-0.5 grow rounded-pill bg-line">
          <S.Range className="absolute h-full rounded-pill bg-accent" />
        </S.Track>
        <S.Thumb className="block h-2 w-2 rounded-pill border-2 border-accent bg-bg transition-transform hover:scale-110 focus-visible:shadow-focus disabled:border-muted" />
      </S.Root>
    </div>
  )
}
