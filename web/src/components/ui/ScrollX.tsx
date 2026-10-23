import { useEffect, useRef, useState, type ReactNode } from 'react'
import { clsx } from 'clsx'

/**
 * Horizontal scroller for wide content (tables, heatmap, formulas). Keyboard-focusable region,
 * with edge fades that hint there is more content to scroll to.
 */
export function ScrollX({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState({ left: false, right: false })
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setEdges({ left: el.scrollLeft > 2, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 2 })
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    for (const c of Array.from(el.children)) ro.observe(c)
    return () => { el.removeEventListener('scroll', update); ro.disconnect() }
  }, [])
  const scrollable = edges.left || edges.right
  return (
    <div className="relative -mx-2">
      <div ref={ref} role="region" aria-label={label} tabIndex={scrollable ? 0 : -1} data-scroll-x
        className={clsx('overflow-x-auto overscroll-x-contain px-2', className)}>
        {children}
      </div>
      <div aria-hidden className={clsx('pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-card to-transparent transition-opacity', edges.left ? 'opacity-100' : 'opacity-0')} />
      <div aria-hidden data-testid="scroll-fade" data-visible={edges.right} className={clsx('pointer-events-none absolute inset-y-0 right-0 w-5 bg-gradient-to-l from-card to-transparent transition-opacity', edges.right ? 'opacity-100' : 'opacity-0')} />
    </div>
  )
}
