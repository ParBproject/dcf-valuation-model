export const usd = (x: number) =>
  x.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2, minimumFractionDigits: 2 })
export const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)}%`
export const signedPct = (x: number, d = 0) => `${x >= 0 ? '+' : '−'}${Math.abs(x * 100).toFixed(d)}%`
export const bn = (x: number) => `$${(x / 1e9).toLocaleString('en-US', { maximumFractionDigits: 1 })}B`
