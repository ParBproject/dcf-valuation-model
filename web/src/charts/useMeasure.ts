import { useLayoutEffect, useRef, useState } from 'react'

/**
 * Width of a container. Measured synchronously before first paint (so charts never paint at
 * width 0 and then pop in, which would be a layout shift), then kept current via ResizeObserver.
 */
export function useMeasure<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null)
  const [w, setW] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    setW(Math.floor(el.getBoundingClientRect().width))
    const ro = new ResizeObserver(([e]) => setW(Math.floor(e!.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, w]
}
