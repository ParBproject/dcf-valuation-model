import * as D from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'
import { AssumptionsPanel } from './AssumptionsPanel'
import { useDcfStore } from '../../store/useDcfStore'

/** Mobile: a floating button above the tab bar opens a slide-up sheet. */
export function AssumptionsSheet() {
  const [open, setOpen] = useState(false)
  const n = useDcfStore((s) => Object.keys(s.assumptions).length)
  return (
    <D.Root open={open} onOpenChange={setOpen}>
      <D.Trigger asChild>
        <button type="button" className="fixed bottom-9 right-2 z-40 inline-flex h-5 items-center gap-1 rounded-pill bg-accent px-2 text-sm font-semibold text-bg shadow-[0_8px_24px_rgba(16,185,129,0.35)] focus-visible:shadow-focus lg:hidden">
          Assumptions{n > 0 && <span className="num rounded-pill bg-bg/20 px-0.5 text-xs">{n}</span>}
        </button>
      </D.Trigger>
      <AnimatePresence>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </D.Overlay>
            <D.Content asChild forceMount aria-describedby={undefined}>
              <motion.div data-testid="assumptions-sheet" className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-t-card border-t border-line bg-card px-2 pb-[calc(16px+env(safe-area-inset-bottom))] pt-1"
                initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
                <div className="mx-auto mb-1 h-0.5 w-5 rounded-pill bg-line" aria-hidden />
                <D.Title className="sr-only">Assumptions</D.Title>
                <AssumptionsPanel compact />
                <D.Close className="mt-1 h-5 w-full rounded-control border border-line text-sm text-muted hover:text-fg">Done</D.Close>
              </motion.div>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  )
}
