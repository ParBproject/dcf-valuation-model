import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { ROUTES, open } from './helpers'

for (const width of [1440, 390]) {
  for (const route of ROUTES) {
    test(`axe: ${route} @${width} has no serious or critical violations`, async ({ page }) => {
      await page.setViewportSize({ width, height: width > 800 ? 1000 : 844 })
      await open(page, route)
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze()
      const bad = r.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical')
      const report = bad.map((v) => `${v.impact} ${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`)
      test.info().annotations.push({ type: 'axe', description: `violations=${r.violations.length} serious+critical=${bad.length} passes=${r.passes.length}` })
      expect(report, report.join('\n')).toEqual([])
    })
  }
}
