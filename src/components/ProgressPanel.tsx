import { Panel } from '@/components/ui'

export function ProgressPanel({
  title,
  detail,
  done,
  total,
}: {
  title: string
  detail?: string
  done: number
  total: number
}) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0

  return (
    <Panel>
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="text-sm text-ink">{title}</h2>
        <span className="font-mono text-sm tabular text-muted">
          {done}/{total || '—'}
        </span>
      </div>
      <div className="mt-3 h-1.5 w-full bg-surface-2">
        <div className="h-full bg-ink transition-[width] duration-300" style={{ width: `${pct}%` }} />
      </div>
      {detail ? <p className="mt-3 font-mono text-xs text-muted text-pretty">{detail}</p> : null}
    </Panel>
  )
}
