import { lazy } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LazyMotion, MotionConfig } from 'framer-motion'
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

// Animation features load after first paint: they're never needed for the initial render.
const idle = () => new Promise<void>((r) => ('requestIdleCallback' in window ? requestIdleCallback(() => r(), { timeout: 1500 }) : setTimeout(r, 200)))
const loadFeatures = () => idle().then(() => import('./motionFeatures')).then((r) => r.default)

/** Hash routing: works on GitHub Pages without a server-side fallback. */
export default function App() {
  return (
    <LazyMotion features={loadFeatures} strict>
    <MotionConfig reducedMotion="user">
      <HashRouter>
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
      </HashRouter>
    </MotionConfig>
    </LazyMotion>
  )
}
