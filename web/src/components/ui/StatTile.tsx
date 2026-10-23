import { clsx } from 'clsx'
import type { ReactNode } from 'react'
import { InfoTip } from './Tooltip'

export function StatTile({ label, value, sub, tone = 'neutral', hint, loading }: {
  label: string; value: ReactNode; sub?: ReactNode; tone?: 'neutral' | 'positive' | 'negative' | 'warning'
  hint?: string; loading?: boolean
}) {
  return (
    <div className="min-w-0 rounded-card border border-line bg-card p-2">
      <div className="flex items-center gap-1 text-xs text-muted">
        <span className="truncate">{label}</span>
        {hint && <InfoTip text={hint} />}
      </div>
      {loading ? (
        <div className="mt-1 h-4 w-12 animate-pulse rounded-control bg-line" aria-label="loading" />
      ) : (
        <div className={clsx('num mt-1 truncate text-xl font-semibold sm:text-2xl', {
          'text-fg': tone === 'neutral', 'text-accent': tone === 'positive',
          'text-negative': tone === 'negative', 'text-warning': tone === 'warning',
        })}>{value}</div>
      )}
      {sub && <div className="num mt-0.5 truncate text-xs text-muted">{sub}</div>}
    </div>
  )
}
