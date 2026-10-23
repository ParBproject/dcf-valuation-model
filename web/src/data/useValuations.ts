import { useEffect, useState } from 'react'
import type { Valuations } from './types'

let cache: Promise<Valuations> | null = null
let resolved: Valuations | null = null

export function loadValuations(): Promise<Valuations> {
  cache ??= fetch(`${import.meta.env.BASE_URL}data/valuations.json`).then((r) => {
    if (!r.ok) throw new Error(`valuations.json: HTTP ${r.status}`)
    return r.json() as Promise<Valuations>
  }).then((v) => (resolved = v))
  return cache
}

export function useValuations(): { data: Valuations | null; error: string | null } {
  // once loaded, render synchronously with data (no skeleton flash, no layout shift)
  const [data, setData] = useState<Valuations | null>(resolved)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (resolved) return
    loadValuations().then(setData, (e: unknown) => setError(String(e)))
  }, [])
  return { data, error }
}
