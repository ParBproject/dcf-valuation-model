import { Link } from 'react-router-dom'
import { TickerPicker } from '../ui/TickerPicker'
import { PriceChip } from '../ui/PriceChip'

export function TopBar() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/85 backdrop-blur">
      <div className="mx-auto flex h-8 max-w-[1440px] items-center gap-1.5 px-2 sm:px-3">
        <Link to="/overview" className="flex min-w-0 items-center gap-1 focus-visible:shadow-focus">
          <span className="h-2 w-2 shrink-0 rounded-[4px] bg-accent shadow-[0_0_12px_rgba(16,185,129,0.6)]" aria-hidden />
          <span className="truncate text-sm font-semibold tracking-tight">
            <span className="sm:hidden">DCF</span>
            <span className="hidden sm:inline">DCF Valuation Model</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1">
          <TickerPicker />
          <PriceChip />
        </div>
      </div>
    </header>
  )
}
