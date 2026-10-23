import type { ReactNode } from 'react'

/** Tooltip positioned inside a relative chart container; clamps to the container width. */
export function ChartTip({ x, y, width, children }: { x: number; y: number; width: number; children: ReactNode }) {
  const tipW = 200
  const left = Math.min(Math.max(x - tipW / 2, 0), Math.max(width - tipW, 0))
  return (
    <div role="tooltip" className="pointer-events-none absolute z-10 w-[200px] rounded-control border border-line bg-[#0F1620]/95 px-1.5 py-1 text-xs text-fg shadow-lg"
      style={{ left, top: Math.max(y - 8, 0), transform: 'translateY(-100%)' }}>
      {children}
    </div>
  )
}
