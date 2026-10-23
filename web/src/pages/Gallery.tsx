import { useState, type ReactNode } from 'react'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { StatTile } from '../components/ui/StatTile'
import { Slider } from '../components/ui/Slider'
import { Tabs } from '../components/ui/Tabs'
import { Tooltip, InfoTip } from '../components/ui/Tooltip'
import { Badge } from '../components/ui/Badge'
import { colors } from '../design/tokens'
import { PageHeader } from './PageHeader'

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-t border-line py-2 first:border-t-0 sm:flex-row sm:items-center">
      <div className="w-[160px] shrink-0 text-xs uppercase tracking-wide text-muted">{label}</div>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">{children}</div>
    </div>
  )
}

export function Gallery() {
  const [v, setV] = useState(0.085)
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('b')
  const fmt = (x: number) => `${(x * 100).toFixed(2)}%`
  return (
    <>
      <PageHeader title="Design gallery" sub="Every component in every state. Tokens live in src/design/tokens.ts." />
      <div className="grid gap-2">
        <Card title="Colour tokens">
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5 lg:grid-cols-9">
            {Object.entries(colors).map(([k, c]) => (
              <div key={k} className="min-w-0">
                <div className="h-6 rounded-control border border-line" style={{ background: c }} />
                <div className="mt-0.5 truncate text-xs">{k}</div>
                <div className="num text-xs text-muted">{c}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card title="Type">
          <div className="space-y-1">
            <div className="text-[28px] font-semibold tracking-tight">Inter 28 / semibold: headings</div>
            <div className="text-base">Inter 16 / regular: body text for explanations.</div>
            <div className="text-sm text-muted">Inter 14 / muted: secondary text and labels.</div>
            <div className="num text-2xl">JetBrains Mono tabular $1,234.56 · 9.54%</div>
            <div className="num text-sm text-muted">111.11<br />999.99 (digits align)</div>
          </div>
        </Card>
        <Card title="Buttons">
          <Row label="Primary"><Button>Default</Button><Button className="bg-accent-hover">Hover</Button><Button className="shadow-focus">Focus</Button><Button disabled>Disabled</Button><Button size="sm">Small</Button></Row>
          <Row label="Secondary"><Button variant="secondary">Default</Button><Button variant="secondary" className="border-accent/60 text-accent-hover">Hover</Button><Button variant="secondary" className="shadow-focus">Focus</Button><Button variant="secondary" disabled>Disabled</Button></Row>
          <Row label="Ghost"><Button variant="ghost">Default</Button><Button variant="ghost" className="bg-white/5 text-fg">Hover</Button><Button variant="ghost" className="shadow-focus">Focus</Button><Button variant="ghost" disabled>Disabled</Button></Row>
        </Card>
        <Card title="Badges (illustrative)">
          <Row label="Tones"><Badge>Neutral</Badge><Badge tone="positive">+36% upside</Badge><Badge tone="negative">−66% gap</Badge><Badge tone="warning">TV 81% of EV</Badge></Row>
        </Card>
        <Card title="Stat tiles (illustrative values, not model output)">
          <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-5">
            <StatTile label="Neutral" value="$348.22" sub="Mkt cap $5,081B" hint="Tooltip on a stat" />
            <StatTile label="Positive" value="$242.42" sub="+36% vs market" tone="positive" />
            <StatTile label="Negative" value="$116.81" sub="−66% vs market" tone="negative" />
            <StatTile label="Warning" value="81%" sub="TV share of EV" tone="warning" />
            <StatTile label="Loading" value="" loading />
          </div>
        </Card>
        <Card title="Sliders">
          <div className="grid gap-3 sm:grid-cols-2">
            <Slider label="WACC (interactive)" value={v} min={0.05} max={0.14} step={0.0025} onChange={setV} format={fmt} />
            <Slider label="Disabled" value={0.025} min={0.01} max={0.04} step={0.0025} onChange={() => {}} format={fmt} disabled />
          </div>
        </Card>
        <Card title="Tabs">
          <Row label="Interactive"><Tabs label="demo" value={tab} onChange={setTab} items={[{ value: 'a', label: 'Bear' }, { value: 'b', label: 'Base' }, { value: 'c', label: 'Bull' }]} /></Row>
          <Row label="With disabled"><Tabs label="demo2" value="x" onChange={() => {}} items={[{ value: 'x', label: 'Active' }, { value: 'y', label: 'Disabled', disabled: true }]} /></Row>
        </Card>
        <Card title="Tooltips">
          <Row label="Trigger"><Tooltip content="Formula: EBIT × (1 − t) + D&A − capex − ΔNWC"><Button variant="secondary">Hover or focus me</Button></Tooltip><span className="flex items-center gap-1 text-sm text-muted">Info tip <InfoTip text="Small inline explainer" /></span></Row>
        </Card>
        <Card title="Cards">
          <div className="grid gap-1.5 sm:grid-cols-2">
            <Card title="Card with title" action={<Badge tone="positive">action</Badge>}><p className="text-sm text-muted">12px radius, #111827 surface, #1F2937 border.</p></Card>
            <Card><p className="text-sm text-muted">Card without a header.</p></Card>
          </div>
        </Card>
      </div>
    </>
  )
}
