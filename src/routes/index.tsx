import { createFileRoute, Navigate, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { SignInForm } from '@/components/SignInForm'
import { UsernamePrompt } from '@/components/UsernamePrompt'
import { useAuth } from '@/lib/auth'
import { isLikelyUsername, normalizeUsername } from '@/lib/username'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
  const { ready, user, profile } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')

  if (!ready) {
    return (
      <AppShell>
        <p className="font-mono text-xs text-muted">Loading session…</p>
      </AppShell>
    )
  }

  if (user && profile?.chess_com_username) {
    return <Navigate to="/results/$username" params={{ username: profile.chess_com_username }} />
  }

  return (
    <AppShell>
      <div className="grid gap-10 lg:grid-cols-2">
        <section className="max-w-lg">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-muted">Personal analysis</p>
          <h1 className="mt-3 text-3xl font-medium tracking-tight">
            Where you lose rating, verified by the engine.
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-muted">
            Phase, motif, clock, color. Then drill the positions you actually played — not a random puzzle
            set. History follows the account, not the browser.
          </p>
          <form
            className="mt-8 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault()
              if (!isLikelyUsername(username)) return
              navigate({
                to: '/results/$username',
                params: { username: normalizeUsername(username) },
              })
            }}
          >
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Chess.com username"
              className="min-w-0 flex-1 border border-line bg-surface px-3 py-2 font-mono text-sm outline-none focus:border-ink"
            />
            <button
              type="submit"
              className="border border-ink px-3 py-2 text-sm hover:bg-ink hover:text-canvas"
            >
              Preview
            </button>
          </form>
          <p className="mt-2 text-xs text-muted">Read-only if that username has been synced before.</p>
        </section>
        <section className="border border-line bg-surface p-5">
          {user && !profile ? (
            <UsernamePrompt />
          ) : (
            <>
              <h2 className="text-xs uppercase tracking-wider text-muted">Sign in</h2>
              <p className="mt-2 mb-4 text-sm text-muted">
                Magic link. Saves history and turns on the daily incremental sync.
              </p>
              <SignInForm />
            </>
          )}
        </section>
      </div>
    </AppShell>
  )
}
