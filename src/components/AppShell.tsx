import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
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
  children,
}: {
  username?: string
  hideSignup?: boolean
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
    <div className="flex min-h-[100dvh] flex-col bg-canvas text-ink">
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
      <header className="sticky top-0 z-20 border-b border-line bg-canvas/90 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex min-w-0 items-center gap-6">
            <Link to="/" className="font-mono text-sm tracking-[0.2em] text-ink">
              LEAK
            </Link>
            {user && username ? (
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
                  void getBrowserClient()
                    .auth.signOut()
                    .then(() => navigate({ to: '/' }))
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
        {user && username ? (
          <AnalysisNav
            username={username}
            owner={owner}
            className="mx-auto flex max-w-6xl flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-sm text-muted sm:hidden"
          />
        ) : null}
      </header>
      <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
        {children}
      </main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-6">
          <div>
            <p className="font-mono text-xs tracking-[0.2em]">LEAK</p>
            <p className="mt-1 text-xs text-muted">Find the pattern. Fix the move.</p>
          </div>
          <nav aria-label="Footer" className="flex items-center gap-4 text-sm text-muted">
            <Link to="/" className="hover:text-ink">
              Home
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
    </div>
  )
}
