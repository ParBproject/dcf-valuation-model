// Lighthouse against the production build served locally under /dcf-valuation-model/.
// Usage: node scripts/lighthouse.mjs   (expects `vite preview --port 4185` running)
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { chromium } from 'playwright'

const BASE = process.env.BASE ?? 'http://localhost:4185/dcf-valuation-model/'
const OUT = new URL('../../docs/lighthouse/', import.meta.url).pathname
const PAGES = { overview: '#/', forecast: '#/forecast', sensitivity: '#/sensitivity' }
const CHROME = process.env.CHROME_PATH ?? chromium.executablePath()
mkdirSync(OUT, { recursive: true })
const summary = { generated: new Date().toISOString(), base: BASE, chrome: CHROME.split('/').slice(-3).join('/'), runs: [] }
for (const device of ['mobile', 'desktop']) {
  for (const [page, hash] of Object.entries(PAGES)) {
    const tmp = `/tmp/lh-${device}-${page}.json`
    const args = ['lighthouse', BASE + hash, '--quiet', '--output=json', `--output-path=${tmp}`,
      '--only-categories=performance,accessibility,best-practices,seo',
      `--chrome-flags=--headless=new --no-sandbox --disable-gpu`]
    if (device === 'desktop') args.push('--preset=desktop')
    execFileSync('npx', args, { stdio: 'inherit', env: { ...process.env, CHROME_PATH: CHROME } })
    const r = JSON.parse(readFileSync(tmp, 'utf8')); rmSync(tmp)
    const cat = Object.fromEntries(Object.entries(r.categories).map(([k, v]) => [k, Math.round(v.score * 100)]))
    const a = r.audits
    const metrics = Object.fromEntries(['first-contentful-paint', 'largest-contentful-paint', 'total-blocking-time', 'cumulative-layout-shift', 'speed-index']
      .map((k) => [k, { value: a[k].numericValue, display: a[k].displayValue }]))
    const failing = Object.values(a).filter((x) => x.score !== null && x.score < 0.9 && x.scoreDisplayMode !== 'informative' && x.scoreDisplayMode !== 'manual' && x.scoreDisplayMode !== 'notApplicable').map((x) => x.id)
    const run = { page, device, url: BASE + hash, lighthouseVersion: r.lighthouseVersion, scores: cat, metrics, failingAudits: failing }
    summary.runs.push(run)
    console.log(device.padEnd(8), page.padEnd(12), JSON.stringify(cat), 'fails:', failing.join(','))
  }
}
writeFileSync(OUT + 'summary.json', JSON.stringify(summary, null, 2) + '\n')
