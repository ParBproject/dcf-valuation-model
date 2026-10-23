import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { PageHeader } from './PageHeader'

export function Placeholder({ title, milestone, what }: { title: string; milestone: string; what: string }) {
  return (
    <>
      <PageHeader title={title} right={<Badge tone="warning">Coming in {milestone}</Badge>} />
      <Card><p className="text-sm text-muted">{what}</p></Card>
    </>
  )
}
