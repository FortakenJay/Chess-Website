import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { useMemo, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import {
  ClockChart,
  ColorChart,
  DrillTrendChart,
  MotifChart,
  MoveHistogram,
  PhaseChart,
  TrendChart,
  WinRateChart,
} from '@/components/charts'
import { useAuth } from '@/lib/auth'
import { usePlayerData } from '@/lib/queries'
import {
  drillWeekly,
  gameTrend,
  headlineFrom,
  inTimeframe,
  sumClockStats,
  sumColorStats,
  sumPhaseStats,
  TIMEFRAME_LABEL,
  winRateByBlunders,
  PHASE_LABEL,
  type Timeframe,
} from '@/lib/stats'
import { normalizeUsername } from '@/lib/username'

export const Route = createFileRoute('/results/$username')({
  component: ResultsPage,
})

function ResultsPage() {
  const { username } = Route.useParams()
  const name = normalizeUsername(username)
  const { profile } = useAuth()
  const owner = profile?.chess_com_username === name
  const query = usePlayerData(name)
  const [timeframe, setTimeframe] = useState<Timeframe>('month')

  const games = query.data?.games ?? []
  const positions = query.data?.positions ?? []
  const attempts = query.data?.attempts ?? []
  const filteredGames = useMemo(
    () => games.filter((game) => inTimeframe(game.played_on, timeframe)),
    [games, timeframe],
  )
  const filteredPositions = useMemo(
    () => positions.filter((position) => inTimeframe(position.played_on, timeframe)),
    [positions, timeframe],
  )
  const filteredAttempts = useMemo(
    () => attempts.filter((attempt) => inTimeframe(attempt.attempted_at, timeframe)),
    [attempts, timeframe],
  )
  const byPhase = sumPhaseStats(filteredGames)
  const headline = headlineFrom(byPhase, filteredPositions)

  if (
    owner &&
    query.data &&
    !query.isFetching &&
    !query.isError &&
    games.length === 0 &&
    !query.data.sync
  ) {
    return <Navigate to="/analyze/$username" params={{ username: name }} />
  }

  return (
    <AppShell username={name}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Results</h1>
          <p className="mt-2 font-mono text-2xl">{name}</p>
          {query.data?.sync?.last_synced_at ? (
            <p className="mt-1 font-mono text-xs text-muted">
              last sync {new Date(query.data.sync.last_synced_at).toISOString().replace('T', ' ').slice(0, 16)} UTC
            </p>
          ) : null}
        </div>
        {owner ? (
          <Link
            to="/analyze/$username"
            params={{ username: name }}
            className="border border-ink px-3 py-2 text-sm hover:bg-ink hover:text-canvas"
          >
            Sync now
          </Link>
        ) : null}
      </div>

      {query.isLoading ? (
        <p className="mt-8 font-mono text-xs text-muted">Loading stored analysis…</p>
      ) : null}

      {!query.isLoading && games.length === 0 ? (
        <div className="mt-10 max-w-lg border border-line bg-surface p-5 text-sm text-muted">
          No stored analysis for this username.
          {owner ? (
            <p className="mt-3">
              <Link to="/analyze/$username" params={{ username: name }} className="text-ink underline">
                Run the first backfill
              </Link>{' '}
              — Stockfish runs in this browser.
            </p>
          ) : (
            <p className="mt-3">
              Sign in and link this Chess.com username to analyze it. Preview only shows data that already exists.
            </p>
          )}
        </div>
      ) : null}

      {games.length > 0 ? (
        <>
          <div
            className="mt-10 flex flex-wrap gap-1 border-b border-line pb-3"
            role="group"
            aria-label="Results timeframe"
          >
            {(Object.keys(TIMEFRAME_LABEL) as Timeframe[]).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={timeframe === value}
                onClick={() => setTimeframe(value)}
                className={`px-3 py-1.5 font-mono text-xs ${
                  timeframe === value
                    ? 'bg-ink text-canvas'
                    : 'text-muted hover:bg-surface-2 hover:text-ink'
                }`}
              >
                {TIMEFRAME_LABEL[value]}
              </button>
            ))}
          </div>

          {filteredGames.length > 0 ? (
            <>
              <section className="mt-6 border border-line bg-surface p-5">
                {headline ? (
                  <>
                    <p className="text-xs uppercase tracking-wider text-muted">
                      Primary leak · {TIMEFRAME_LABEL[timeframe]}
                    </p>
                    <p className="mt-2 text-2xl">
                      {PHASE_LABEL[headline.phase]} ·{' '}
                      <span className="font-mono tabular">{headline.errorPct}%</span> of moves are
                      blunders or mistakes
                    </p>
                    {headline.topMotif ? (
                      <p className="mt-2 text-sm text-muted">
                        Among tagged blunders, {headline.topMotif.replace('_', ' ')} is{' '}
                        <span className="font-mono text-ink">{headline.motifShare}%</span>
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted">Not enough moves yet for a phase leak.</p>
                )}
                <p className="mt-4 font-mono text-xs text-muted">
                  {filteredGames.length} games · {filteredPositions.length} flagged positions
                </p>
              </section>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <PhaseChart stats={byPhase} />
                <MotifChart positions={filteredPositions} />
                <ColorChart stats={sumColorStats(filteredGames)} />
                <ClockChart stats={sumClockStats(filteredGames)} />
                <TrendChart points={gameTrend(filteredGames, timeframe)} />
                <MoveHistogram positions={filteredPositions} />
                <WinRateChart buckets={winRateByBlunders(filteredGames)} />
                <DrillTrendChart weeks={drillWeekly(filteredAttempts)} />
              </div>
            </>
          ) : (
            <div className="mt-6 border border-line bg-surface p-5">
              <p className="text-sm text-muted">
                No analyzed games for {TIMEFRAME_LABEL[timeframe].toLowerCase()}.
              </p>
            </div>
          )}
        </>
      ) : null}
    </AppShell>
  )
}
