import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { ClassificationBadge } from '@/components/ClassificationBadge'
import { Button, ButtonLink, FilterBar, SelectField } from '@/components/ui'
import type {
  Classification,
  EndgameType,
  Motif,
  MotifKind,
  Phase,
  Side,
} from '@/lib/analysis/types'
import { ALL_MOTIFS, ENDGAME_LABEL, MOTIF_LABEL, PHASE_LABEL } from '@/lib/stats'
import type { Tables } from '@/lib/supabase/database.types'

export type PositionFilters = {
  phase: Phase | ''
  motif: Motif | ''
  motifKind: MotifKind | ''
  endgameType: EndgameType | ''
  color: Side | ''
  /** Severity: classic CPL buckets, plus Missed mate as a quick motif filter. */
  classification: Exclude<Classification, 'fine'> | 'missed_mate' | ''
  timeClass: string
  sort: 'worst' | 'newest' | 'oldest'
}

export const EMPTY_FILTERS: PositionFilters = {
  phase: '',
  motif: '',
  motifKind: '',
  endgameType: '',
  color: '',
  classification: '',
  timeClass: '',
  sort: 'newest',
}

const PAGE_SIZE = 25

const SORT_OPTIONS: Array<{ value: PositionFilters['sort']; label: string }> = [
  { value: 'newest', label: 'newest first' },
  { value: 'oldest', label: 'oldest first' },
  { value: 'worst', label: 'worst first' },
]

