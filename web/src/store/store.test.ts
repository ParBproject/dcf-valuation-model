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
    s.setAssumption('beta', 0.9)
    s.setAssumption('terminal_growth', 0.02)
    expect(useDcfStore.getState().scenario).toBe('bull')
    expect(useDcfStore.getState().assumptions).toEqual({ beta: 0.9, terminal_growth: 0.02 })
  })
  it('clears overrides when the ticker changes', () => {
    useDcfStore.getState().setAssumption('rf', 0.04)
    useDcfStore.getState().setTicker('KO')
    expect(useDcfStore.getState().ticker).toBe('KO')
    expect(useDcfStore.getState().assumptions).toEqual({})
  })
  it('pairing toggle drops manual rf/ERP but keeps others', () => {
    const s = useDcfStore.getState()
    s.setAssumption('rf', 0.03); s.setAssumption('erp', 0.05); s.setAssumption('beta', 1.1)
    s.setPairing('damodaran')
    expect(useDcfStore.getState().pairing).toBe('damodaran')
    expect(useDcfStore.getState().assumptions).toEqual({ beta: 1.1 })
  })
  it('clears one assumption', () => {
    useDcfStore.getState().setAssumption('beta', 1.1)
    useDcfStore.getState().setAssumption('rf', 0.03)
    useDcfStore.getState().clearAssumption('beta')
    expect(useDcfStore.getState().assumptions).toEqual({ rf: 0.03 })
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
