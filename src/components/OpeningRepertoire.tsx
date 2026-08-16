import { useMemo, useState } from 'react'
import { StatRow } from '@/components/InsightStats'
import { ButtonLink, Panel, SegmentedControl } from '@/components/ui'
import { accuracyFromAcpl } from '@/lib/analysis/classify'
import { gradeForAccuracy } from '@/lib/grades'
import type { PhaseAcpl, PhaseStats, QualityStats } from '@/lib/analysis/types'
import type { Tables } from '@/lib/supabase/database.types'

type ColorFilter = 'white' | 'black'
type OpeningSort = 'games' | 'win' | 'errors'

type OpeningRow = {
  name: string
  games: number
  wins: number
  draws: number
  errors: number
  mistakes: number
  openingMoves: number
  openingLoss: number
  bookMoves: number
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0
}

function openingAccuracy(loss: number, moves: number) {
  return moves ? accuracyFromAcpl(loss / moves) : null
}

function openingRows(games: Tables<'games'>[]): OpeningRow[] {
  const rows = new Map<string, OpeningRow>()
  for (const game of games) {
    const name = game.opening_name?.trim() || 'Unknown opening'
    const key = name.toLocaleLowerCase()
    const phase = (game.phase_stats as unknown as PhaseStats | null)?.opening
    const phaseAcpl = (game.phase_acpl as unknown as PhaseAcpl | null)?.opening
    const quality = game.quality_stats as unknown as Partial<QualityStats> | null
    const row = rows.get(key) ?? {
      name,
      games: 0,
      wins: 0,
      draws: 0,
      errors: 0,
      mistakes: 0,
      openingMoves: 0,
      openingLoss: 0,
      bookMoves: 0,
    }
    row.games += 1
    if (game.result === 'win') row.wins += 1
    if (game.result === 'draw') row.draws += 1
    if (phase) {
      row.errors += phase.blunder + phase.mistake + phase.inaccuracy
      row.mistakes += phase.blunder + phase.mistake
    }
    row.openingMoves += phaseAcpl?.moves ?? phase?.total ?? 0
    row.openingLoss += phaseAcpl?.totalLoss ?? 0
    row.bookMoves += Number(quality?.book ?? 0)
    rows.set(key, row)
  }
  return [...rows.values()]
}

