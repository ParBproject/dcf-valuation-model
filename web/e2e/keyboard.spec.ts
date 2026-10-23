import { test, expect, type Page } from '@playwright/test'
import { open } from './helpers'

const focused = (page: Page) => page.evaluate(() => {
  const el = document.activeElement as HTMLElement | null
  if (!el) return null
  const cs = getComputedStyle(el)
  return { tag: el.tagName, role: el.getAttribute('role'), label: el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 40), id: el.id,
    cell: el.getAttribute('data-cell'), bin: el.getAttribute('data-bin'), step: el.getAttribute('data-step'),
    ring: cs.boxShadow !== 'none' || (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) ||
      getComputedStyle(el, '::before').boxShadow !== 'none',
    inDialog: !!el.closest('[role="dialog"]') }
})
const tabUntil = async (page: Page, pred: (f: NonNullable<Awaited<ReturnType<typeof focused>>>) => boolean, max = 80) => {
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    const f = await focused(page)
    if (f && pred(f)) return f
  }
  throw new Error('target not reached by Tab')
}

test.beforeEach(async ({ page }) => { await page.setViewportSize({ width: 1440, height: 1000 }) })

test('skip link is the first tab stop and moves focus to main', async ({ page }) => {
  await open(page, 'overview')
  await page.keyboard.press('Tab')
  const f = await focused(page)
  expect(f?.label).toBe('Skip to content')
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeInViewport()
  await page.keyboard.press('Enter')
  expect((await focused(page))?.id).toBe('main')
})

test('every tab stop on Overview shows a visible focus indicator', async ({ page }) => {
  await open(page, 'overview')
  const missing: string[] = []
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab')
    const f = await focused(page)
    if (!f || f.tag === 'BODY') break
    if (!f.ring && f.id !== 'main') missing.push(`${f.tag}[${f.role}] ${f.label}`)
  }
  expect(missing).toEqual([])
})

test('sliders move with arrow keys and update the value', async ({ page }) => {
  await open(page, 'overview')
  const before = await page.getByTestId('price-chip-implied').innerText()
  const thumb = page.getByRole('slider', { name: 'Target EBIT margin' }).first()
  await thumb.focus()
  for (let i = 0; i < 5; i++) await page.keyboard.press('ArrowRight')
  await expect(page.getByTestId('price-chip-implied')).not.toHaveText(before)
  expect((await focused(page))?.ring).toBe(true)
  await expect(page).toHaveURL(/target_margin/)
})

test('tabs switch with arrow keys', async ({ page }) => {
  await open(page, 'overview')
  const base = page.getByRole('tab', { name: 'Base' })
  await base.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Bull' })).toHaveAttribute('aria-selected', 'true')
  await expect(page).toHaveURL(/[?&]s=bull/)
})

test('heatmap cells are reachable with arrow keys and Enter applies WACC and g', async ({ page }) => {
  await open(page, 'sensitivity')
  const f0 = await tabUntil(page, (f) => f.role === 'gridcell')
  expect(f0.cell).toBe('0-0')
  expect(f0.ring).toBe(true)
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowDown'); await page.keyboard.press('ArrowDown')
  const f1 = await focused(page)
  expect(f1?.cell).toBe('2-1')
  await expect(page.getByRole('tooltip')).toBeVisible()
  const before = await page.getByTestId('price-chip-implied').innerText()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('price-chip-implied')).not.toHaveText(before)
  await expect(page).toHaveURL(/#\/sensitivity\?.*wacc=/)
  await page.keyboard.press('End')
  expect((await focused(page))?.cell).toBe('2-6')
})

test('histogram bins are reachable with arrow keys and Enter shows the draws', async ({ page }) => {
  await open(page, 'monte-carlo')
  const f0 = await tabUntil(page, (f) => f.bin !== null)
  expect(f0.bin).toBe('0')
  for (let i = 0; i < 10; i++) await page.keyboard.press('ArrowRight')
  expect((await focused(page))?.bin).toBe('10')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('bin-draws')).toBeVisible()
})

test('drill-down sheet traps focus, closes on Esc and restores focus', async ({ page }) => {
  await open(page, 'forecast')
  await tabUntil(page, (f) => f.step === 'pv_fcf')
  await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight'); await page.keyboard.press('ArrowRight')
  expect((await focused(page))?.step).toBe('debt')
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('drill-panel')).toBeVisible()
  for (let i = 0; i < 12; i++) { await page.keyboard.press('Tab'); expect((await focused(page))?.inDialog).toBe(true) }
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('drill-panel')).toBeHidden()
  expect((await focused(page))?.step).toBe('debt')
})

test('assumptions sheet (mobile) traps focus and closes on Esc', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await open(page, 'overview')
  const fab = page.getByTestId('assumptions-fab')
  await fab.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByTestId('assumptions-sheet')).toBeVisible()
  for (let i = 0; i < 30; i++) { await page.keyboard.press('Tab'); expect((await focused(page))?.inDialog).toBe(true) }
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('assumptions-sheet')).toBeHidden()
  await expect(fab).toBeFocused()
})

test('reduced motion: values jump straight to the result', async ({ page }) => {
  await open(page, 'overview')
  const thumb = page.getByRole('slider', { name: 'Revenue growth (yr 1)' }).first()
  await thumb.focus()
  await page.keyboard.press('PageUp')
  const chip = await page.getByTestId('price-chip-implied').innerText()
  // no tween: the big number already equals the chip in the same frame
  await expect(page.getByTestId('implied-value')).toHaveText(chip, { timeout: 100 })
  const dur = await page.evaluate(() => getComputedStyle(document.querySelector('[data-testid="scroll-fade"], main')!).transitionDuration)
  expect(dur.split(',').every((d) => parseFloat(d) <= 0.0001)).toBe(true)
})
