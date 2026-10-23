import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/layout/Shell'
import { Overview } from './pages/Overview'
import { Gallery } from './pages/Gallery'
import { Placeholder } from './pages/Placeholder'

const P = [
  ['forecast', 'Forecast', 'M5', 'Revenue, margin and FCFF projections with linked charts and drill-downs.'],
  ['sensitivity', 'Sensitivity', 'M6', 'WACC × g heatmap and tornado chart.'],
  ['monte-carlo', 'Monte Carlo', 'M6', 'Distribution of intrinsic value with percentile markers.'],
  ['reverse-dcf', 'Reverse DCF', 'M6', 'The growth the market price implies, compared with history.'],
  ['compare', 'Compare', 'M7', 'All six companies side by side.'],
  ['methodology', 'Methodology', 'M7', 'Formulas, data sources and known data quirks.'],
] as const

/** Hash routing: works on GitHub Pages without a server-side fallback. */
export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Shell />}>
          <Route index element={<Navigate to="/overview" replace />} />
          <Route path="overview" element={<Overview />} />
          {P.map(([path, title, m, what]) => (
            <Route key={path} path={path} element={<Placeholder title={title} milestone={m} what={what} />} />
          ))}
          <Route path="gallery" element={<Gallery />} />
          <Route path="*" element={<Navigate to="/overview" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
