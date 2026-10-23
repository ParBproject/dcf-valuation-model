// M6 browser checks: chart interactions, reduced motion, overflow on every route, screenshots.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const OUT = process.env.SHOTS_DIR ?? '/workspace/dcf-shots'
const PORT = 4182
const BASE = `http://localhost:${PORT}/dcf-valuation-model/`
mkdirSync(OUT, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true })
for (let i = 0; ; i++) {
  try { if ((await fetch(BASE)).ok) break } catch { /* starting */ }
  if (i > 100) throw new Error('preview server did not start')
  await new Promise((r) => setTimeout(r, 200))
}
const checks = []
const check = (name, ok, detail = '') => { checks.push({ name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${name} ${detail}`) }
const overflow = (page) => page.evaluate(() => {
  const client = document.documentElement.clientWidth
  let maxRight = 0, worst = ''
  for (const el of document.querySelectorAll('body *')) {
    // elements inside horizontal scrollers (wide tables) are allowed to extend
    let p = el.parentElement, scroller = false
    while (p) { const s = getComputedStyle(p).overflowX; if (s === 'auto' || s === 'scroll') { scroller = true; break } p = p.parentElement }
    if (scroller) continue
    const r = el.getBoundingClientRect()
    if (r.width && r.height && r.right > maxRight) { maxRight = r.right; worst = el.tagName + '.' + String(el.className).slice(0, 40) }
  }
  return { scroll: document.documentElement.scrollWidth, client, maxRight: Math.round(maxRight), worst }
})
const chip = (p) => p.locator('[data-testid="price-chip-implied"]').innerText()
const ready = async (p) => { await p.waitForSelector('[data-testid="price-chip-implied"]'); await p.waitForSelector('main h1'); await p.waitForTimeout(500) }

const browser = await chromium.launch()
try {
  const d = await browser.newPage({ viewport: { width: 1440, height: 1000 } })

  // hover linking
  await d.goto(BASE + '#/forecast'); await ready(d)
  const bar = d.locator('[data-testid="fcf-bars"] rect[data-year="2030"]')
  const bb = await bar.boundingBox()
  await d.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2)
  await d.waitForTimeout(250)
  const linked = await d.evaluate(() => ({
    bar: !!document.querySelector('[data-testid="fcf-bars"] rect[data-year="2030"][data-active]'),
    row: !!document.querySelector('[data-testid="forecast-table"] tr[data-row="2030"][data-active]'),
    wf: !!document.querySelector('[data-testid="waterfall"] rect[data-pv-year="2030"][data-active]'),
  }))
  check('hover links bars, waterfall and table', linked.bar && linked.row && linked.wf, JSON.stringify(linked))

  // waterfall drill-down
  await d.locator('[data-testid="waterfall"] [data-step="debt"]').click()
  await d.waitForSelector('[data-testid="drill-panel"]')
  const drillTxt = await d.locator('[data-testid="drill-panel"]').innerText()
  check('waterfall drill-down opens with source filing', /accn \d{10}-\d{2}-\d{6}/.test(drillTxt) && /filed \d{4}-\d{2}-\d{2}/.test(drillTxt), drillTxt.split('\n').slice(0, 3).join(' | '))
  await d.waitForTimeout(700)
  await d.screenshot({ path: `${OUT}/m6-forecast-drill-1440.png` })
  await d.keyboard.press('Escape'); await d.waitForTimeout(400)

  // drill-down on mobile (bottom sheet) + overflow
  const mob = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 })
  await mob.goto(BASE + '#/forecast'); await ready(mob)
  await mob.locator('[data-testid="waterfall"] [data-step="cash"]').click()
  await mob.waitForSelector('[data-testid="drill-panel"]'); await mob.waitForTimeout(700)
  const om = await overflow(mob)
  check('mobile drill-down sheet opens without overflow', om.scroll <= om.client, JSON.stringify(om))
  await mob.screenshot({ path: `${OUT}/m6-forecast-drill-390.png` })
  await mob.close()

  // heatmap click
  await d.goto(BASE + '#/sensitivity'); await ready(d)
  const before = await chip(d)
  await d.locator('[data-testid="heatmap"] [data-cell="0-1"][data-valid="true"]').click()
  await d.waitForTimeout(400)
  const after = await chip(d)
  check('heatmap click updates price and URL', before !== after && d.url().includes('wacc=') && d.url().includes('terminal_growth='), `${before} -> ${after} ${d.url().split('?')[1]}`)

  // histogram bin click
  await d.goto(BASE + '#/monte-carlo'); await ready(d)
  await d.waitForSelector('[data-testid="histogram"] [data-bin="20"]')
  await d.locator('[data-testid="histogram"] [data-bin="20"]').click()
  await d.waitForSelector('[data-testid="bin-draws"]')
  const bins = await d.locator('[data-testid="bin-draws"] tbody tr').count()
  check('histogram bin click shows draws', bins > 0, `${bins} sample rows`)

  // compare click-through
  await d.goto(BASE + '#/compare'); await ready(d)
  await d.locator('[data-testid="compare-table"] tr[data-row="KO"]').click()
  await d.waitForTimeout(400)
  const picker = (await d.locator('button[aria-label="Company"]').innerText()).trim()
  check('compare click-through opens ticker', d.url().includes('/overview') && d.url().includes('t=KO') && picker.startsWith('KO'), d.url().split('#')[1])

  // reduced motion: tick-up should be instant; with motion it should be mid-animation
  const sample = async (reduce) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: reduce ? 'reduce' : 'no-preference' })
    const p = await ctx.newPage()
    await p.goto(BASE + '#/overview'); await ready(p)
    const tile = p.locator('[data-testid="implied-value"]')
    await p.getByRole('tab', { name: 'Bull' }).click()
    await p.waitForTimeout(60)
    const early = await tile.innerText()
    await p.waitForTimeout(900)
    const late = await tile.innerText()
    await ctx.close()
    return { early, late }
  }
  const rm = await sample(true), nm = await sample(false)
  check('reduced motion: numbers jump straight to final value', rm.early === rm.late, JSON.stringify(rm))
  check('default motion: numbers animate (control)', nm.early !== nm.late, JSON.stringify(nm))

  // every route: screenshots + overflow at 390
  const routes = ['overview', 'forecast', 'sensitivity', 'monte-carlo', 'reverse-dcf', 'compare', 'methodology', 'gallery']
  for (const width of [1440, 390]) {
    const p = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 }, deviceScaleFactor: width === 390 ? 2 : 1 })
    for (const r of routes) {
      await p.goto(BASE + '#/' + r); await ready(p)
      if (r === 'overview' || r === 'monte-carlo') await p.waitForFunction(() => !document.body.innerText.includes('updating…')).catch(() => {})
      await p.waitForTimeout(400)
      if (width === 390) {
        const o = await overflow(p)
        check(`no horizontal overflow at 390: ${r}`, o.scroll <= o.client && o.maxRight <= o.client + 1, JSON.stringify(o))
      }
      await p.screenshot({ path: `${OUT}/m6-${r}-${width}.png`, fullPage: true })
    }
    await p.close()
  }
} finally {
  await browser.close()
  process.kill(-server.pid)
}
const failed = checks.filter((c) => !c.ok)
console.log(`${checks.length - failed.length}/${checks.length} checks passed`)
process.exit(failed.length ? 1 : 0)
