import { AnimatePresence, motion } from 'framer-motion'
import { clsx } from 'clsx'
import { usd, signedPct } from '../../data/format'
import { useLive } from '../../engine/useLive'

/** Live implied price (scenario + user assumptions) vs market price. */
export function PriceChip() {
  const live = useLive()
  if (!live) return <div className="h-4 w-20 animate-pulse rounded-pill bg-line" />
  const market = live.params.market_price
  if (!live.result.ok) {
    return <div className="inline-flex h-4 items-center rounded-pill border border-warning/40 px-1.5 text-xs text-warning">invalid inputs</div>
  }
  const implied = live.result.implied_price
  const gap = implied / market - 1
  return (
    <div data-testid="price-chip" className="num inline-flex h-4 items-center gap-1 rounded-pill border border-line bg-card px-1.5 text-xs sm:text-sm"
      aria-label={`Implied ${usd(implied)} versus market ${usd(market)}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={live.ticker} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="font-semibold text-fg" data-testid="price-chip-implied">
          {usd(implied)}
        </motion.span>
      </AnimatePresence>
      <span className="hidden text-muted sm:inline">vs {usd(market)}</span>
      <span className={clsx('font-semibold', gap >= 0 ? 'text-accent' : 'text-negative')}>{signedPct(gap)}</span>
    </div>
  )
}
