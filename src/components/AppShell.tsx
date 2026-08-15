import type { ReactNode } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { BrandLogo } from '@/components/BrandLogo'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { useAuth } from '@/lib/auth'
import { useBackgroundSync } from '@/lib/backgroundSync'
import { cn } from '@/lib/cn'
import { getBrowserClient } from '@/lib/supabase/browser'
import { usePlayerAvatar } from '@/lib/usePlayerAvatar'

function AnalysisNav({
  username,
  owner,
  className,
  linkClassName,
}: {
  username: string
  owner: boolean
  className?: string
  linkClassName?: string
}) {
  const linkClass = cn('inline-flex min-h-11 shrink-0 items-center hover:text-ink', linkClassName)

  return (
    <nav className={className} aria-label="Analysis">
      <Link
        to="/results/$username"
        params={{ username }}
        className={linkClass}
        activeProps={{ className: 'text-ink' }}
      >
        Results
      </Link>
      <Link
        to="/positions/$username"
        params={{ username }}
        className={linkClass}
        activeProps={{ className: 'text-ink' }}
      >
        Positions
      </Link>
      <Link
        to="/drill/$username"
        params={{ username }}
        className={linkClass}
        activeProps={{ className: 'text-ink' }}
      >
        Drill
      </Link>
      <Link
        to="/puzzles/$username"
        params={{ username }}
        className={linkClass}
        activeProps={{ className: 'text-ink' }}
      >
        Puzzles
      </Link>
      <Link
        to="/review/$username"
        params={{ username }}
        className={linkClass}
        activeProps={{ className: 'text-ink' }}
      >
        Review
      </Link>
      {owner ? (
        <Link
          to="/analyze/$username"
          params={{ username }}
          className={linkClass}
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
  const pageAvatar = usePlayerAvatar(username)
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
      <header className="sticky top-0 z-20 shrink-0 border-b border-line bg-canvas/90 pt-[var(--safe-top)] backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 py-2 pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] sm:gap-4 sm:py-3">
          <div className="flex min-w-0 items-center gap-3 sm:gap-6">
            <BrandLogo />
            {username ? (
              <AnalysisNav
                username={username}
                owner={owner}
                className="hidden items-center text-sm text-muted lg:flex"
                linkClassName="px-2"
              />
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-sm sm:gap-2">
            {syncing && linkedUsername ? (
              <Link
                to="/analyze/$username"
                params={{ username: linkedUsername }}
                className="inline-flex min-h-11 items-center font-mono text-xs text-muted hover:text-ink"
              >
                Syncing {sync.done}/{sync.total || '…'}
              </Link>
            ) : null}
            {user && username ? (
              <span className="inline-flex items-center gap-2 font-mono text-xs text-muted">
                <PlayerAvatar username={username} src={pageAvatar} size={22} />
                <span className="hidden max-w-28 truncate sm:inline" translate="no">
                  {username}
                </span>
              </span>
            ) : linkedUsername ? (
              <Link
                to="/results/$username"
                params={{ username: linkedUsername }}
                className="inline-flex min-h-11 items-center gap-2 font-mono text-xs text-muted hover:text-ink"
              >
                <PlayerAvatar username={linkedUsername} src={profile?.avatar_url} size={22} />
                <span className="hidden max-w-28 truncate sm:inline" translate="no">
                  {linkedUsername}
                </span>
              </Link>
            ) : null}
            {!ready ? (
              <span className="font-mono text-xs text-muted">…</span>
            ) : user ? (
              <button
                type="button"
                className="inline-flex min-h-11 items-center border border-line px-3 text-sm text-ink hover:bg-surface-2"
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
                  className="inline-flex min-h-11 items-center px-3 text-sm text-muted hover:text-ink"
                  activeProps={{ className: 'text-ink' }}
                >
                  Log in
                </Link>
                {hideSignup ? null : (
                  <Link
                    to="/signup"
                    className="control inline-flex min-h-11 items-center border border-ink bg-ink px-3 text-sm text-canvas hover:bg-transparent hover:text-ink"
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
            className="mx-auto flex max-w-6xl gap-0 overflow-x-auto border-t border-line px-[max(0.5rem,var(--safe-left))] text-sm text-muted [scrollbar-width:none] [-ms-overflow-style:none] lg:hidden [&::-webkit-scrollbar]:hidden"
            linkClassName="px-3"
          />
        ) : null}
      </header>
      <main
        id="main"
        tabIndex={-1}
        className={`mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] ${
          dense ? 'overflow-hidden py-2' : 'py-5 sm:py-8'
        }`}
      >
        {children}
      </main>
      {dense ? null : (
      <footer className="border-t border-line pb-[max(1.5rem,var(--safe-bottom))]">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 py-6 pl-[max(1rem,var(--safe-left))] pr-[max(1rem,var(--safe-right))] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <div>
            <BrandLogo size="sm" />
            <p className="mt-1 text-xs text-muted">Find the pattern. Fix the move.</p>
          </div>
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-1 text-sm text-muted">
            <Link to="/" className="inline-flex min-h-11 items-center px-2 hover:text-ink">
              Home
            </Link>
            <Link to="/review" className="inline-flex min-h-11 items-center px-2 hover:text-ink">
              Free review
            </Link>
            <Link to="/preview" className="inline-flex min-h-11 items-center px-2 hover:text-ink">
              Preview
            </Link>
            {linkedUsername ? (
              <Link
                to="/results/$username"
                params={{ username: linkedUsername }}
                className="inline-flex min-h-11 items-center px-2 hover:text-ink"
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
