import { Link } from '@tanstack/react-router'
import { ClassificationBadge } from '@/components/ClassificationBadge'
import type { Classification, Motif, Phase, Side } from '@/lib/analysis/types'
import { MOTIF_LABEL, PHASE_LABEL } from '@/lib/stats'
import type { Tables } from '@/lib/supabase/database.types'

export type PositionFilters = {
  phase: Phase | ''
  motif: Motif | ''
  color: Side | ''
  classification: Exclude<Classification, 'fine'> | ''
  sort: 'worst' | 'chrono'
}

export const EMPTY_FILTERS: PositionFilters = {
  phase: '',
  motif: '',
  color: '',
  classification: '',
  sort: 'worst',
}

export function filterPositions(
  rows: Tables<'flagged_positions'>[],
  filters: PositionFilters,
) {
  const filtered = rows.filter((row) => {
    if (filters.phase && row.phase !== filters.phase) return false
    if (filters.motif && row.motif !== filters.motif) return false
    if (filters.color && row.color !== filters.color) return false
    if (filters.classification && row.classification !== filters.classification) return false
    return true
  })
  return filtered.sort((a, b) => {
    if (filters.sort === 'chrono') return a.played_on.localeCompare(b.played_on) || a.move_number - b.move_number
    return b.loss - a.loss
  })
}

export function PositionsTable({
  username,
  rows,
  filters,
  onChange,
}: {
  username: string
  rows: Tables<'flagged_positions'>[]
  filters: PositionFilters
  onChange: (next: PositionFilters) => void
}) {
  const ids = rows.map((r) => r.id).join(',')
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <Select
          label="Phase"
          value={filters.phase}
          onChange={(phase) => onChange({ ...filters, phase: phase as PositionFilters['phase'] })}
          options={['', 'opening', 'middlegame', 'endgame']}
        />
        <Select
          label="Motif"
          value={filters.motif}
          onChange={(motif) => onChange({ ...filters, motif: motif as PositionFilters['motif'] })}
          options={['', 'hanging_piece', 'fork', 'pin', 'skewer', 'discovered_attack', 'back_rank', 'missed_mate']}
        />
        <Select
          label="Color"
          value={filters.color}
          onChange={(color) => onChange({ ...filters, color: color as PositionFilters['color'] })}
          options={['', 'white', 'black']}
        />
        <Select
          label="Severity"
          value={filters.classification}
          onChange={(classification) =>
            onChange({ ...filters, classification: classification as PositionFilters['classification'] })
          }
          options={['', 'blunder', 'mistake', 'inaccuracy']}
        />
        <Select
          label="Sort"
          value={filters.sort}
          onChange={(sort) => onChange({ ...filters, sort: sort as PositionFilters['sort'] })}
          options={['worst', 'chrono']}
        />
        <Link
          to="/drill/$username"
          params={{ username }}
          search={{ ids, order: filters.sort }}
          className="ml-auto border border-ink px-3 py-2 text-sm hover:bg-ink hover:text-canvas"
        >
          Drill these ({rows.length})
        </Link>
      </div>
      <div className="overflow-x-auto border border-line">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-surface-2 font-mono text-[11px] uppercase tracking-wider text-muted">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Opp</th>
              <th className="px-3 py-2">Clr</th>
              <th className="px-3 py-2">Mv</th>
              <th className="px-3 py-2">Phase</th>
              <th className="px-3 py-2">Motif</th>
              <th className="px-3 py-2">Loss</th>
              <th className="px-3 py-2">Played</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-line">
                <td className="px-3 py-2 font-mono text-xs">{row.played_on}</td>
                <td className="px-3 py-2">{row.opponent}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.color[0]}</td>
                <td className="px-3 py-2 font-mono text-xs">{row.move_number}</td>
                <td className="px-3 py-2">{PHASE_LABEL[row.phase as Phase]}</td>
                <td className="px-3 py-2">
                  {row.motif ? MOTIF_LABEL[row.motif as Motif] : '—'}
                </td>
                <td className="px-3 py-2">
                  <span className="mr-2 font-mono text-xs tabular">{row.loss}</span>
                  <ClassificationBadge value={row.classification as Exclude<Classification, 'fine'>} />
                </td>
                <td className="px-3 py-2 font-mono text-xs">{row.san}</td>
                <td className="px-3 py-2 text-right">
                  <a
                    href={row.game_link}
                    target="_blank"
                    rel="noreferrer"
                    className="mr-3 text-xs text-muted hover:text-ink"
                  >
                    Game
                  </a>
                  <Link
                    to="/drill/$username"
                    params={{ username }}
                    search={{ position: row.id }}
                    className="text-xs hover:text-ink"
                  >
                    Drill this
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  options: string[]
}) {
  return (
    <label className="flex flex-col gap-1 text-[11px] uppercase tracking-wider text-muted">
      {label}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="border border-line bg-canvas px-2 py-1.5 font-mono text-xs text-ink outline-none"
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt === '' ? 'all' : opt.replace('_', ' ')}
          </option>
        ))}
      </select>
    </label>
  )
}
