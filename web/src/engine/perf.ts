/** Rolling recompute timings (ms) for the live engine, shown in the assumptions panel. */
const samples: number[] = []
export function recordRecompute(ms: number) {
  samples.push(ms)
  if (samples.length > 50) samples.shift()
}
export function recomputeStats() {
  if (!samples.length) return { n: 0, avg: 0, max: 0 }
  return { n: samples.length, avg: samples.reduce((a, b) => a + b, 0) / samples.length, max: Math.max(...samples) }
}
declare global { interface Window { __dcfPerf?: () => ReturnType<typeof recomputeStats> } }
if (typeof window !== 'undefined') window.__dcfPerf = recomputeStats
