import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULTS, useDcfStore } from './useDcfStore'

beforeEach(() => useDcfStore.setState({ ...DEFAULTS }))

describe('store', () => {
  it('has the documented defaults', () => {
    const s = useDcfStore.getState()
    expect(s.ticker).toBe('AAPL')
    expect(s.scenario).toBe('base')
    expect(s.assumptions).toEqual({})
  })
  it('sets scenario and assumptions', () => {
    const s = useDcfStore.getState()
    s.setScenario('bull')
    s.setAssumption('wacc', 0.09)
    s.setAssumption('terminal_growth', 0.02)
    expect(useDcfStore.getState().scenario).toBe('bull')
    expect(useDcfStore.getState().assumptions).toEqual({ wacc: 0.09, terminal_growth: 0.02 })
  })
  it('clears overrides when the ticker changes', () => {
    useDcfStore.getState().setAssumption('wacc', 0.09)
    useDcfStore.getState().setTicker('KO')
    expect(useDcfStore.getState().ticker).toBe('KO')
    expect(useDcfStore.getState().assumptions).toEqual({})
  })
  it('resets assumptions', () => {
    useDcfStore.getState().setAssumption('capex_to_rev', 0.1)
    useDcfStore.getState().resetAssumptions()
    expect(useDcfStore.getState().assumptions).toEqual({})
  })
  it('hydrates partially', () => {
    useDcfStore.getState().hydrate({ ticker: 'XOM' })
    expect(useDcfStore.getState().ticker).toBe('XOM')
    expect(useDcfStore.getState().scenario).toBe('base')
  })
})
