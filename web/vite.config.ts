/// <reference types="vitest" />
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

/** Preload the two above-the-fold font files (Inter 400/600, latin subset) so text doesn't reflow late. */
function preloadFonts(): Plugin {
  return {
    name: 'preload-fonts',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const files = Object.keys(ctx.bundle ?? {}).filter((f) => /inter-latin-(400|600)-normal-.*\.woff2$/.test(f))
        return {
          html,
          tags: files.map((f) => ({ tag: 'link', injectTo: 'head' as const,
            attrs: { rel: 'preload', as: 'font', type: 'font/woff2', crossorigin: '', href: `/dcf-valuation-model/${f}` } })),
        }
      },
    },
  }
}

/**
 * Pages are lazy chunks, so a cold load of e.g. #/forecast would fetch index.js, run it, and only
 * then discover Forecast.js. This inlines a tiny route→chunk map and modulepreloads the current
 * route's chunk (and its static imports) in parallel with the entry.
 */
function preloadRouteChunk(): Plugin {
  const route = (name: string) => name.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase()
  return {
    name: 'preload-route-chunk',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const map: Record<string, string[]> = {}
        const entry = Object.values(ctx.bundle ?? {}).find((c) => c.type === 'chunk' && c.isEntry)?.fileName
        for (const c of Object.values(ctx.bundle ?? {})) {
          if (c.type !== 'chunk' || !c.facadeModuleId) continue
          const m = c.facadeModuleId.match(/src\/pages\/(\w+)\.tsx$/)
          if (!m || c.isEntry) continue
          map[route(m[1]!)] = [c.fileName, ...c.imports].filter((f) => f !== entry).map((f) => `/dcf-valuation-model/${f}`)
        }
        const code = `(function(){var m=${JSON.stringify(map)};var r=(location.hash.match(/^#\\/([\\w-]+)/)||[])[1];(m[r]||[]).forEach(function(h){var l=document.createElement('link');l.rel='modulepreload';l.href=h;document.head.appendChild(l)})})()`
        return { html, tags: [{ tag: 'script', injectTo: 'head' as const, children: code }] }
      },
    },
  }
}

export default defineConfig({
  base: '/dcf-valuation-model/',
  plugins: [react(), preloadFonts(), preloadRouteChunk()],
  test: { environment: 'jsdom', include: ['src/**/*.test.ts', 'src/**/*.test.tsx'] },
})
