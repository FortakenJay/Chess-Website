import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { ProgressPanel } from '@/components/ProgressPanel'
import { ShellSkeleton } from '@/components/ShellSkeleton'
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

  return (
    <AppShell username={name}>
      <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Analyze</h1>
      <p className="mt-2 text-2xl">{name}</p>
      <div className="mt-8 max-w-xl">
        <ProgressPanel
          title={
            sync.phase === 'complete'
              ? 'Sync complete'
              : sync.phase === 'error'
                ? 'Sync stopped'
                : 'Syncing in the background'
          }
          detail={sync.error ?? sync.detail}
          done={sync.done}
          total={sync.total}
        />
        <p className="mt-3 font-mono text-xs text-muted">
          {sync.saved} new games saved · {sync.skipped} existing skipped · {sync.flagged} flagged
          positions
        </p>
        {sync.phase === 'syncing' || sync.phase === 'checking' ? (
          <p className="mt-3 text-sm text-muted">
            You can browse the site while this continues. Keep this tab open.
          </p>
        ) : null}
        {sync.error ? (
          <div className="mt-3">
            <p className="text-sm text-blunder">{sync.error}</p>
            <button
              type="button"
              onClick={sync.retry}
              className="mt-3 border border-ink px-3 py-2 text-sm hover:bg-ink hover:text-canvas"
            >
              Try again
            </button>
          </div>
        ) : null}
        <Link
          to="/results/$username"
          params={{ username: name }}
          className="mt-6 inline-block border border-ink px-3 py-2 text-sm hover:bg-ink hover:text-canvas"
        >
          {sync.phase === 'complete' ? 'Open results' : 'Continue to results'}
        </Link>
      </div>
    </AppShell>
  )
}
