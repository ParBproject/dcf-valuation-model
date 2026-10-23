// M7 screenshots: every route at 1440 / 768 / 390, landscape phone, and keyboard-focus examples.
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const OUT = process.env.SHOTS_DIR ?? '/workspace/dcf-shots'
const PORT = 4184
const BASE = `http://localhost:${PORT}/dcf-valuation-model/`
const ROUTES = ['overview', 'forecast', 'sensitivity', 'monte-carlo', 'reverse-dcf', 'compare', 'methodology', 'gallery']
mkdirSync(OUT, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true })
for (let i = 0; ; i++) {
  try { if ((await fetch(BASE)).ok) break } catch { /* starting */ }
  if (i > 100) throw new Error('preview server did not start')
  await new Promise((r) => setTimeout(r, 200))
}
const ready = async (p, route) => {
  await p.waitForSelector('main h1'); await p.waitForSelector('[data-testid="price-chip-implied"]')
  if (route === 'monte-carlo') await p.waitForSelector('[data-testid="histogram"] svg')
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600)
}
const shots = []
const browser = await chromium.launch()
try {
  for (const [w, h] of [[1440, 1000], [768, 1024], [390, 844]]) {
    const p = await browser.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: w < 800 ? 2 : 1, reducedMotion: 'reduce' })
    for (const r of ROUTES) {
      await p.goto(BASE + '#/' + r); await ready(p, r)
      const f = `${OUT}/m7-${r}-${w}.png`; await p.screenshot({ path: f, fullPage: true }); shots.push(f)
    }
    await p.close()
  }
  // landscape phone
  const l = await browser.newPage({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 2, reducedMotion: 'reduce' })
  for (const r of ['overview', 'sensitivity']) {
    await l.goto(BASE + '#/' + r); await ready(l, r)
    const f = `${OUT}/m7-${r}-landscape-844x390.png`; await l.screenshot({ path: f }); shots.push(f)
  }
  await l.close()

  // keyboard focus examples
  let k = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  await k.goto(BASE + '#/overview'); await ready(k, 'overview')
  await k.keyboard.press('Tab')
  let f = `${OUT}/m7-keyboard-skip-link-1440.png`; await k.screenshot({ path: f }); shots.push(f)
  await k.getByRole('slider', { name: 'Target EBIT margin' }).focus(); await k.keyboard.press('ArrowRight'); await k.keyboard.press('ArrowLeft')
  await k.waitForTimeout(300)
  f = `${OUT}/m7-keyboard-focus-slider-1440.png`; await k.screenshot({ path: f }); shots.push(f)
  await k.close()
  k = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  await k.goto(BASE + '#/sensitivity'); await ready(k, 'sensitivity')
  for (let i = 0; i < 80; i++) { await k.keyboard.press('Tab'); if (await k.evaluate(() => document.activeElement?.getAttribute('role') === 'gridcell')) break }
  await k.keyboard.press('ArrowRight'); await k.keyboard.press('ArrowDown'); await k.keyboard.press('ArrowDown'); await k.waitForTimeout(200)
  f = `${OUT}/m7-keyboard-focus-heatmap-1440.png`; await k.screenshot({ path: f }); shots.push(f)
  await k.close()
  k = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  await k.goto(BASE + '#/monte-carlo'); await ready(k, 'monte-carlo')
  for (let i = 0; i < 80; i++) { await k.keyboard.press('Tab'); if (await k.evaluate(() => document.activeElement?.hasAttribute('data-bin'))) break }
  for (let i = 0; i < 12; i++) await k.keyboard.press('ArrowRight')
  await k.keyboard.press('Enter'); await k.waitForTimeout(300)
  f = `${OUT}/m7-keyboard-focus-histogram-1440.png`; await k.screenshot({ path: f }); shots.push(f)
  await k.close()
  k = await browser.newPage({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' })
  await k.goto(BASE + '#/forecast'); await ready(k, 'forecast')
  for (let i = 0; i < 80; i++) { await k.keyboard.press('Tab'); if (await k.evaluate(() => document.activeElement?.getAttribute('data-step') === 'pv_fcf')) break }
  await k.keyboard.press('ArrowRight'); await k.keyboard.press('ArrowRight'); await k.keyboard.press('ArrowRight'); await k.keyboard.press('Enter')
  await k.waitForTimeout(500); await k.keyboard.press('Tab')
  f = `${OUT}/m7-keyboard-focus-drill-sheet-1440.png`; await k.screenshot({ path: f }); shots.push(f)
  await k.close()
  const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, reducedMotion: 'reduce' })
  await m.goto(BASE + '#/overview'); await ready(m, 'overview')
  await m.getByTestId('assumptions-fab').focus(); await m.keyboard.press('Enter'); await m.waitForSelector('[data-testid="assumptions-sheet"]'); await m.waitForTimeout(500)
  for (let i = 0; i < 4; i++) await m.keyboard.press('Tab')
  await m.waitForTimeout(400)
  f = `${OUT}/m7-keyboard-focus-sheet-390.png`; await m.screenshot({ path: f }); shots.push(f)
  await m.close()
} finally {
  await browser.close()
  process.kill(-server.pid)
}
console.log(shots.join('\n'))