export function filterPositions(
  rows: Tables<'flagged_positions'>[],
  filters: PositionFilters,
) {
  const filtered = rows.filter((row) => {
    if (filters.phase && row.phase !== filters.phase) return false
    if (filters.motif && row.motif !== filters.motif) return false
    if (filters.motifKind && row.motif_kind !== filters.motifKind) return false
    if (filters.endgameType && row.endgame_type !== filters.endgameType) return false
    if (filters.color && row.color !== filters.color) return false
    if (filters.classification === 'missed_mate') {
      if (row.motif !== 'missed_mate') return false
    } else if (filters.classification && row.classification !== filters.classification) {
      return false
    }
    if (filters.timeClass && (row.time_class || '') !== filters.timeClass) return false
    return true
  })
  return filtered.sort((a, b) => {
    if (filters.sort === 'newest') {
      return b.played_on.localeCompare(a.played_on) || b.move_number - a.move_number
    }
    if (filters.sort === 'oldest') {
      return a.played_on.localeCompare(b.played_on) || a.move_number - b.move_number
    }
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
  const [page, setPage] = useState(1)
  const [pageInput, setPageInput] = useState('1')
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const start = (currentPage - 1) * PAGE_SIZE
  const pageRows = rows.slice(start, start + PAGE_SIZE)
  const rangeStart = rows.length === 0 ? 0 : start + 1
  const rangeEnd = Math.min(start + PAGE_SIZE, rows.length)

  useEffect(() => {
    setPageInput(String(currentPage))
  }, [currentPage])

  function updateFilters(next: PositionFilters) {
    setPage(1)
    onChange(next)
  }

  function goToPage(raw: string) {
    const parsed = Number.parseInt(raw, 10)
    if (!Number.isFinite(parsed)) {
      setPageInput(String(currentPage))
      return
    }
    const next = Math.min(pageCount, Math.max(1, parsed))
    setPage(next)
    setPageInput(String(next))
  }

  const drillOrder = filters.sort === 'worst' ? 'worst' : filters.sort === 'oldest' ? 'oldest' : 'newest'

  return (
    <div className="flex flex-col gap-5">
      <FilterBar
        footer={
          <>
            <SelectField
              label="Endgame"
              value={filters.endgameType}
              onChange={(endgameType) =>
                updateFilters({
                  ...filters,
                  endgameType: endgameType as PositionFilters['endgameType'],
                })
              }
              options={['', 'pawn', 'minor', 'rook', 'queen', 'mixed']}
              labels={{ '': 'all', ...ENDGAME_LABEL }}
            />
            <SelectField
              label="Color"
              value={filters.color}
              onChange={(color) =>
                updateFilters({ ...filters, color: color as PositionFilters['color'] })
              }
              options={['', 'white', 'black']}
            />
            <SelectField
              label="Time"
              value={filters.timeClass}
              onChange={(timeClass) => updateFilters({ ...filters, timeClass })}
              options={['', 'bullet', 'blitz', 'rapid', 'daily']}
            />
          </>
        }
      >
        <SelectField
          label="Phase"
          value={filters.phase}
          onChange={(phase) =>
            updateFilters({ ...filters, phase: phase as PositionFilters['phase'] })
          }
          options={['', 'opening', 'middlegame', 'endgame']}
          labels={{ '': 'all', ...PHASE_LABEL }}
        />
        <SelectField
          label="Motif"
          value={filters.motif}
          onChange={(motif) =>
            updateFilters({ ...filters, motif: motif as PositionFilters['motif'] })
          }
          options={['', ...ALL_MOTIFS]}
          labels={{ '': 'all', ...MOTIF_LABEL }}
          className="min-w-0 sm:min-w-44"
          size="md"
        />
        <SelectField
          label="Kind"
          value={filters.motifKind}
          onChange={(motifKind) =>
            updateFilters({ ...filters, motifKind: motifKind as PositionFilters['motifKind'] })
          }
          options={['', 'omission', 'commission']}
          labels={{ '': 'all', omission: 'missed wins', commission: 'got hit' }}
        />
        <SelectField
          label="Severity"
          value={filters.classification}
          onChange={(classification) =>
            updateFilters({
              ...filters,
              classification: classification as PositionFilters['classification'],
              // Severity "Missed mate" is the motif shortcut — clear a conflicting Motif pick.
              motif:
                classification === 'missed_mate'
                  ? ''
                  : filters.motif === 'missed_mate'
                    ? ''
                    : filters.motif,
            })
          }
          options={['', 'blunder', 'mistake', 'inaccuracy', 'missed_mate']}
          labels={{
            '': 'all',
            blunder: 'blunder',
            mistake: 'mistake',
            inaccuracy: 'inaccuracy',
            missed_mate: 'Missed mate',
          }}
          className="min-w-0 sm:min-w-36"
          size="md"
        />
        <SelectField
          label="Sort"
          value={filters.sort}
          onChange={(sort) =>
            updateFilters({ ...filters, sort: sort as PositionFilters['sort'] })
          }
          options={SORT_OPTIONS.map((opt) => opt.value)}
          labels={Object.fromEntries(SORT_OPTIONS.map((opt) => [opt.value, opt.label]))}
          className="min-w-0 sm:min-w-36"
          size="md"
        />
        <ButtonLink
          to="/drill/$username"
          params={{ username }}
          search={{
            phase: filters.phase || undefined,
            motif:
              filters.classification === 'missed_mate'
                ? 'missed_mate'
                : filters.motif || undefined,
            motifKind: filters.motifKind || undefined,
            endgameType: filters.endgameType || undefined,
            color: filters.color || undefined,
            classification:
              filters.classification && filters.classification !== 'missed_mate'
                ? filters.classification
                : undefined,
            timeClass: filters.timeClass || undefined,
            order: drillOrder,
          }}
          className="col-span-2 w-full sm:ml-auto sm:w-auto"
        >
          Drill these ({rows.length})
        </ButtonLink>
      </FilterBar>
      <div className="flex flex-wrap items-center justify-between gap-3 font-mono text-xs text-muted">
        <span>
          Showing {rangeStart}–{rangeEnd} of {rows.length}
        </span>
        <nav aria-label="Positions pagination" className="flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            onClick={() => setPage(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            Previous
          </Button>
          <span className="min-w-20 text-center">
            Page {currentPage} of {pageCount}
          </span>
          <Button
            variant="ghost"
            onClick={() => setPage(Math.min(pageCount, currentPage + 1))}
            disabled={currentPage === pageCount}
          >
            Next
          </Button>
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              goToPage(pageInput)
            }}
          >
            <label className="flex items-center gap-2">
              <span>Go to</span>
              <input
                type="number"
                min={1}
                max={pageCount}
                inputMode="numeric"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                onBlur={() => goToPage(pageInput)}
                className="min-h-11 w-16 border border-line bg-canvas px-2 text-ink outline-none"
                aria-label="Go to page"
              />
            </label>
            <Button variant="ghost" type="submit">
              Go
            </Button>
          </form>
        </nav>
      </div>
      <ul className="divide-y divide-line border border-line sm:hidden">
        {pageRows.length === 0 ? (
          <li className="bg-surface px-3 py-8 text-sm text-muted">No positions match these filters.</li>
        ) : null}
        {pageRows.map((row) => (
          <li key={row.id} className="bg-surface px-3 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm">
                  <span className="font-mono text-xs uppercase text-muted">{row.color[0]}</span>{' '}
                  vs <span translate="no">{row.opponent}</span>
                </p>
                <p className="mt-1 font-mono text-xs text-muted">
                  {row.played_on} · mv {row.move_number} · {row.san}
                </p>
              </div>
              <span className="shrink-0 font-mono text-xs tabular">{row.loss}</span>
            </div>
            <p className="mt-2 text-xs text-muted">
              {PHASE_LABEL[row.phase as Phase]}
              {row.motif ? ` · ${MOTIF_LABEL[row.motif as Motif]}` : ''}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ClassificationBadge value={row.classification as Exclude<Classification, 'fine'>} />
              <a
                href={row.game_link}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-11 items-center text-sm text-muted hover:text-ink"
              >
                Game
              </a>
              <Link
                to="/drill/$username"
                params={{ username }}
                search={{ position: row.id }}
                className="inline-flex min-h-11 items-center text-sm hover:text-ink"
              >
                Drill this
              </Link>
            </div>
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto border border-line sm:block">
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
            {pageRows.map((row) => (
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
