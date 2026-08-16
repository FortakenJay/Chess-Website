import type { CSSProperties } from 'react'
import type { GameAnalysis, MoveQuality, QualityStats } from '@/lib/analysis/types'
import {
  performanceGrade,
  relativePlayedLabel,
  type GameMeta,
  type PerformanceGrade,
} from '@/lib/analysis/parseGameMeta'
import { QUALITY_COLOR } from '@/lib/analysis/formatEval'
import { chipActive, chipIdle, rowButton } from '@/components/review/reviewUi'
import { cn } from '@/lib/cn'

export type ReviewGameRow = {
  meta: GameMeta
  analysis: GameAnalysis | null
  analyzing: boolean
}

const GRADE_LABEL: Record<PerformanceGrade, string> = {
  underperforming: '?!',
  solid: 'OK',
  strong: '↑',
}

function resultClass(result: GameMeta['result']) {
  if (result === 'win') return 'text-accent'
  if (result === 'loss') return 'text-blunder-text'
  return 'text-mistake'
}

function resultLabel(result: GameMeta['result']) {
  if (result === 'win') return 'Win'
  if (result === 'loss') return 'Loss'
  return 'Draw'
}

function MoveQualityBar({ stats }: { stats: QualityStats }) {
  const order: MoveQuality[] = [
    'brilliant',
    'great',
    'book',
    'best',
    'excellent',
    'good',
    'miss',
    'inaccuracy',
    'mistake',
    'blunder',
  ]
  const total = order.reduce((sum, key) => sum + stats[key], 0)
  if (!total) return <span className="font-mono text-[11px] text-muted">No moves</span>

  return (
    <div
      className="flex h-2.5 w-full max-w-[180px] overflow-hidden bg-surface-2"
      title={order.map((q) => `${q}: ${stats[q]}`).join(' · ')}
      aria-label="Move quality distribution"
    >
      {order.map((q) => {
        const n = stats[q]
        if (!n) return null
        return (
          <span
            key={q}
            style={{ width: `${(n / total) * 100}%`, backgroundColor: QUALITY_COLOR[q] } as CSSProperties}
          />
        )
      })}
    </div>
  )
}

function GradeBadge({ grade }: { grade: PerformanceGrade }) {
  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 items-center justify-center font-mono text-xs font-medium',
        grade === 'underperforming' && 'bg-inaccuracy text-canvas',
        grade === 'strong' && 'bg-accent text-ink',
        grade === 'solid' && 'border border-line text-muted',
      )}
      title={grade}
      aria-label={grade}
    >
      {GRADE_LABEL[grade]}
    </span>
  )
}

