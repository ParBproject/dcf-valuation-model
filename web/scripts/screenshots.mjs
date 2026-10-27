// Usage: npm run build && npm run shots   (starts `vite preview`, captures, checks overflow)
import { spawn } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { chromium } from 'playwright'

const OUT = process.env.SHOTS_DIR ?? '/workspace/dcf-shots'
const PORT = 4179
const BASE = `http://localhost:${PORT}/dcf-valuation-model/`
mkdirSync(OUT, { recursive: true })

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'ignore', detached: true })
for (let i = 0; ; i++) {
  try { if ((await fetch(BASE)).ok) break } catch { /* not up yet */ }
  if (i > 100) throw new Error('preview server did not start')
  await new Promise((r) => setTimeout(r, 200))
}

const browser = await chromium.launch()
const results = []
try {
  for (const [name, route] of [['overview', '#/overview'], ['gallery', '#/gallery']]) {
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 900 }, deviceScaleFactor: width === 390 ? 2 : 1 })
      await page.goto(BASE + route)
      await page.waitForSelector('main h1')
      if (name === 'overview') await page.waitForFunction(() => !document.querySelector('[aria-label="loading"]'))
      await page.waitForTimeout(400)
      const m = await page.evaluate(() => {
        const client = document.documentElement.clientWidth
        // widest element edge, so clipped overflow can't hide behind overflow:hidden
        let maxRight = 0
        for (const el of document.querySelectorAll('body *')) if (!el.closest('.sr-only')) maxRight = Math.max(maxRight, el.getBoundingClientRect().right)
        return { scroll: document.documentElement.scrollWidth, client, maxRight: Math.round(maxRight) }
      })
      const path = `${OUT}/${name}-${width}.png`
      await page.screenshot({ path, fullPage: true })
      results.push({ name, width, ...m, overflow: m.scroll > m.client || m.maxRight > m.client + 1, path })
      await page.close()
    }
  }
} finally {
  await browser.close()
  process.kill(-server.pid)
}
console.table(results)
if (results.some((r) => r.width === 390 && r.overflow)) { console.error('horizontal overflow at 390px'); process.exit(1) }
