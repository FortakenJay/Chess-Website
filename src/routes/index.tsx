import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { HeroPosition } from '@/components/HeroPosition'
import { ShellSkeleton } from '@/components/ShellSkeleton'
import { UsernamePrompt } from '@/components/UsernamePrompt'
import { useAuth } from '@/lib/auth'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { ready, user, profile } = useAuth()

  if (!ready) {
    return (
      <AppShell>
        <ShellSkeleton />
      </AppShell>
    )
  }

  if (user && profile?.chess_com_username) {
    return <Navigate to="/results/$username" params={{ username: profile.chess_com_username }} />
  }

  if (user && !profile) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md">
          <UsernamePrompt />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <section className="grid items-center gap-8 pt-1 pb-10 sm:gap-10 sm:pb-14 lg:grid-cols-[minmax(0,1fr)_minmax(260px,400px)]">
        <div className="max-w-xl">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">
            Chess error analysis
          </p>
          <h1 className="mt-3 flex items-center gap-3 text-3xl font-medium tracking-tight text-pretty sm:mt-4 sm:text-5xl">
            <img
              src="/leek-logo.png"
              alt=""
              width={56}
              height={56}
              className="h-10 w-10 shrink-0 object-contain sm:h-14 sm:w-14"
              decoding="async"
            />
            <span className="font-mono tracking-[0.12em]">LEAK</span>
          </h1>
          <p className="mt-4 text-xl font-medium tracking-tight text-pretty text-ink sm:text-3xl">
            Where you lose rating, verified by the engine.
          </p>
          <p className="mt-4 max-w-[65ch] text-base leading-7 text-muted sm:mt-5">
            Stockfish tags the mistakes that cost rating. Then you drill those positions.
          </p>
          <div className="mt-7 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
            <Link
              to="/signup"
              className="control inline-flex min-h-11 w-full items-center justify-center border border-ink bg-ink px-4 text-sm text-canvas hover:bg-transparent hover:text-ink sm:w-auto"
            >
              Sign up
            </Link>
            <Link
              to="/review"
              className="control inline-flex min-h-11 w-full items-center justify-center border border-line px-4 text-sm text-ink hover:bg-surface-2 sm:w-auto"
            >
              Free game review
            </Link>
            <Link
              to="/preview"
              className="inline-flex min-h-11 w-full items-center justify-center px-4 text-sm text-muted hover:text-ink sm:w-auto"
            >
              Preview Hikaru
            </Link>
          </div>
        </div>
        <HeroPosition />
      </section>

      <section className="grid gap-10 border-t border-line pt-12 md:grid-cols-2">
        <div>
          <h2 className="text-2xl font-medium tracking-tight">Phase, motif, clock, color.</h2>
          <p className="mt-3 max-w-[65ch] text-sm leading-6 text-muted">
            Every flagged move is checked by Stockfish 18 in the browser. The drill uses games you
            actually played.
          </p>
          <ul className="mt-5 space-y-2 font-mono text-xs">
            <li className="text-blunder">Blunder</li>
            <li className="text-mistake">Mistake</li>
            <li className="text-inaccuracy">Inaccuracy</li>
          </ul>
        </div>
        <div>
          <h2 className="text-2xl font-medium tracking-tight">History follows the account.</h2>
          <p className="mt-3 max-w-[65ch] text-sm leading-6 text-muted">
            Link a Chess.com username once. Incremental games land overnight. Open the same history
            on any device.
          </p>
        </div>
      </section>
    </AppShell>
  )
}