export function ReviewGamesList({
  rows,
  filter,
  onFilterChange,
  onSelect,
  progressLabel,
  selectedLinks,
  onToggleSelect,
  title = 'Games',
}: {
  rows: ReviewGameRow[]
  filter: 'all' | 'underperforming'
  onFilterChange: (filter: 'all' | 'underperforming') => void
  onSelect: (gameLink: string) => void
  progressLabel?: string | null
  selectedLinks?: Set<string>
  onToggleSelect?: (gameLink: string) => void
  title?: string
}) {
  const underCount = rows.filter((row) => {
    if (!row.analysis) return false
    return performanceGrade(row.analysis) === 'underperforming'
  }).length

  const visible = rows.filter((row) => {
    if (filter !== 'underperforming') return true
    if (!row.analysis) return false
    return performanceGrade(row.analysis) === 'underperforming'
  })

  const selectable = Boolean(onToggleSelect && selectedLinks)

  return (
    <section aria-labelledby="review-games-heading">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-3">
        <div>
          <h2 id="review-games-heading" className="font-mono text-lg">
            {title}
          </h2>
          <p className="mt-1 text-sm text-muted">
            Pick games to analyze. Engine runs in your browser — nothing is saved.
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={cn(
              'inline-flex min-h-11 items-center justify-center px-3 font-mono text-xs uppercase tracking-wider',
              filter === 'all' ? chipActive : chipIdle,
            )}
          >
            All
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('underperforming')}
            className={cn(
              'inline-flex min-h-11 items-center justify-center px-3 font-mono text-xs uppercase tracking-wider',
              filter === 'underperforming' ? chipActive : chipIdle,
            )}
          >
            Underperforming{underCount ? ` (${underCount})` : ''}
          </button>
        </div>
      </div>

      {progressLabel ? (
        <p className="border-x border-b border-line bg-surface px-4 py-2 font-mono text-xs text-muted">
          {progressLabel}
        </p>
      ) : null}

      <div
        className={cn(
          'hidden border-x border-b border-line bg-surface-2 px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-muted sm:grid sm:gap-3',
          selectable
            ? 'sm:grid-cols-[28px_64px_48px_72px_minmax(0,1.4fr)_minmax(120px,1fr)_72px_24px]'
            : 'sm:grid-cols-[64px_48px_72px_minmax(0,1.4fr)_minmax(120px,1fr)_72px_24px]',
        )}
      >
        {selectable ? <span /> : null}
        <span>Result</span>
        <span>Grade</span>
        <span>Elo</span>
        <span>Opponent</span>
        <span>Move quality</span>
        <span>Played</span>
        <span />
      </div>

      <ul className="border-x border-b border-line">
        {visible.length === 0 ? (
          <li className="bg-surface px-4 py-8 text-sm text-muted">
            {filter === 'underperforming'
              ? 'No underperforming games yet — analyze some games first, or switch to All.'
              : 'No games found.'}
          </li>
        ) : (
          visible.map((row) => {
            const grade = row.analysis ? performanceGrade(row.analysis) : null
            const opening =
              row.analysis?.openingName ||
              row.meta.openingName ||
              (row.meta.openingEco ? `ECO ${row.meta.openingEco}` : 'Unknown opening')
            const checked = selectedLinks?.has(row.meta.gameLink) ?? false
            return (
              <li key={row.meta.gameLink} className="flex border-b border-line bg-surface last:border-b-0">
                {selectable ? (
                  <label className="flex cursor-pointer items-center px-3 hover:bg-surface-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => onToggleSelect?.(row.meta.gameLink)}
                      className="h-4 w-4 accent-ink"
                      aria-label={`Select game vs ${row.meta.opponent}`}
                    />
                  </label>
                ) : null}
                <button
                  type="button"
                  onClick={() => onSelect(row.meta.gameLink)}
                  className={cn(
                    rowButton,
                    'px-4 py-3.5 sm:grid sm:items-center sm:gap-3 sm:py-4',
                    selectable
                      ? 'sm:grid-cols-[64px_48px_72px_minmax(0,1.4fr)_minmax(120px,1fr)_72px_24px]'
                      : 'sm:grid-cols-[64px_48px_72px_minmax(0,1.4fr)_minmax(120px,1fr)_72px_24px]',
                  )}
                >
                  <div className="flex items-start gap-3 sm:contents">
                    <span className={cn('font-mono text-sm font-medium', resultClass(row.meta.result))}>
                      {resultLabel(row.meta.result)}
                    </span>
                    <span className="flex items-center">
                      {grade ? (
                        <GradeBadge grade={grade} />
                      ) : row.analyzing ? (
                        <span className="font-mono text-[10px] text-muted">…</span>
                      ) : (
                        <span className="font-mono text-[10px] text-muted">—</span>
                      )}
                    </span>
                    <span className="hidden font-mono text-sm tabular sm:block">
                      <span className="block text-base">{row.meta.userRating ?? '—'}</span>
                      {row.analysis ? (
                        <span className="text-[11px] text-muted">
                          {Math.round(row.analysis.accuracyPct)}%
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2 text-sm">
                        <span className="text-muted">vs</span>
                        <span
                          className={cn(
                            'inline-block h-2.5 w-2.5 rounded-full border border-line',
                            row.meta.color === 'white' ? 'bg-ink' : 'bg-canvas',
                          )}
                          title={row.meta.color === 'white' ? 'You played White' : 'You played Black'}
                        />
                        <span className="truncate font-medium" translate="no">
                          {row.meta.opponent}
                        </span>
                        {row.meta.opponentRating != null ? (
                          <span className="font-mono text-xs text-muted">{row.meta.opponentRating}</span>
                        ) : null}
                        {row.meta.timeClass ? (
                          <span className="font-mono text-[10px] uppercase text-muted">
                            {row.meta.timeClass}
                          </span>
                        ) : null}
                      </span>
                      <span className="mt-1 block truncate text-xs text-muted">{opening}</span>
                    </span>
                    <span className="hidden min-w-0 sm:block">
                      {row.analysis ? (
                        <MoveQualityBar stats={row.analysis.qualityStats} />
                      ) : (
                        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                          {row.analyzing ? 'Analyzing…' : 'Not analyzed yet'}
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-mono text-xs text-muted">
                      {relativePlayedLabel(row.meta.endTime)}
                    </span>
                    <span className="text-muted" aria-hidden>
                      ›
                    </span>
                  </div>
                  <div className="mt-2 flex items-center gap-3 sm:hidden">
                    <span className="font-mono text-sm tabular">
                      <span>{row.meta.userRating ?? '—'}</span>
                      {row.analysis ? (
                        <span className="ml-1 text-[11px] text-muted">
                          {Math.round(row.analysis.accuracyPct)}%
                        </span>
                      ) : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      {row.analysis ? (
                        <MoveQualityBar stats={row.analysis.qualityStats} />
                      ) : (
                        <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
                          {row.analyzing ? 'Analyzing…' : 'Not analyzed yet'}
                        </span>
                      )}
                    </span>
                  </div>
                </button>
              </li>
            )
          })
        )}
      </ul>
    </section>
  )
}
