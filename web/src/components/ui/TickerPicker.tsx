import * as Sel from '@radix-ui/react-select'
import { TICKERS, useDcfStore, type Ticker } from '../../store/useDcfStore'

export function TickerPicker() {
  const ticker = useDcfStore((s) => s.ticker)
  const setTicker = useDcfStore((s) => s.setTicker)
  return (
    <Sel.Root value={ticker} onValueChange={(v) => setTicker(v as Ticker)}>
      <Sel.Trigger aria-label="Company" className="num inline-flex h-4 items-center gap-1 rounded-control border border-line bg-card px-1.5 text-sm font-semibold hover:border-accent/60 focus-visible:shadow-focus">
        <Sel.Value />
        <Sel.Icon className="text-muted">▾</Sel.Icon>
      </Sel.Trigger>
      <Sel.Portal>
        <Sel.Content position="popper" sideOffset={6} className="z-50 overflow-hidden rounded-control border border-line bg-card shadow-xl">
          <Sel.Viewport className="p-0.5">
            {TICKERS.map((t) => (
              <Sel.Item key={t} value={t} className="num cursor-pointer select-none rounded-[6px] px-1.5 py-1 text-sm outline-none data-[highlighted]:bg-accent/15 data-[state=checked]:text-accent">
                <Sel.ItemText>{t}</Sel.ItemText>
              </Sel.Item>
            ))}
          </Sel.Viewport>
        </Sel.Content>
      </Sel.Portal>
    </Sel.Root>
  )
}
