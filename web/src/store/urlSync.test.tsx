import { describe, expect, it, beforeEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { parse, serialize, useUrlSync } from './urlSync'
import { DEFAULTS, useDcfStore } from './useDcfStore'

// React 18 act() environment flag for non-RTL tests
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('serialize / parse', () => {
  it('omits defaults', () => {
    expect(serialize(DEFAULTS)).toBe('')
  })
  it('round-trips', () => {
    const s = { ticker: 'MSFT' as const, scenario: 'bear' as const, pairing: 'damodaran' as const, assumptions: { beta: 0.875, terminal_growth: 0.02, forecast_years: 7 } }
    expect(parse(serialize(s))).toEqual(s)
  })
  it('rounds floats to 6 dp', () => {
    expect(serialize({ ...DEFAULTS, assumptions: { capex_to_rev: 0.1 + 0.2 } })).toBe('capex_to_rev=0.3')
  })
  it('drops invalid values', () => {
    expect(parse('t=TSLA&s=meh&p=x&beta=abc&terminal_growth=0.09&growth_start=0.05')).toEqual({
      assumptions: { growth_start: 0.05 },
    })
  })
  it('rounds horizon to whole years and reads pairing', () => {
    expect(parse('forecast_years=7.6&p=damodaran')).toEqual({ pairing: 'damodaran', assumptions: { forecast_years: 8 } })
  })
  it('accepts lower-case tickers', () => {
    expect(parse('t=ko')).toEqual({ ticker: 'KO' })
  })
})

function Probe() {
  useUrlSync()
  return null
}

describe('useUrlSync', () => {
  beforeEach(() => useDcfStore.setState({ ...DEFAULTS }))

  it('hydrates from the URL and writes changes back', async () => {
    window.location.hash = '#/overview?t=JNJ&s=bull&rf=0.04'
    const el = document.createElement('div')
    const root = createRoot(el)
    await act(async () => root.render(createElement(HashRouter, null, createElement(Probe))))
    expect(useDcfStore.getState()).toMatchObject({ ticker: 'JNJ', scenario: 'bull', assumptions: { rf: 0.04 } })

    await act(async () => useDcfStore.getState().setTicker('CAT'))
    expect(window.location.hash).toBe('#/overview?t=CAT&s=bull')

    await act(async () => useDcfStore.getState().setScenario('base'))
    expect(window.location.hash).toBe('#/overview?t=CAT')
    act(() => root.unmount())
  })
})
