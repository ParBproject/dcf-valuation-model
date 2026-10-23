// Records the README demo: Playwright video → ffmpeg GIF (docs/img/demo.gif, must stay ≤ 5 MB).
import { spawn, execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync, statSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 4186
const BASE = `http://localhost:${PORT}/dcf-valuation-model/`
const TMP = '/tmp/dcf-demo-video'
const OUT = new URL('../../docs/img/demo.gif', import.meta.url).pathname
rmSync(TMP, { recursive: true, force: true }); mkdirSync(TMP, { recursive: true })
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true })
for (let i = 0; ; i++) {
  try { if ((await fetch(BASE)).ok) break } catch { /* starting */ }
  if (i > 100) throw new Error('preview server did not start')
  await new Promise((r) => setTimeout(r, 200))
}
const browser = await chromium.launch()
try {
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 760 }, recordVideo: { dir: TMP, size: { width: 1280, height: 760 } } })
  const p = await ctx.newPage()
  const wait = (ms) => p.waitForTimeout(ms)
  await p.goto(BASE + '#/overview'); await p.waitForSelector('aside [data-field]'); await wait(1200)
  // 1. slider changes the price (drag the target-margin thumb)
  const thumb = p.getByRole('slider', { name: 'Target EBIT margin' }).first()
  const box = await thumb.boundingBox()
  await p.mouse.move(box.x + box.width / 2, box.y + box.height / 2); await p.mouse.down()
  for (let i = 1; i <= 20; i++) { await p.mouse.move(box.x + box.width / 2 + i * 1.5, box.y + box.height / 2); await wait(40) }
  await p.mouse.up(); await wait(1200)
  // 2. scenario morph
  await p.getByRole('tab', { name: 'Bull' }).click(); await wait(1500)
  await p.getByRole('tab', { name: 'Bear' }).click(); await wait(1500)
  // 3. heatmap click
  await p.getByRole('link', { name: 'Sensitivity' }).first().click(); await p.waitForSelector('[data-testid="heatmap"] svg'); await wait(1000)
  const cell = p.locator('[data-testid="heatmap"] [data-cell="0-5"]'); await cell.hover(); await wait(700); await cell.click(); await wait(1500)
  // 4. drill-down
  await p.getByRole('link', { name: 'Forecast' }).first().click(); await p.waitForSelector('[data-testid="waterfall"] svg'); await wait(800)
  await p.locator('[data-testid="fcf-bars"] rect[data-year="2030"]').hover({ force: true }); await wait(900)
  await p.locator('[data-testid="waterfall"] [data-step="debt"]').click(); await wait(2200)
  await ctx.close()
} finally {
  await browser.close()
  try { process.kill(-server.pid) } catch { /* already gone */ }
}
const webm = `${TMP}/${readdirSync(TMP).find((f) => f.endsWith('.webm'))}`
execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', webm, '-vf',
  'fps=8,scale=880:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=64:stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4:diff_mode=rectangle', OUT])
const mb = statSync(OUT).size / 1e6
console.log(`${OUT} ${mb.toFixed(2)} MB`)
if (mb > 5) { console.error('GIF exceeds 5 MB'); process.exit(1) }
