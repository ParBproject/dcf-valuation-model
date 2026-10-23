import { test, expect } from '@playwright/test'
import { ROUTES, open, overflow, smallTargets } from './helpers'

const SIZES = [
  { name: '360', width: 360, height: 780 },
  { name: '390', width: 390, height: 844 },
  { name: '414', width: 414, height: 896 },
  { name: '768', width: 768, height: 1024 },
  { name: '844-landscape', width: 844, height: 390 },
  { name: '1024-landscape', width: 1024, height: 768 },
]

for (const s of SIZES) {
  test(`no horizontal overflow on any route @${s.name}`, async ({ page }) => {
    await page.setViewportSize({ width: s.width, height: s.height })
    const bad: string[] = []
    for (const r of ROUTES) {
      await open(page, r)
      const o = await overflow(page)
      if (o.scroll > o.client || o.maxRight > o.client + 0.5) bad.push(`${r}: ${JSON.stringify(o)}`)
    }
    expect(bad, bad.join('\n')).toEqual([])
  })
}

for (const s of SIZES.filter((x) => x.width < 1024)) {
  test(`touch targets are at least 44px @${s.name}`, async ({ page }) => {
    await page.setViewportSize({ width: s.width, height: s.height })
    const bad: string[] = []
    for (const r of ROUTES) {
      await open(page, r)
      for (const t of await smallTargets(page)) bad.push(`${r}: ${t}`)
    }
    // the assumptions sheet too
    await open(page, 'overview')
    await page.getByTestId('assumptions-fab').click()
    await page.waitForSelector('[data-testid="assumptions-sheet"] [data-field]')
    await page.waitForTimeout(400)
    for (const t of await smallTargets(page)) bad.push(`sheet: ${t}`)
    expect([...new Set(bad)], [...new Set(bad)].join('\n')).toEqual([])
  })
}

test('bottom bar, floating button and sheets respect safe-area insets', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'overview')
  const css = await page.evaluate(() => {
    const nav = document.querySelector('nav[data-bottom-tabs]') as HTMLElement
    const fab = document.querySelector('[data-testid="assumptions-fab"]') as HTMLElement
    const vp = document.querySelector('meta[name="viewport"]')?.getAttribute('content') ?? ''
    // env() resolves to 0 in desktop Chromium, so check the authored rules
    const rules = [...document.styleSheets].flatMap((sh) => [...sh.cssRules].map((r) => r.cssText)).join('\n')
    return { vp, navClass: nav.className, fabClass: fab.className, hasEnv: /safe-area-inset-bottom/.test(rules) }
  })
  expect(css.vp).toContain('viewport-fit=cover')
  expect(css.navClass).toContain('safe-area-inset-bottom')
  expect(css.fabClass).toContain('safe-area-inset-bottom')
  expect(css.hasEnv).toBe(true)
})

test('heatmap scrolls inside its card with a fade hint on narrow screens', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 })
  await open(page, 'sensitivity')
  const region = page.getByRole('region', { name: 'Sensitivity grid' })
  const dims = await region.evaluate((el) => ({ sw: el.scrollWidth, cw: el.clientWidth }))
  expect(dims.sw).toBeGreaterThan(dims.cw)
  const fade = region.locator('xpath=..').getByTestId('scroll-fade')
  await expect(fade).toHaveAttribute('data-visible', 'true')
  await region.evaluate((el) => el.scrollTo({ left: el.scrollWidth }))
  await expect(fade).toHaveAttribute('data-visible', 'false')
  const o = await overflow(page)
  expect(o.scroll).toBeLessThanOrEqual(o.client)
})
