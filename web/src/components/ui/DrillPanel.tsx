import * as D from '@radix-ui/react-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import type { ReactNode } from 'react'

/** Drill-down: right side panel on desktop, bottom sheet on mobile. */
export function DrillPanel({ open, onOpenChange, title, children }: { open: boolean; onOpenChange: (o: boolean) => void; title: string; children: ReactNode }) {
  // slide in from the right on desktop, up from the bottom on mobile
  const desktop = typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <D.Portal forceMount>
            <D.Overlay asChild forceMount>
              <motion.div className="fixed inset-0 z-50 bg-black/60" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
            </D.Overlay>
            <D.Content asChild forceMount aria-describedby={undefined}>
              <motion.div data-testid="drill-panel"
                className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto overflow-x-hidden rounded-t-card border-t border-line bg-card p-2 lg:inset-y-0 lg:left-auto lg:right-0 lg:max-h-none lg:w-[440px] lg:rounded-none lg:border-l lg:border-t-0 lg:p-3"
                initial={desktop ? { x: '100%' } : { y: '100%' }} animate={{ x: 0, y: 0 }} exit={desktop ? { x: '100%' } : { y: '100%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 36 }}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <D.Title className="text-lg font-semibold">{title}</D.Title>
                  <D.Close className="h-4 rounded-control px-1 text-sm text-muted hover:text-fg" aria-label="Close">✕</D.Close>
                </div>
                {children}
              </motion.div>
            </D.Content>
          </D.Portal>
        )}
      </AnimatePresence>
    </D.Root>
  )
}
