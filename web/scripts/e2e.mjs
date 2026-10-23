// M5 browser checks: slider changes price, URL restores state, no overflow at 390, screenshots.
// Usage: npm run build && npm run e2e
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const OUT = process.env.SHOTS_DIR ?? '/workspace/dcf-shots'
const PORT = 4180
const BASE = `http://localhost:${PORT}/dcf-valuation-model/`
mkdirSync(OUT, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true })
for (let i = 0; ; i++) {
  try { if ((await fetch(BASE)).ok) break } catch { /* starting */ }
  if (i > 100) throw new Error('preview server did not start')
  await new Promise((r) => setTimeout(r, 200))
}

const checks = []
const check = (name, ok, detail = '') => { checks.push({ name, ok, detail }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`) }
const overflow = (page) => page.evaluate(() => {
  const client = document.documentElement.clientWidth
  let maxRight = 0
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.width && r.height) maxRight = Math.max(maxRight, r.right)
  }
  return { scroll: document.documentElement.scrollWidth, client, maxRight: Math.round(maxRight) }
})
const chip = (page) => page.locator('[data-testid="price-chip-implied"]').innerText()

const browser = await chromium.launch()
try {
  // 1. Desktop: slider moves price; state goes to URL; timing
  const d = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await d.goto(BASE + '#/overview')
  await d.waitForSelector('[data-testid="price-chip-implied"]')
  await d.waitForFunction(() => document.body.innerText.includes('ms in worker'))
  const before = await chip(d)
  const thumb = d.locator('aside [data-field="growth_start"] [role="slider"]')
  await thumb.focus()
  for (let i = 0; i < 40; i++) await d.keyboard.press('ArrowRight')
  await d.waitForTimeout(300)
  const after = await chip(d)
  check('slider changes implied price', before !== after, `${before} -> ${after}`)
  const url = d.url()
  check('state synced to URL', url.includes('growth_start='), url.split('#')[1])
  const perf = await d.evaluate(() => window.__dcfPerf())
  check('recompute < 16ms (max over slider moves)', perf.max < 16, JSON.stringify(perf))
  await d.waitForFunction(() => document.body.innerText.includes('ms in worker'))
  await d.screenshot({ path: `${OUT}/m5-overview-1440.png`, fullPage: true })

  // 2. URL restores state
  const target = '#/overview?t=KO&s=bull&p=damodaran&beta=0.9&forecast_years=8'
  const r = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  await r.goto(BASE + target)
  await r.waitForSelector('[data-testid="price-chip-implied"]')
  const picker = await r.locator('select[aria-label="Company"]').inputValue()
  await r.waitForSelector('aside input[aria-label="Beta value"]')
  const betaVal = await r.locator('aside input[aria-label="Beta value"]').inputValue()
  const yrs = await r.locator('aside input[aria-label="Horizon value"]').inputValue()
  const bullSel = await r.locator('[role="tab"][data-state="active"]', { hasText: 'Bull' }).count()
  const damSel = await r.locator('[role="tab"][data-state="active"]', { hasText: 'Damodaran' }).count()
  check('URL restores ticker/scenario/pairing/assumptions', picker.includes('KO') && betaVal === '0.9' && yrs === '8' && bullSel === 1 && damSel === 1,
    `picker=${picker.trim()} beta=${betaVal} years=${yrs} bull=${bullSel} damodaran=${damSel}`)
  check('URL kept intact after hydrate', r.url().includes('t=KO') && r.url().includes('beta=0.9'), r.url().split('#')[1])
  await r.screenshot({ path: `${OUT}/m5-restored-1440.png`, fullPage: true })

  // 3. Mobile 390: overflow closed + sheet open
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await m.goto(BASE + '#/overview')
  await m.waitForSelector('[data-testid="price-chip-implied"]')
  await m.waitForFunction(() => document.body.innerText.includes('ms in worker'))
  const o1 = await overflow(m)
  check('no horizontal overflow at 390 (overview)', o1.scroll <= o1.client && o1.maxRight <= o1.client + 1, JSON.stringify(o1))
  await m.screenshot({ path: `${OUT}/m5-overview-390.png`, fullPage: true })
  await m.getByRole('button', { name: /^Assumptions/ }).click()
  await m.waitForSelector('[data-testid="assumptions-sheet"]')
  await m.waitForTimeout(600)
  const before390 = await chip(m)
  const t390 = m.locator('[data-testid="assumptions-sheet"] [data-field="target_margin"] [role="slider"]')
  await t390.focus()
  for (let i = 0; i < 20; i++) await m.keyboard.press('ArrowRight')
  await m.waitForTimeout(300)
  check('mobile sheet slider changes price', before390 !== (await chip(m)), `${before390} -> ${await chip(m)}`)
  const o2 = await overflow(m)
  check('no horizontal overflow at 390 (sheet open)', o2.scroll <= o2.client && o2.maxRight <= o2.client + 1, JSON.stringify(o2))
  await m.screenshot({ path: `${OUT}/m5-sheet-390.png` })
} finally {
  await browser.close()
  process.kill(-server.pid)
}
const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} checks passed`)
process.exit(failed.length ? 1 : 0)
