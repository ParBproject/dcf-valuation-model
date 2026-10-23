import { test, expect } from '@playwright/test'
import { ROUTES, open } from './helpers'

// Visual regression baselines (committed under e2e/__screenshots__). Animations are disabled and
// reduced motion is on (playwright.config.ts); timing read-outs are masked because they vary per run.
const WIDTHS = [
  { w: 390, h: 844 },
  { w: 768, h: 1024 },
  { w: 1440, h: 1000 },
]

for (const { w, h } of WIDTHS) {
  for (const route of ROUTES) {
    test(`visual: ${route} @${w}`, async ({ page }) => {
      await page.setViewportSize({ width: w, height: h })
      await open(page, route)
      if (w >= 1024 && route !== 'gallery' && route !== 'methodology') await page.waitForSelector('aside [data-field]')
      await page.mouse.move(0, 0)
      await expect(page).toHaveScreenshot(`${route}-${w}.png`, { fullPage: true, mask: [page.locator('[data-volatile]')], maskColor: '#111827' })
    })
  }
}
