import { createFileRoute, Link } from '@tanstack/react-router'
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
  headlineFrom,
  sumClockStats,
  sumColorStats,
  sumPhaseStats,
  winRateByBlunders,
  PHASE_LABEL,
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

  const games = query.data?.games ?? []
  const positions = query.data?.positions ?? []
  const periods = query.data?.periods ?? []
  const attempts = query.data?.attempts ?? []
  const byPhase = sumPhaseStats(games)
  const headline = headlineFrom(byPhase, positions)

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
          <section className="mt-10 border border-line bg-surface p-5">
            {headline ? (
              <>
                <p className="text-xs uppercase tracking-wider text-muted">Primary leak</p>
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
              {games.length} games · {positions.length} flagged positions
            </p>
          </section>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <PhaseChart stats={byPhase} />
            <MotifChart positions={positions} />
            <ColorChart stats={sumColorStats(games)} />
            <ClockChart stats={sumClockStats(games)} />
            <TrendChart periods={periods} />
            <MoveHistogram positions={positions} />
            <WinRateChart buckets={winRateByBlunders(games)} />
            <DrillTrendChart weeks={drillWeekly(attempts)} />
          </div>
        </>
      ) : null}
    </AppShell>
  )
}
