import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { lazy, Suspense, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import {
  ButtonLink,
  EmptyState,
  PageHeader,
  ResultsSkeleton,
  SegmentedControl,
} from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { usePlayerData } from '@/lib/queries'
import { useResultsModel } from '@/lib/resultsModel'
import { TIMEFRAME_LABEL, type Timeframe } from '@/lib/stats'
import { normalizeUsername } from '@/lib/username'

const ResultsCharts = lazy(() =>
  import('@/components/ResultsCharts').then((mod) => ({ default: mod.ResultsCharts })),
)

/** ISO timestamps from Supabase are already UTC; avoid Intl during render. */
function formatUtcStamp(iso: string) {
  const normalized = iso.endsWith('Z') ? iso : `${iso}Z`
  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) return iso
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  const hh = String(date.getUTCHours()).padStart(2, '0')
  const mm = String(date.getUTCMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

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
  const model = useResultsModel(games, positions, attempts, timeframe)
  const lastSyncedAt = query.data?.sync?.last_synced_at ?? null
  const lastSyncLabel = lastSyncedAt ? formatUtcStamp(lastSyncedAt) : null

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
      <PageHeader
        title="Results"
        username={name}
        meta={
          lastSyncLabel ? (
            <p className="font-mono text-xs text-muted">Last sync {lastSyncLabel} UTC</p>
          ) : null
        }
        actions={
          owner ? (
            <ButtonLink to="/analyze/$username" params={{ username: name }} variant="secondary">
              Sync now
            </ButtonLink>
          ) : null
        }
      />

      {query.isLoading ? <ResultsSkeleton /> : null}

      {!query.isLoading && games.length === 0 ? (
        <EmptyState className="mt-10 max-w-lg">
          No stored analysis for this username.
          {owner ? (
            <p className="mt-3 text-pretty">
              <Link to="/analyze/$username" params={{ username: name }} className="text-ink underline">
                Run the first backfill
              </Link>{' '}
              — Stockfish runs in this browser.
            </p>
          ) : (
            <p className="mt-3 text-pretty">
              Sign in and link this Chess.com username to analyze it. Preview only shows data that
              already exists.
            </p>
          )}
        </EmptyState>
      ) : null}

      {games.length > 0 ? (
        <>
          <SegmentedControl
            label="Results timeframe"
            value={timeframe}
            onChange={setTimeframe}
            options={(Object.keys(TIMEFRAME_LABEL) as Timeframe[]).map((value) => ({
              value,
              label: TIMEFRAME_LABEL[value],
            }))}
          />

          <Suspense fallback={<ResultsSkeleton className="mt-6" />}>
            <ResultsCharts model={model} timeframe={timeframe} />
          </Suspense>
        </>
      ) : null}
    </AppShell>
  )
}
