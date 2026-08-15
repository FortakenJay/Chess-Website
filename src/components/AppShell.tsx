import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { BrandLogo } from '@/components/BrandLogo'
import { useAuth } from '@/lib/auth'
import { useBackgroundSync } from '@/lib/backgroundSync'
import { getBrowserClient } from '@/lib/supabase/browser'

function AnalysisNav({
  username,
  owner,
  className,
}: {
  username: string
  owner: boolean
  className?: string
}) {
  return (
    <nav className={className}>
      <Link
        to="/results/$username"
        params={{ username }}
        className="hover:text-ink"
        activeProps={{ className: 'text-ink' }}
      >
        Results
      </Link>
      <Link
        to="/positions/$username"
        params={{ username }}
        className="hover:text-ink"
        activeProps={{ className: 'text-ink' }}
      >
        Positions
      </Link>
      <Link
        to="/drill/$username"
        params={{ username }}
        className="hover:text-ink"
        activeProps={{ className: 'text-ink' }}
      >
        Drill
      </Link>
      <Link
        to="/puzzles/$username"
        params={{ username }}
        className="hover:text-ink"
        activeProps={{ className: 'text-ink' }}
      >
        Puzzles
      </Link>
      <Link
        to="/review/$username"
        params={{ username }}
        className="hover:text-ink"
        activeProps={{ className: 'text-ink' }}
      >
        Review
      </Link>
      {owner ? (
        <Link
          to="/analyze/$username"
          params={{ username }}
          className="hover:text-ink"
          activeProps={{ className: 'text-ink' }}
        >
          Sync
        </Link>
      ) : null}
    </nav>
  )
}

export function AppShell({
  username,
  hideSignup,
  dense,
  children,
}: {
  username?: string
  hideSignup?: boolean
  /** Tighter chrome for board play pages (less scroll). */
  dense?: boolean
  children: ReactNode
}) {
  const { ready, user, profile } = useAuth()
  const sync = useBackgroundSync()
  const navigate = useNavigate()
  const owner = Boolean(
    username && profile?.chess_com_username === username.toLowerCase(),
  )
  const linkedUsername = profile?.chess_com_username
  const syncing =
    sync.username === linkedUsername &&
    (sync.phase === 'checking' || sync.phase === 'syncing')

  return (
    <div
      className={`flex flex-col bg-canvas text-ink ${
        dense ? 'h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'
      }`}
    >
      <a
        href="#main"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault()
          const main = document.getElementById('main')
          main?.focus()
          main?.scrollIntoView()
        }}
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 shrink-0 border-b border-line bg-canvas/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-6">
            <BrandLogo />
            {username ? (
              <AnalysisNav
                username={username}
                owner={owner}
                className="hidden items-center gap-4 text-sm text-muted sm:flex"
              />
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2 text-sm">
            {syncing && linkedUsername ? (
              <Link
                to="/analyze/$username"
                params={{ username: linkedUsername }}
                className="font-mono text-xs text-muted hover:text-ink"
              >
                Syncing {sync.done}/{sync.total || '…'}
              </Link>
            ) : null}
            {user && username ? (
              <span className="hidden font-mono text-xs text-muted sm:inline">{username}</span>
            ) : linkedUsername ? (
              <Link
                to="/results/$username"
                params={{ username: linkedUsername }}
                className="hidden font-mono text-xs text-muted hover:text-ink sm:inline"
              >
                {linkedUsername}
              </Link>
            ) : null}
            {!ready ? (
              <span className="font-mono text-xs text-muted">…</span>
            ) : user ? (
              <button
                type="button"
                className="border border-line px-3 py-1.5 text-sm text-ink hover:bg-surface-2"
                onClick={() => {
                  void (async () => {
                    await getBrowserClient().auth.signOut()
                    await navigate({ to: '/' })
                  })()
                }}
              >
                Sign out
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm text-muted hover:text-ink"
                  activeProps={{ className: 'text-ink' }}
                >
                  Log in
                </Link>
                {hideSignup ? null : (
                  <Link
                    to="/signup"
                    className="control border border-ink bg-ink px-3 py-1.5 text-sm text-canvas hover:bg-transparent hover:text-ink"
                    activeProps={{ className: 'bg-transparent text-ink' }}
                  >
                    Sign up
                  </Link>
                )}
              </>
            )}
          </div>
        </div>
        {username ? (
          <AnalysisNav
            username={username}
            owner={owner}
            className="mx-auto flex max-w-6xl flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-sm text-muted sm:hidden"
          />
        ) : null}
      </header>
      <main
        id="main"
        tabIndex={-1}
        className={`mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col px-4 ${
          dense ? 'overflow-hidden py-2' : 'py-8'
        }`}
      >
        {children}
      </main>
      {dense ? null : (
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6">
          <div>
            <BrandLogo size="sm" />
            <p className="mt-1 text-xs text-muted">Find the pattern. Fix the move.</p>
          </div>
          <nav aria-label="Footer" className="flex items-center gap-4 text-sm text-muted">
            <Link to="/" className="hover:text-ink">
              Home
            </Link>
            <Link to="/review" className="hover:text-ink">
              Free review
            </Link>
            <Link to="/preview" className="hover:text-ink">
              Preview
            </Link>
            {linkedUsername ? (
              <Link
                to="/results/$username"
                params={{ username: linkedUsername }}
                className="hover:text-ink"
              >
                Results
              </Link>
            ) : null}
          </nav>
        </div>
      </footer>
      )}
    </div>
  )
}
