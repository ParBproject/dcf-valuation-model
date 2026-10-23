import { lazy, Suspense, useRef, useState } from 'react'
import { useDcfStore } from '../../store/useDcfStore'

const Dialog = lazy(() => import('./AssumptionsSheetDialog'))

/** Mobile: a floating button above the tab bar opens a slide-up sheet. */
export function AssumptionsSheet() {
  const [open, setOpen] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const fab = useRef<HTMLButtonElement>(null)
  const n = useDcfStore((s) => Object.keys(s.assumptions).length)
  return (
    <>
      <button ref={fab} type="button" data-testid="assumptions-fab" aria-haspopup="dialog" aria-expanded={open}
        onClick={() => { setLoaded(true); setOpen(true) }} onPointerEnter={() => setLoaded(true)}
        className="fixed bottom-[calc(72px+env(safe-area-inset-bottom))] right-2 z-40 inline-flex h-[44px] items-center gap-1 rounded-pill bg-accent px-2 text-sm font-semibold text-bg shadow-[0_8px_24px_rgba(16,185,129,0.35)] focus-visible:shadow-focus lg:hidden">
        Assumptions{n > 0 && <span className="num rounded-pill bg-bg/20 px-0.5 text-xs">{n}</span>}
      </button>
      {loaded && (
        <Suspense fallback={null}>
          <Dialog open={open} onOpenChange={setOpen} returnFocus={() => fab.current?.focus()} />
        </Suspense>
      )}
    </>
  )
}
