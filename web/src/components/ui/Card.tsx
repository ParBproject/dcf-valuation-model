import { clsx } from 'clsx'
import type { HTMLAttributes, ReactNode } from 'react'

export function Card({ title, action, className, children, ...rest }:
  HTMLAttributes<HTMLDivElement> & { title?: ReactNode; action?: ReactNode }) {
  return (
    <section className={clsx('rounded-card border border-line bg-card p-2 shadow-card sm:p-3', className)} {...rest}>
      {(title || action) && (
        <header className="mb-2 flex items-center justify-between gap-2">
          {title && <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}
