import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { TopBar } from './TopBar'
import { SideNav, BottomTabs } from './Navs'
import { Footer } from './Footer'
import { useUrlSync } from '../../store/urlSync'
import { TooltipProvider } from '../ui/Tooltip'

export function Shell() {
  useUrlSync()
  const { pathname } = useLocation()
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
      </div>
      <BottomTabs />
    </TooltipProvider>
  )
}
