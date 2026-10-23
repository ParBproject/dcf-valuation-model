import { AnimatePresence, motion } from 'framer-motion'
import { clsx } from 'clsx'
import { useValuations } from '../../data/useValuations'
import { usd, signedPct } from '../../data/format'
import { useDcfStore } from '../../store/useDcfStore'

/** Implied (current scenario) vs market price for the selected company. */
export function PriceChip() {
  const { data } = useValuations()
  const ticker = useDcfStore((s) => s.ticker)
  const scenario = useDcfStore((s) => s.scenario)
  const t = data?.tickers[ticker]
  if (!t) return <div className="h-4 w-20 animate-pulse rounded-pill bg-line" />
  const implied = t.scenarios[scenario].implied_price
  const gap = implied / t.base.market_price - 1
  return (
    <div className="num inline-flex h-4 items-center gap-1 rounded-pill border border-line bg-card px-1.5 text-xs sm:text-sm"
      aria-label={`Implied ${usd(implied)} versus market ${usd(t.base.market_price)}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span key={`${ticker}-${scenario}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18 }} className="font-semibold text-fg">
          {usd(implied)}
        </motion.span>
      </AnimatePresence>
      <span className="hidden text-muted sm:inline">vs {usd(t.base.market_price)}</span>
      <span className={clsx('font-semibold', gap >= 0 ? 'text-accent' : 'text-negative')}>{signedPct(gap)}</span>
    </div>
  )
}
