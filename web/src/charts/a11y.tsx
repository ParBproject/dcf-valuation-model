import { useEffect, useRef, useState, type KeyboardEvent } from 'react'

/**
 * Roving tabindex for chart items: the chart is one tab stop, arrow keys move between items
 * (2-D when `cols` < count), Home/End jump to the row ends. `onMove` fires on focus so charts
 * can show the same tooltip / linked highlight as on hover.
 */
export function useRoving(count: number, cols: number = count, onMove?: (i: number) => void) {
  const [active, setActive] = useState(0)
  const ref = useRef<SVGSVGElement>(null)
  useEffect(() => { if (active >= count) setActive(Math.max(0, count - 1)) }, [active, count])
  const focus = (i: number) => {
    setActive(i)
    ref.current?.querySelector<SVGElement>(`[data-ri="${i}"]`)?.focus()
  }
  const onKeyDown = (e: KeyboardEvent) => {
    const i = active
    let n = i
    switch (e.key) {
      case 'ArrowRight': n = i % cols < cols - 1 ? i + 1 : i; break
      case 'ArrowLeft': n = i % cols > 0 ? i - 1 : i; break
      case 'ArrowDown': n = i + cols < count ? i + cols : i; break
      case 'ArrowUp': n = i - cols >= 0 ? i - cols : i; break
      case 'Home': n = i - (i % cols); break
      case 'End': n = Math.min(i - (i % cols) + cols - 1, count - 1); break
      default: return
    }
    e.preventDefault()
    focus(n)
  }
  const item = (i: number) => ({
    'data-ri': i,
    tabIndex: i === active ? 0 : -1,
    onFocus: () => { setActive(i); onMove?.(i) },
  })
  return { ref, onKeyDown, item, active }
}

/** Visually hidden data table: the text alternative for a chart. */
export function SrTable({ caption, head, rows }: { caption: string; head: string[]; rows: (string | number)[][] }) {
  return (
    // the wrapper is what's clipped: a table can't shrink below its content width
    <div className="sr-only">
    <table data-testid="sr-table">
      <caption>{caption}</caption>
      <thead><tr>{head.map((h) => <th key={h} scope="col">{h}</th>)}</tr></thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i}>{r.map((c, j) => (j === 0 ? <th key={j} scope="row">{c}</th> : <td key={j}>{c}</td>))}</tr>
        ))}
      </tbody>
    </table>
    </div>
  )
}

/**
 * Touch-size alternative for dense chart marks (3–15px bins/bars can't be 44px):
 * two 44px step buttons that select the previous / next mark. Shown below `lg`.
 */
export function Stepper({ id, label, text, onPrev, onNext, action }: { id: string; label: string; text: string; onPrev: () => void; onNext: () => void; action?: { label: string; onClick: () => void } }) {
  const btn = 'inline-flex h-[44px] w-[44px] items-center justify-center rounded-control border border-line text-lg text-fg hover:border-accent/60 focus-visible:shadow-focus'
  return (
    <div id={id} role="group" aria-label={label} className="mt-1 flex items-center justify-between gap-1 lg:hidden" data-touch-alt-for>
      <button type="button" className={btn} onClick={onPrev} aria-label={`Previous: ${label}`}>‹</button>
      <span className="num min-w-0 flex-1 truncate text-center text-xs text-muted" aria-live="polite">{text}</span>
      {action && <button type="button" className={`${btn} w-auto px-1.5 text-sm`} onClick={action.onClick}>{action.label}</button>}
      <button type="button" className={btn} onClick={onNext} aria-label={`Next: ${label}`}>›</button>
    </div>
  )
}
