import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

import { loadValuations } from './data/useValuations'

// The snapshot data is preloaded from index.html; waiting for it (briefly) means the first paint
// is the real page rather than skeletons that then resize, which is what caused layout shift.
const render = () => createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
Promise.race([loadValuations().catch(() => undefined), new Promise((r) => setTimeout(r, 2500))]).then(render)
