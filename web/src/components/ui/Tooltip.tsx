import { cloneElement, isValidElement, useEffect, useId, useLayoutEffect, useRef, useState, type ReactElement, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

/**
 * Lightweight tooltip (no positioning library, keeps it out of the entry bundle).
 * Opens on hover and keyboard focus, Esc dismisses, hovering the bubble keeps it open (WCAG 1.4.13),
 * tap toggles on touch. The trigger is linked with aria-describedby.
 */
export function Tooltip({ content, children }: { content: ReactNode; children: ReactElement }) {
  const id = useId()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null)
  const trigger = useRef<HTMLElement | null>(null)
  const bubble = useRef<HTMLDivElement>(null)
  const timer = useRef<number>()
  const show = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(true), 120) }
  const hide = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(false), 100) }
  useLayoutEffect(() => {
    if (!open || !trigger.current || !bubble.current) return
    const r = trigger.current.getBoundingClientRect(), b = bubble.current.getBoundingClientRect()
    const below = r.top - b.height - 8 < 0
    const left = Math.min(Math.max(8, r.left + r.width / 2 - b.width / 2), window.innerWidth - b.width - 8)
    setPos({ left, top: below ? r.bottom + 8 : r.top - b.height - 8, below })
  }, [open])
  useEffect(() => {
    if (!open) { setPos(null); return }
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const onScroll = () => setOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScroll, { passive: true, capture: true })
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('scroll', onScroll, { capture: true }) }
  }, [open])
  useEffect(() => () => window.clearTimeout(timer.current), [])
  if (!isValidElement(children)) return children
  const child = children as ReactElement<Record<string, unknown>>
  return (
    <>
      {cloneElement(child, {
        ref: (el: HTMLElement | null) => { trigger.current = el },
        'aria-describedby': open ? id : undefined,
        onPointerEnter: (e: React.PointerEvent) => { if (e.pointerType === 'mouse') show() },
        onPointerLeave: (e: React.PointerEvent) => { if (e.pointerType === 'mouse') hide() },
        onFocus: show,
        onBlur: hide,
        onClick: (e: React.MouseEvent) => { (child.props.onClick as ((e: React.MouseEvent) => void) | undefined)?.(e); setOpen((o) => !o) },
      })}
      {open && createPortal(
        <div ref={bubble} id={id} role="tooltip" onPointerEnter={show} onPointerLeave={hide}
          style={{ position: 'fixed', left: pos?.left ?? -9999, top: pos?.top ?? -9999 }}
          className="z-50 max-w-[280px] rounded-control border border-line bg-[#0F1620] px-1.5 py-1 text-xs text-fg shadow-lg">
          {content}
        </div>,
        document.body,
      )}
    </>
  )
}

export function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip content={text}>
      <button type="button" aria-label={text} className="hit inline-flex h-2 w-2 items-center justify-center rounded-pill border border-muted/60 text-[9px] leading-none text-muted hover:border-accent hover:text-accent focus-visible:shadow-focus">
        i
      </button>
    </Tooltip>
  )
}

/** Kept for API compatibility with the previous Radix-based provider. */
export function TooltipProvider({ children }: { children: ReactNode }) { return <>{children}</> }
