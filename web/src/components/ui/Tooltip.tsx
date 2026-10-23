import * as T from '@radix-ui/react-tooltip'
import type { ReactNode } from 'react'

export function Tooltip({ content, children }: { content: ReactNode; children: ReactNode }) {
  return (
    <T.Root delayDuration={150}>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content sideOffset={6} className="z-50 max-w-[280px] rounded-control border border-line bg-[#0F1620] px-1.5 py-1 text-xs text-fg shadow-lg">
          {content}
          <T.Arrow className="fill-line" />
        </T.Content>
      </T.Portal>
    </T.Root>
  )
}

export function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip content={text}>
      <button type="button" aria-label={text} className="inline-flex h-2 w-2 items-center justify-center rounded-pill border border-muted/60 text-[9px] leading-none text-muted hover:border-accent hover:text-accent">
        i
      </button>
    </Tooltip>
  )
}

export const TooltipProvider = T.Provider
