import { chromium } from 'playwright'
const b = await chromium.launch()
for (const [w,h] of [[1350,940],[412,823]]) for (const r of ['overview','forecast','sensitivity']) {
  const p = await b.newPage({ viewport: { width: w, height: h } })
  await p.addInitScript(() => { window.__ls = []; new PerformanceObserver((l) => { for (const e of l.getEntries()) { if (e.hadRecentInput) continue; window.__ls.push({ v: +e.value.toFixed(4), t: Math.round(e.startTime), src: e.sources.map((s) => { const n = s.node; return (n?.nodeName ?? '?') + '.' + String(n?.className ?? '').slice(0, 40) + ' ' + JSON.stringify([s.previousRect.y, s.previousRect.height, s.currentRect.y, s.currentRect.height]) }) }) } }).observe({ type: 'layout-shift', buffered: true }) })
  await p.goto(`http://localhost:4180/dcf-valuation-model/#/${r}`); await p.waitForTimeout(3000)
  const ls = await p.evaluate(() => window.__ls)
  console.log(w, r, 'CLS', ls.reduce((a, e) => a + e.v, 0).toFixed(3)); for (const e of ls) console.log('  ', e.v, e.t, e.src.join(' | '))
  await p.close()
}
await b.close()
