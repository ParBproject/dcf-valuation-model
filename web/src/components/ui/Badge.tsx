import { clsx } from 'clsx'
import type { ReactNode } from 'react'

export type Tone = 'neutral' | 'positive' | 'negative' | 'warning'
const tones: Record<Tone, string> = {
  neutral: 'border-line text-muted',
  positive: 'border-accent/40 bg-accent/10 text-accent',
  negative: 'border-negative/40 bg-negative/10 text-negative',
  warning: 'border-warning/40 bg-warning/10 text-warning',
}

export function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={clsx('inline-flex items-center rounded-pill border px-1 py-0.5 text-xs font-medium', tones[tone])}>
      {children}
    </span>
  )
}
