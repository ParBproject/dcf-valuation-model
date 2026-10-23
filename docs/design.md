# Design system

All tokens live in [`web/src/design/tokens.ts`](../web/src/design/tokens.ts). The Tailwind theme is generated from that file, so there are no hard-coded colours elsewhere. A live reference of every component in every state is at `#/gallery`.

## Colour
| Token | Hex | Use |
|---|---|---|
| bg | `#0B0F14` | page background |
| card | `#111827` | card / control surfaces |
| border (`line`) | `#1F2937` | borders, dividers, skeletons |
| text (`fg`) | `#E5E7EB` | primary text |
| muted | `#9CA3AF` | labels, secondary text |
| accent | `#10B981` | primary actions, positive values, active nav |
| accentHover | `#34D399` | hover on accent |
| negative | `#F87171` | values below market, errors |
| warning | `#FBBF24` | caveats, TV share > 80% |

## Type
- **Inter** (400/500/600/700) for UI text, self-hosted via `@fontsource/inter`.
- **JetBrains Mono** (400/600) for all numbers via the `.num` utility, with `font-variant-numeric: tabular-nums` so digits align in tables and animated values don't jitter.
- Scale: 28/24 headings, 16 body, 14 labels, 12 captions.

## Space, shape, depth
- **8px grid:** Tailwind spacing is replaced by multiples of 8 (`p-1` = 8px, `p-2` = 16px, … plus 4px half-steps).
- **Radius:** cards 12px, controls 8px, pills fully rounded.
- **Focus:** a subtle emerald glow (`shadow-focus`: 2px ring at 55% plus a 16px halo at 25%) on every focusable element via `:focus-visible`.

## Motion
Framer Motion. Route changes fade and slide 8px in 180ms, the active tab indicator springs (`layoutId`), and the price chip cross-fades between values. Durations stay ≤ 250ms.

## Layout
- **Desktop (≥1024px):** sticky top bar, 208px left nav, content up to 1440px.
- **Mobile:** the top bar collapses its title to "DCF", and a fixed bottom tab bar (5 primary routes, safe-area aware) replaces the side nav. Compare and Methodology are reachable from the desktop nav and from in-page links (M7).
- **No horizontal scrolling at 390px**, enforced by `npm run shots`, which fails if any element extends past the viewport.

## State
Zustand store `{ ticker, scenario, assumptions }`, synced two-way with the URL query (e.g. `#/overview?t=KO&s=bull&wacc=0.08`). Values are validated and bounded when parsed, defaults are omitted, and updates use `replace` so they don't fill the browser history.
