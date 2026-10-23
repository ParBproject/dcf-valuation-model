import { defineConfig, devices } from '@playwright/test'

const PORT = 4183
export default defineConfig({
  testDir: './e2e',
  timeout: 180_000,
  fullyParallel: true,
  workers: 4,
  reporter: [['list']],
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{ext}',
  expect: {
    // visual regression: small tolerance for anti-aliasing; animations are disabled per shot
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, threshold: 0.2, animations: 'disabled', caret: 'hide', scale: 'css' },
  },
  use: { baseURL: `http://localhost:${PORT}/dcf-valuation-model/`, ...devices['Desktop Chrome'], reducedMotion: 'reduce' },
  webServer: { command: `npx vite preview --port ${PORT} --strictPort`, url: `http://localhost:${PORT}/dcf-valuation-model/`, reuseExistingServer: true },
})
