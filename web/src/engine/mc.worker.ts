/// <reference lib="webworker" />
import { runMc } from './mc'
import type { EngineParams, Overrides } from './types'

export interface McRequest { id: number; params: EngineParams; overrides: Overrides; n: number; seed: number }

self.onmessage = (e: MessageEvent<McRequest>) => {
  const { id, params, overrides, n, seed } = e.data
  self.postMessage({ id, summary: runMc(params, overrides, n, seed) })
}
