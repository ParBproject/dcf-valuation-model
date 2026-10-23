import { describe, expect, it } from 'vitest'
import results from '../../../results/valuations.json'
import { grid, tornado } from './sensitivity'
import type { EngineParams } from './types'

type T = { engine: EngineParams; sensitivity: { price: (number | null)[][] }; tornado: { driver: string; price_low_input: number | null; price_high_input: number | null }[] }
const tickers = (results as unknown as { tickers: Record<string, T> }).tickers
const close = (a: number, b: number) => Math.abs(a - b) <= 1e-4 * Math.abs(b)

describe('sensitivity parity with Python results', () => {
  for (const [t, r] of Object.entries(tickers)) {
    it(`${t} WACC × g grid`, () => {
      const g = grid(r.engine, {})
      r.sensitivity.price.forEach((row, i) => row.forEach((py, j) => {
        const ts = g.price[i]![j]!
        if (py === null) expect(ts).toBeNull()
        else expect(close(ts!, py), `${i},${j}`).toBe(true)
      }))
    })
    it(`${t} tornado`, () => {
      const tor = tornado(r.engine, {})
      for (const py of r.tornado) {
        const row = tor.rows.find((x) => x.driver === py.driver)!
        if (py.price_low_input !== null) expect(close(row.low!, py.price_low_input)).toBe(true)
        if (py.price_high_input !== null) expect(close(row.high!, py.price_high_input)).toBe(true)
      }
    })
  }
})
