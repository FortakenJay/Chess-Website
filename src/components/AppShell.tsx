import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { BrandLogo } from '@/components/BrandLogo'
import { PlayerAvatar } from '@/components/PlayerAvatar'
import { Button, ButtonLink, TextLink, tabItemVariants } from '@/components/ui'
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
  const linkClass = cn(tabItemVariants({ active: false, surface: 'header' }), linkClassName)

  return (
    <nav className={className} aria-label="Analysis">
      <Link
        to="/results/$username"
        params={{ username }}
        className={linkClass}
        activeOptions={{ exact: false }}
        activeProps={{ className: tabItemVariants({ active: true, surface: 'header' }) }}
      >
        Results
      </Link>
      <Link
        to="/positions/$username"
        params={{ username }}
        className={linkClass}
        activeProps={{ className: tabItemVariants({ active: true, surface: 'header' }) }}
      >
        Positions
      </Link>
      <Link
        to="/drill/$username"
        params={{ username }}
        className={linkClass}
        activeProps={{ className: tabItemVariants({ active: true, surface: 'header' }) }}
      >
        Drill
      </Link>
      <Link
        to="/puzzles/$username"
        params={{ username }}
        className={linkClass}
        activeProps={{ className: tabItemVariants({ active: true, surface: 'header' }) }}
      >
        Puzzles
      </Link>
      <Link
        to="/trainer/$username"
        params={{ username }}
        className={linkClass}
        activeProps={{ className: tabItemVariants({ active: true, surface: 'header' }) }}
      >
        Trainer
      </Link>
      <Link
        to="/roadmap/$username"
        params={{ username }}
        className={linkClass}
        activeProps={{ className: tabItemVariants({ active: true, surface: 'header' }) }}
      >
        Roadmap
      </Link>
      <Link
        to="/review/$username"
        params={{ username }}
        className={linkClass}
        activeProps={{ className: tabItemVariants({ active: true, surface: 'header' }) }}
      >
        Review
      </Link>
      {owner ? (
        <Link
          to="/analyze/$username"
          params={{ username }}
          className={linkClass}
          activeProps={{ className: tabItemVariants({ active: true, surface: 'header' }) }}
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
      className={`app-shell flex w-full max-w-full flex-col overflow-x-clip bg-canvas text-ink ${
        dense ? 'app-shell-dense h-[100dvh] overflow-hidden' : 'min-h-[100dvh]'
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
      <header className="sticky top-0 z-20 shrink-0 border-b border-line bg-canvas/95 pt-[var(--safe-top)] backdrop-blur-md">
        <div
          className="mx-auto flex max-w-6xl items-center justify-between gap-3 py-2 sm:gap-4 sm:py-3"
          style={{
            paddingLeft: 'max(1rem, var(--safe-left))',
            paddingRight: 'max(1rem, var(--safe-right))',
          }}
        >
          <div className="flex min-w-0 items-center gap-3 sm:gap-6">
            <BrandLogo />
            {username ? (
              <AnalysisNav
                username={username}
                owner={owner}
                className="hidden items-center text-muted lg:flex"
                linkClassName="px-2.5"
              />
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-1.5 text-sm sm:gap-2">
            {syncing && linkedUsername ? (
              <TextLink
                to="/analyze/$username"
                params={{ username: linkedUsername }}
                className="font-mono text-xs"
              >
                Syncing {sync.done}/{sync.total || '…'}
              </TextLink>
            ) : null}
            {user && username ? (
              <span className="inline-flex items-center gap-2 font-mono text-xs text-muted">
                <PlayerAvatar username={username} src={pageAvatar} size={22} />
                <span className="max-w-20 truncate sm:max-w-28" translate="no">
                  {username}
                </span>
              </span>
            ) : linkedUsername ? (
              <TextLink
                to="/results/$username"
                params={{ username: linkedUsername }}
                className="gap-2 px-0 font-mono text-xs"
              >
                <PlayerAvatar username={linkedUsername} src={profile?.avatar_url} size={22} />
                <span className="max-w-20 truncate sm:max-w-28" translate="no">
                  {linkedUsername}
                </span>
              </TextLink>
            ) : null}
            {!ready ? (
              <span className="font-mono text-xs text-muted">…</span>
            ) : user ? (
              <Button
                variant="ghost"
                onClick={() => {
                  void (async () => {
                    await getBrowserClient().auth.signOut()
                    window.location.assign('/')
                  })()
                }}
              >
                Sign out
              </Button>
            ) : (
              <>
                <ButtonLink to="/login" variant="quiet" activeProps={{ className: 'text-ink' }}>
                  Log in
                </ButtonLink>
                {hideSignup ? null : (
                  <ButtonLink to="/signup" variant="primary">
                    Sign up
                  </ButtonLink>
                )}
              </>
            )}
          </div>
        </div>
        {username ? (
          <AnalysisNav
            username={username}
            owner={owner}
            className="mx-auto flex max-w-6xl gap-0 overflow-x-auto border-t border-line bg-surface/45 px-2 text-muted [scrollbar-width:none] [-ms-overflow-style:none] lg:hidden [&::-webkit-scrollbar]:hidden"
            linkClassName="px-3"
          />
        ) : null}
      </header>
      <main
        id="main"
        tabIndex={-1}
        className={`mx-auto box-border flex min-h-0 min-w-0 w-full max-w-6xl flex-1 flex-col ${
          dense ? 'overflow-y-auto py-3 lg:overflow-hidden lg:py-2' : 'py-5 sm:py-8'
        }`}
        style={{
          paddingLeft: 'max(1rem, var(--safe-left))',
          paddingRight: 'max(1rem, var(--safe-right))',
        }}
      >
        {children}
      </main>
      {dense ? null : (
        <footer className="border-t border-line bg-canvas/95 pb-[max(1.5rem,var(--safe-bottom))]">
          <div
            className="mx-auto flex max-w-6xl flex-col gap-4 py-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
            style={{
              paddingLeft: 'max(1rem, var(--safe-left))',
              paddingRight: 'max(1rem, var(--safe-right))',
            }}
          >
            <div>
              <BrandLogo size="sm" />
              <p className="mt-1 text-xs text-muted">Find the pattern. Fix the move.</p>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap items-center gap-1 text-sm">
              <TextLink to="/">Home</TextLink>
              <TextLink to="/review">Free review</TextLink>
              <TextLink to="/preview">Preview</TextLink>
              {linkedUsername ? (
                <TextLink to="/results/$username" params={{ username: linkedUsername }}>
                  Results
                </TextLink>
              ) : null}
            </nav>
          </div>
        </footer>
      )}
    </div>
  )
}
