import type { Classification } from '@/lib/analysis/types'

const STYLES: Record<Exclude<Classification, 'fine'>, string> = {
  blunder: 'text-blunder-text border-blunder/40',
  mistake: 'text-mistake border-mistake/40',
  inaccuracy: 'text-inaccuracy border-inaccuracy/40',
}

export function ClassificationBadge({
  value,
}: {
  value: Exclude<Classification, 'fine'>
}) {
  return (
    <span className={`border px-1.5 py-0.5 font-mono text-[11px] uppercase ${STYLES[value]}`}>
      {value}
    </span>
  )
}
