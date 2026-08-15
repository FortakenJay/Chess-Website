import { createFileRoute, Navigate } from '@tanstack/react-router'
import { useEffect, useRef } from 'react'
import { AppShell } from '@/components/AppShell'
import { ProgressPanel } from '@/components/ProgressPanel'
import { ShellSkeleton } from '@/components/ShellSkeleton'
import { Button, ButtonLink, ErrorText, PageHeader } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useBackgroundSync } from '@/lib/backgroundSync'
import { normalizeUsername } from '@/lib/username'

export const Route = createFileRoute('/analyze/$username')({
  component: AnalyzePage,
})

function AnalyzePage() {
  const { username } = Route.useParams()
  const name = normalizeUsername(username)
  const { ready, user, profile } = useAuth()
  const sync = useBackgroundSync()
  const owner = profile?.chess_com_username === name
  const startedFor = useRef<string | null>(null)
  const busy = sync.phase === 'checking' || sync.phase === 'syncing'

  useEffect(() => {
    if (!ready || !user || !owner) return
    if (startedFor.current === name) return
    startedFor.current = name
    sync.start()
  }, [ready, user, owner, name, sync.start])

  if (!ready) {
    return (
      <AppShell>
        <ShellSkeleton />
      </AppShell>
    )
  }

  if (!user || !owner) {
    return <Navigate to="/" />
  }

  const title =
    sync.phase === 'complete'
      ? sync.mode === 'today'
        ? 'Today’s games checked'
        : sync.mode === 'reanalyze'
          ? 'Reanalyze finished'
          : sync.historyComplete
            ? 'Library synced'
            : 'Sync pass finished'
      : sync.phase === 'error'
        ? 'Sync stopped'
        : sync.mode === 'today'
          ? 'Resyncing today'
          : sync.mode === 'reanalyze'
            ? 'Reanalyzing stale games'
            : 'Building your library'

  return (
    <AppShell username={name}>
      <PageHeader
        title="Analyze"
        username={name}
        description="Imports every standard Chess.com game into LEAK and runs Stockfish in this browser. Big libraries take a while — keep this tab open."
      />
      <div className="mt-8 max-w-xl">
        <ProgressPanel
          title={title}
          detail={sync.error ?? sync.detail}
          done={sync.done}
          total={sync.total}
        />
        <p className="mt-3 font-mono text-xs text-muted text-pretty">
          <span className="tabular">{sync.libraryCount || sync.skipped}</span> in library
          {sync.chesscomSeen > 0 ? (
            <>
              {' '}
              · <span className="tabular">{sync.chesscomSeen}</span> standard games seen this pass
            </>
          ) : null}
          {sync.saved > 0 ? (
            <>
              {' '}
              · <span className="tabular">{sync.saved}</span> new this session
            </>
          ) : null}
          {sync.flagged > 0 ? (
            <>
              {' '}
              · <span className="tabular">{sync.flagged}</span> flagged
            </>
          ) : null}
        </p>
        {busy && sync.mode === 'full' ? (
          <p className="mt-3 text-sm text-muted text-pretty">
            Chess.com profile totals include variants we skip. Progress is by archive month, not by
            their headline game count. You can browse other tabs while this runs.
          </p>
        ) : null}
        {sync.phase === 'complete' && sync.mode === 'full' && sync.historyComplete ? (
          <p className="mt-3 text-sm text-muted text-pretty">
            All archive months were walked. Use Resync today for new games, or Sync library again
            later for a full pass.
          </p>
        ) : null}
        {sync.error ? (
          <div className="mt-3">
            <ErrorText>{sync.error}</ErrorText>
          </div>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-2">
          <Button disabled={busy} onClick={sync.resyncToday}>
            Resync today
          </Button>
          <Button variant="ghost" disabled={busy} onClick={sync.reanalyze}>
            Reanalyze stale games
          </Button>
          {sync.phase === 'error' || (sync.phase === 'complete' && !sync.historyComplete) ? (
            <Button variant="ghost" disabled={busy} onClick={sync.retry}>
              {sync.phase === 'error' ? 'Continue sync' : 'Continue importing'}
            </Button>
          ) : (
            <Button variant="ghost" disabled={busy} onClick={sync.start}>
              Sync library
            </Button>
          )}
        </div>
        <ButtonLink
          to="/results/$username"
          params={{ username: name }}
          className="mt-6 inline-block"
        >
          {sync.phase === 'complete' ? 'Open results' : 'Continue to results'}
        </ButtonLink>
      </div>
    </AppShell>
  )
}
