import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { TopBar } from './TopBar'
import { SideNav, BottomTabs } from './Navs'
import { Footer } from './Footer'
import { useUrlSync } from '../../store/urlSync'
import { TooltipProvider } from '../ui/Tooltip'
import { AssumptionsPanel } from '../assumptions/AssumptionsPanel'
import { AssumptionsSheet } from '../assumptions/AssumptionsSheet'

export function Shell() {
  useUrlSync()
  const { pathname } = useLocation()
  const showPanel = pathname !== '/gallery' && pathname !== '/methodology'
  return (
    <TooltipProvider>
      <TopBar />
      <div className="mx-auto flex max-w-[1440px]">
        <SideNav />
        <main className="min-w-0 flex-1 px-2 pb-12 pt-3 sm:px-3 lg:px-4 lg:pb-4">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={pathname} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18 }}>
              <Outlet />
            </motion.div>
          </AnimatePresence>
          <Footer />
        </main>
        {showPanel && (
          <aside aria-label="Assumptions" className="sticky top-8 hidden h-[calc(100vh-64px)] w-[320px] shrink-0 overflow-y-auto border-l border-line p-2 lg:block">
            <AssumptionsPanel />
          </aside>
        )}
      </div>
      {showPanel && <AssumptionsSheet />}
      <BottomTabs />
    </TooltipProvider>
  )
}
