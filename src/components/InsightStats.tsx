import type { ReactNode } from 'react'
import { SegmentedControl } from '@/components/ui'
import { formatPct } from '@/lib/grades'
import type { TimeClassFilter } from '@/lib/strategyStats'

export function InsightCount({
  label,
  value,
}: {
  label: string
  value: number
}) {
  return (
    <div className="border border-line bg-surface px-4 py-4">
      <p className="font-mono text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-mono text-2xl tabular">{value}</p>
    </div>
  )
}

export function InsightTable({
  heading,
  headingId,
  children,
}: {
  heading: string
  headingId: string
  children: ReactNode
}) {
  return (
    <section aria-labelledby={headingId}>
      <div className="border-b border-line pb-3">
        <h2 id={headingId} className="font-mono text-sm uppercase tracking-wider">
          {heading}
        </h2>
      </div>
      <div className="hidden grid-cols-[minmax(0,1fr)_5rem_6rem_6rem] border-x border-b border-line bg-surface-2 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted sm:grid">
        <span>Stat</span>
        <span>Grade</span>
        <span>You</span>
        <span title="Accuracy of other analyzed players within 100 rating points, same time control">
          Similar rating
        </span>
      </div>
      <dl className="divide-y divide-line border-x border-b border-line">{children}</dl>
    </section>
  )
}

export function StatRow({
  label,
  grade,
  value,
  peers,
}: {
  label: string
  grade: string
  value: string
  peers?: string | null
}) {
  const showPeers = peers !== undefined
  return (
    <div
      className={`grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-2 bg-surface px-4 py-4 sm:items-center ${
        showPeers
          ? 'sm:grid-cols-[minmax(0,1fr)_5rem_6rem_6rem]'
          : 'sm:grid-cols-[minmax(0,1fr)_5rem_6rem]'
      }`}
    >
      <dt className="text-sm">{label}</dt>
      <dd className="font-mono text-sm tabular">
        <span className="mr-2 text-[10px] uppercase text-muted sm:hidden">Grade</span>
        {grade}
      </dd>
      <dd className="font-mono text-sm tabular">
        <span className="mr-2 text-[10px] uppercase text-muted sm:hidden">You</span>
        {value}
      </dd>
      {showPeers ? (
        <dd className="font-mono text-sm text-muted">
          <span className="mr-2 text-[10px] uppercase sm:hidden">Similar rating</span>
          {peers || '—'}
        </dd>
      ) : null}
    </div>
  )
}

export function GameTypeControl({
  value,
  options,
  onChange,
}: {
  value: TimeClassFilter
  options: Array<{ value: TimeClassFilter; label: string }>
  onChange: (value: TimeClassFilter) => void
}) {
  if (options.length <= 1) return null
  return (
    <SegmentedControl
      label="Game type"
      value={value}
      onChange={onChange}
      options={options}
    />
  )
}

export function peerLabel(value: number | null | undefined) {
  return formatPct(value ?? null)
}
