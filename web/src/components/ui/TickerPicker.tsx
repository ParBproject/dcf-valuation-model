import { TICKERS, useDcfStore, type Ticker } from '../../store/useDcfStore'

/** Native select: smallest, fully accessible, and uses the OS picker on touch devices. */
export function TickerPicker() {
  const ticker = useDcfStore((s) => s.ticker)
  const setTicker = useDcfStore((s) => s.setTicker)
  return (
    <span className="relative inline-flex">
      <select aria-label="Company" value={ticker} onChange={(e) => setTicker(e.target.value as Ticker)} data-testid="ticker-picker"
        className="num h-[44px] cursor-pointer appearance-none rounded-control border border-line bg-card pl-1.5 pr-3 text-sm font-semibold text-fg hover:border-accent/60 focus-visible:shadow-focus lg:h-4">
        {TICKERS.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <span aria-hidden className="pointer-events-none absolute right-1 top-1/2 -translate-y-1/2 text-xs text-muted">▾</span>
    </span>
  )
}