export function OpeningRepertoire({
  username,
  games,
}: {
  username: string
  games: Tables<'games'>[]
}) {
  const [color, setColor] = useState<ColorFilter>(() => {
    const white = games.filter((game) => game.color === 'white').length
    const black = games.filter((game) => game.color === 'black').length
    return black > white ? 'black' : 'white'
  })
  const [sort, setSort] = useState<OpeningSort>('games')
  const [query, setQuery] = useState('')
  const [expanded, setExpanded] = useState(false)

  const colorGames = useMemo(
    () => games.filter((game) => game.color === color),
    [color, games],
  )

  const rows = useMemo(() => {
    const search = query.trim().toLocaleLowerCase()
    const out = openingRows(colorGames).filter(
      (row) => !search || row.name.toLocaleLowerCase().includes(search),
    )
    out.sort((a, b) => {
      if (sort === 'win') {
        return percent(b.wins, b.games) - percent(a.wins, a.games) || b.games - a.games
      }
      if (sort === 'errors') {
        return (
          percent(b.errors, b.openingMoves) - percent(a.errors, a.openingMoves) ||
          b.games - a.games
        )
      }
      return b.games - a.games
    })
    return out
  }, [colorGames, query, sort])

  const allRows = useMemo(() => openingRows(colorGames), [colorGames])
  const namedGames = colorGames.filter((game) => game.opening_name?.trim()).length
  const visibleRows = expanded ? rows : rows.slice(0, 12)
  const totals = allRows.reduce(
    (sum, row) => ({
      errors: sum.errors + row.errors,
      mistakes: sum.mistakes + row.mistakes,
      openingMoves: sum.openingMoves + row.openingMoves,
      openingLoss: sum.openingLoss + row.openingLoss,
      bookMoves: sum.bookMoves + row.bookMoves,
    }),
    { errors: 0, mistakes: 0, openingMoves: 0, openingLoss: 0, bookMoves: 0 },
  )
  const overallAccuracy = openingAccuracy(totals.openingLoss, totals.openingMoves)
  const avgBookMoves = totals.bookMoves / Math.max(1, colorGames.length)
  const avgOpeningMistakes = totals.mistakes / Math.max(1, colorGames.length)

  return (
    <div className="mt-6 space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Panel>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">Games</p>
          <p className="mt-2 font-mono text-2xl tabular">{namedGames}</p>
        </Panel>
        <Panel>
          <p className="font-mono text-[11px] uppercase tracking-wider text-muted">Openings</p>
          <p className="mt-2 font-mono text-2xl tabular">{allRows.length}</p>
        </Panel>
      </div>

      <section aria-labelledby="opening-stats-heading">
        <div className="border-b border-line pb-3">
          <h2 id="opening-stats-heading" className="font-mono text-sm uppercase tracking-wider">
            Opening stats
          </h2>
        </div>
        <div className="hidden grid-cols-[minmax(0,1fr)_5rem_6rem] border-x border-b border-line bg-surface-2 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted sm:grid">
          <span>Stat</span>
          <span>Grade</span>
          <span>You</span>
        </div>
        <dl className="divide-y divide-line border-x border-b border-line">
          <StatRow
            label="Avg. number of book moves"
            value={avgBookMoves.toFixed(1)}
            grade={avgBookMoves >= 6 ? 'A' : avgBookMoves >= 4 ? 'B' : avgBookMoves >= 2 ? 'C' : 'D'}
          />
          <StatRow
            label="Avg. number of opening mistakes"
            value={avgOpeningMistakes.toFixed(1)}
            grade={avgOpeningMistakes <= 0.2 ? 'A' : avgOpeningMistakes <= 0.5 ? 'B' : avgOpeningMistakes <= 1 ? 'C' : 'D'}
          />
          <StatRow
            label="Opening accuracy"
            value={overallAccuracy == null ? '—' : `${overallAccuracy.toFixed(1)}%`}
            grade={gradeForAccuracy(overallAccuracy)}
          />
        </dl>
      </section>

      <Panel>
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
          <label className="flex flex-col gap-1 font-mono text-[11px] uppercase tracking-wider text-muted">
            Find an opening
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Italian Game"
              className="min-h-11 w-full border border-line bg-canvas px-3 text-base normal-case tracking-normal text-ink sm:text-sm"
            />
          </label>
          <ButtonLink
            to="/drill/$username"
            params={{ username }}
            search={{ phase: 'opening', order: 'worst' }}
            className="w-full sm:w-auto"
          >
            Drill opening leaks
          </ButtonLink>
        </div>
        <SegmentedControl
          label="Opening color"
          value={color}
          onChange={setColor}
          className="mt-4 sm:mt-4"
          options={[
            { value: 'white', label: 'White' },
            { value: 'black', label: 'Black' },
          ]}
        />
        <SegmentedControl
          label="Opening sort"
          value={sort}
          onChange={setSort}
          className="mt-2 border-b-0 pb-0 sm:mt-2"
          options={[
            { value: 'games', label: 'Most played' },
            { value: 'win', label: 'Best results' },
            { value: 'errors', label: 'Most errors' },
          ]}
        />
      </Panel>

      <section aria-labelledby="opening-list-heading">
        <div className="flex items-baseline justify-between gap-3 border-b border-line pb-3">
          <h2 id="opening-list-heading" className="font-mono text-sm uppercase tracking-wider">
            Performance by opening
          </h2>
          <span className="font-mono text-xs tabular text-muted">{rows.length} openings</span>
        </div>
        <div className="hidden grid-cols-[minmax(0,1fr)_4rem_5rem_4rem_6rem] border-x border-b border-line bg-surface-2 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted sm:grid">
          <span>Opening</span>
          <span>Games</span>
          <span>Win %</span>
          <span>Grade</span>
          <span>Accuracy</span>
        </div>
        {rows.length === 0 ? (
          <p className="border-x border-b border-line bg-surface px-4 py-8 text-sm text-muted">
            No openings match this filter.
          </p>
        ) : (
          <ul className="divide-y divide-line border-x border-b border-line">
            {visibleRows.map((row) => {
              const winPct = percent(row.wins, row.games)
              const accuracy = openingAccuracy(row.openingLoss, row.openingMoves)
              return (
                <li
                  key={row.name}
                  className="grid gap-3 bg-surface px-4 py-4 sm:grid-cols-[minmax(0,1fr)_4rem_5rem_4rem_6rem] sm:items-center"
                >
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-medium" title={row.name}>
                      {row.name}
                    </h3>
                    <p className="mt-1 font-mono text-[11px] text-muted">
                      {row.wins}W · {row.draws}D · {row.games - row.wins - row.draws}L
                    </p>
                  </div>
                  <Metric label="Games" value={String(row.games)} />
                  <Metric label="Win rate" value={`${winPct}%`} />
                  <Metric label="Grade" value={gradeForAccuracy(accuracy)} />
                  <Metric
                    label="Accuracy"
                    value={accuracy == null ? '—' : `${accuracy.toFixed(1)}%`}
                    warn={accuracy != null && accuracy < 70}
                  />
                </li>
              )
            })}
          </ul>
        )}
        {rows.length > 12 ? (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={() => setExpanded((value) => !value)}
            className="inline-flex min-h-11 w-full items-center justify-center border-x border-b border-line bg-surface px-4 font-mono text-xs text-muted hover:bg-surface-2 hover:text-ink"
          >
            {expanded ? 'Show fewer openings' : `Show all ${rows.length} openings`}
          </button>
        ) : null}
      </section>
    </div>
  )
}

function Metric({
  label,
  value,
  warn,
}: {
  label: string
  value: string
  warn?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 sm:block">
      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{label}</span>
      <span className={`font-mono text-sm tabular sm:mt-1 sm:block ${warn ? 'text-blunder-text' : ''}`}>
        {value}
      </span>
    </div>
  )
}
