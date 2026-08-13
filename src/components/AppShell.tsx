import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'
import { useAuth } from '@/lib/auth'
import { getBrowserClient } from '@/lib/supabase/browser'

export function AppShell({
  username,
  children,
}: {
  username?: string
  children: ReactNode
}) {
  const { ready, user, profile } = useAuth()
  const owner = Boolean(
    username && profile?.chess_com_username === username.toLowerCase(),
  )

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <div className="flex items-center gap-6">
            <Link to="/" className="font-mono text-sm tracking-[0.2em] text-ink">
              LEAK
            </Link>
            {username ? (
              <nav className="flex items-center gap-4 text-sm text-muted">
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
            ) : null}
          </div>
          <div className="flex items-center gap-3 font-mono text-xs text-muted">
            {username ? <span>{username}</span> : null}
            {ready && user ? (
              <button
                type="button"
                className="border border-line px-2 py-1 text-ink hover:bg-surface-2"
                onClick={() => getBrowserClient().auth.signOut()}
              >
                Sign out
              </button>
            ) : (
              <span>guest</span>
            )}
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  )
}
