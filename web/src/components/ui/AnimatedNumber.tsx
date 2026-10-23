import { useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const easeOut = (t: number) => 1 - Math.pow(1 - t, 3)

/** Number that ticks from its previous value to the new one (instant under reduced motion). */
export function AnimatedNumber({ value, format, duration = 0.45 }: { value: number; format: (v: number) => string; duration?: number }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    const from = prev.current
    prev.current = value
    if (reduce || !Number.isFinite(from) || from === value) { setShown(value); return }
    let raf = 0
    const t0 = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - t0) / (duration * 1000))
      setShown(from + (value - from) * easeOut(t))
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [value, reduce, duration])
  return <span className="num">{format(shown)}</span>
}
