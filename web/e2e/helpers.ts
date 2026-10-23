import type { Page } from '@playwright/test'

export const ROUTES = ['overview', 'forecast', 'sensitivity', 'monte-carlo', 'reverse-dcf', 'compare', 'methodology', 'gallery'] as const

export async function open(page: Page, route: string) {
  await page.goto(`#/${route}`)
  await page.waitForSelector('main h1')
  await page.waitForSelector('[data-testid="price-chip-implied"]')
  if (route === 'monte-carlo') await page.waitForSelector('[data-testid="histogram"] svg', { timeout: 20_000 })
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(300)
}

/** Horizontal overflow, ignoring content inside intentional horizontal scrollers. */
export function overflow(page: Page) {
  return page.evaluate(() => {
    const client = document.documentElement.clientWidth
    let maxRight = 0, worst = ''
    for (const el of document.querySelectorAll('body *')) {
      let p = el.parentElement, scroller = false
      while (p) { const s = getComputedStyle(p).overflowX; if (s === 'auto' || s === 'scroll' || s === 'hidden') { scroller = true; break } p = p.parentElement }
      if (scroller) continue
      const r = el.getBoundingClientRect()
      if (r.width && r.height && r.right > maxRight) { maxRight = r.right; worst = el.tagName + '.' + String(el.className).slice(0, 50) }
    }
    return { scroll: document.documentElement.scrollWidth, client, maxRight: Math.round(maxRight), worst }
  })
}

/** Visible interactive elements smaller than 44×44 CSS px. */
export function smallTargets(page: Page) {
  return page.evaluate(() => {
    const sel = 'a[href], button, input, select, textarea, [role="tab"], [role="slider"], [role="button"], [role="checkbox"], [role="combobox"], [tabindex="0"]'
    const out: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>(sel)) {
      if (el.closest('.sr-only') || el.getAttribute('role') === 'tablist') continue
      // dense chart marks are exempt only when the chart offers a visible 44px stepper alternative
      const alt = el.closest('svg[data-touch-alt]')?.getAttribute('data-touch-alt')
      if (alt) {
        const btns = [...(document.getElementById(alt)?.querySelectorAll('button') ?? [])].map((b) => b.getBoundingClientRect())
        if (btns.length >= 2 && btns.every((b) => b.width >= 44 && b.height >= 44)) continue
      }
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      if (!r.width || !r.height || cs.visibility === 'hidden') continue
      if (r.bottom < 0 || r.top > document.documentElement.scrollHeight) continue
      // inline links inside running text are exempt (WCAG 2.5.8 "inline" exception)
      if (el.tagName === 'A' && el.parentElement?.closest('p, li') && getComputedStyle(el).display === 'inline') continue
      // `.hit` extends the pointer target with a centred 44px ::after; count that area
      const after = getComputedStyle(el, '::after')
      const w = Math.max(r.width, after.content !== 'none' && after.position === 'absolute' ? parseFloat(after.width) || 0 : 0)
      const h = Math.max(r.height, after.content !== 'none' && after.position === 'absolute' ? parseFloat(after.height) || 0 : 0)
      if (w < 43.5 || h < 43.5) out.push(`${el.tagName}${el.getAttribute('role') ? `[${el.getAttribute('role')}]` : ''} "${(el.getAttribute('aria-label') ?? el.textContent ?? '').trim().slice(0, 30)}" ${Math.round(w)}x${Math.round(h)}`)
    }
    return out
  })
}
