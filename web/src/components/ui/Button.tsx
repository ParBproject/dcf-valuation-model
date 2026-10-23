import { clsx } from 'clsx'
import type { ButtonHTMLAttributes } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'
type Size = 'sm' | 'md'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-bg hover:bg-accent-hover disabled:bg-accent/40',
  secondary: 'bg-card text-fg border border-line hover:border-accent/60 hover:text-accent-hover disabled:text-muted',
  ghost: 'text-muted hover:text-fg hover:bg-white/5 disabled:text-muted/50',
}
const sizes: Record<Size, string> = { sm: 'hit h-4 px-1.5 text-sm', md: 'h-[44px] px-2 text-sm' }

export function Button({
  variant = 'primary', size = 'md', className, ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center gap-1 rounded-control font-medium transition-colors duration-150',
        'disabled:cursor-not-allowed focus-visible:shadow-focus',
        variants[variant], sizes[size], className,
      )}
      {...props}
    />
  )
}
