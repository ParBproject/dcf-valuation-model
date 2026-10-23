import * as D from '@radix-ui/react-dialog'
import { AnimatePresence, m } from 'framer-motion'
import { AssumptionsPanel } from './AssumptionsPanel'

/** Mobile slide-up sheet (lazy chunk, loaded on first open). Focus trap + Esc via Radix Dialog. */
export default function AssumptionsSheetDialog({ open, onOpenChange, returnFocus }: { open: boolean; onOpenChange: (o: boolean) => void; returnFocus: () => void }) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
            <AnimatePresence>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild forceMount>
              <m.div className="fixed inset-0 z-50 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </D.Overlay>
            <D.Content asChild forceMount aria-describedby={undefined} onCloseAutoFocus={(e) => { e.preventDefault(); returnFocus() }}>
              <m.div data-testid="assumptions-sheet" className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-t-card border-t border-line bg-card px-2 pb-[calc(16px+env(safe-area-inset-bottom))] pt-1"
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
                <div className="mx-auto mb-1 h-0.5 w-5 rounded-pill bg-line" aria-hidden />
                <D.Title className="sr-only">Assumptions</D.Title>
                <AssumptionsPanel compact />
                <D.Close className="mt-1 h-[44px] w-full rounded-control border border-line text-sm text-muted hover:text-fg">Done</D.Close>
              </m.div>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  )
}
