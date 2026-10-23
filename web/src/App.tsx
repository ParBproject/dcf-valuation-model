import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { MotionConfig } from 'framer-motion'
import { Shell } from './components/layout/Shell'
import { Overview } from './pages/Overview'

// Chart-heavy pages are code-split; KaTeX only loads with Methodology.
const Forecast = lazy(() => import('./pages/Forecast').then((m) => ({ default: m.Forecast })))
const Sensitivity = lazy(() => import('./pages/Sensitivity').then((m) => ({ default: m.Sensitivity })))
const MonteCarlo = lazy(() => import('./pages/MonteCarlo').then((m) => ({ default: m.MonteCarlo })))
const ReverseDcf = lazy(() => import('./pages/ReverseDcf').then((m) => ({ default: m.ReverseDcf })))
const Compare = lazy(() => import('./pages/Compare').then((m) => ({ default: m.Compare })))
const Methodology = lazy(() => import('./pages/Methodology').then((m) => ({ default: m.Methodology })))
const Gallery = lazy(() => import('./pages/Gallery').then((m) => ({ default: m.Gallery })))

const Fallback = () => <div className="h-48 animate-pulse rounded-card bg-line" aria-label="loading" />

/** Hash routing: works on GitHub Pages without a server-side fallback. */
export default function App() {
  return (
    <MotionConfig reducedMotion="user">
      <HashRouter>
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route element={<Shell />}>
              <Route index element={<Navigate to="/overview" replace />} />
              <Route path="overview" element={<Overview />} />
              <Route path="forecast" element={<Forecast />} />
              <Route path="sensitivity" element={<Sensitivity />} />
              <Route path="monte-carlo" element={<MonteCarlo />} />
              <Route path="reverse-dcf" element={<ReverseDcf />} />
              <Route path="compare" element={<Compare />} />
              <Route path="methodology" element={<Methodology />} />
              <Route path="gallery" element={<Gallery />} />
              <Route path="*" element={<Navigate to="/overview" replace />} />
            </Route>
          </Routes>
        </Suspense>
      </HashRouter>
    </MotionConfig>
  )
}
