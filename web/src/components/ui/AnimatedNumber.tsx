import { animate, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

/** Number that ticks from its previous value to the new one (instant under reduced motion). */
export function AnimatedNumber({ value, format, duration = 0.45 }: { value: number; format: (v: number) => string; duration?: number }) {
  const reduce = useReducedMotion()
  const [shown, setShown] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    if (reduce || !Number.isFinite(prev.current)) { setShown(value); prev.current = value; return }
    const c = animate(prev.current, value, { duration, ease: [0.2, 0.8, 0.2, 1], onUpdate: setShown })
    prev.current = value
    return () => c.stop()
  }, [value, reduce, duration])
  return <span className="num">{format(shown)}</span>
}
