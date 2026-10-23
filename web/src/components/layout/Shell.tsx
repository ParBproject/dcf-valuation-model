import { lazy, Suspense } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, m } from 'framer-motion'
import { TopBar } from './TopBar'
import { SideNav, BottomTabs } from './Navs'
import { Footer } from './Footer'
import { useUrlSync } from '../../store/urlSync'
import { TooltipProvider } from '../ui/Tooltip'
import { AssumptionsSheet } from '../assumptions/AssumptionsSheet'
import { useMedia } from './useMedia'

// Sliders, inputs and their tooltips are a separate chunk; on phones they only load with the sheet.
const AssumptionsPanel = lazy(() => import('../assumptions/AssumptionsPanel').then((m) => ({ default: m.AssumptionsPanel })))

export function Shell() {
  useUrlSync()
  const { pathname } = useLocation()
  const showPanel = pathname !== '/gallery' && pathname !== '/methodology'
  const desktop = useMedia('(min-width: 1024px)')
  return (
    <TooltipProvider>
      <a href="#main" className="skip-link rounded-control bg-accent px-2 py-1.5 text-sm font-semibold text-bg"
        onClick={(e) => { e.preventDefault(); document.getElementById('main')?.focus() }}>Skip to content</a>
      <TopBar />
      <div className="mx-auto flex max-w-[1440px]">
        <SideNav />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 px-2 pb-[calc(96px+env(safe-area-inset-bottom))] pt-3 outline-none sm:px-3 lg:px-4 lg:pb-4">
          <AnimatePresence mode="wait" initial={false}>
            <m.div key={pathname} className="min-h-[calc(100vh-64px)]" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
              {/* page chunks load here; the shell (header, nav, assumptions) stays put */}
              <Suspense fallback={<div className="h-48 animate-pulse rounded-card bg-line" role="status"><span className="sr-only">Loading</span></div>}>
                <Outlet />
              </Suspense>
            </m.div>
          </AnimatePresence>
          <Footer />
        </main>
        {showPanel && desktop && (
          <aside aria-label="Assumptions" className="sticky top-8 hidden h-[calc(100vh-64px)] w-[320px] shrink-0 overflow-y-auto border-l border-line p-2 lg:block">
            <Suspense fallback={<div className="h-48 animate-pulse rounded-card bg-line" role="status"><span className="sr-only">Loading assumptions</span></div>}>
              <AssumptionsPanel />
            </Suspense>
          </aside>
        )}
      </div>
      {showPanel && !desktop && <AssumptionsSheet />}
      <BottomTabs />
    </TooltipProvider>
  )
}
