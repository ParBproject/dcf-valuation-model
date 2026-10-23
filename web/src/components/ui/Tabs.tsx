import * as T from '@radix-ui/react-tabs'
import { motion } from 'framer-motion'
import type { ReactNode } from 'react'

export function Tabs<V extends string>({ value, onChange, items, label, small }: {
  value: V; onChange: (v: V) => void; items: { value: V; label: ReactNode; disabled?: boolean }[]; label: string; small?: boolean
}) {
  return (
    <T.Root value={value} onValueChange={(v) => onChange(v as V)}>
      <T.List aria-label={label} className="inline-flex rounded-control border border-line bg-bg p-0.5">
        {items.map((it) => (
          <T.Trigger key={it.value} value={it.value} disabled={it.disabled}
            className={`relative h-4 whitespace-nowrap rounded-[6px] ${small ? 'px-1 text-xs' : 'px-1.5 text-sm'} text-muted transition-colors hover:text-fg data-[state=active]:text-bg disabled:opacity-40 focus-visible:shadow-focus`}>
            {value === it.value && (
              <motion.span layoutId={`tab-${label}`} className="absolute inset-0 rounded-[6px] bg-accent"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }} />
            )}
            <span className="relative">{it.label}</span>
          </T.Trigger>
        ))}
      </T.List>
    </T.Root>
  )
}
