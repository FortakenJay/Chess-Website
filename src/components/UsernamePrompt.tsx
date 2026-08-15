import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { lookupPlayer } from '@/lib/chesscom.functions'
import { useAuth } from '@/lib/auth'
import { linkChessUsername } from '@/lib/profile'
import { isLikelyUsername, normalizeUsername } from '@/lib/username'

export function UsernamePrompt() {
  const { user, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!user) return
    if (!isLikelyUsername(username)) {
      setError('Use the Chess.com username, 2–25 characters.')
      return
    }
    setPending(true)
    setError(null)
    try {
      const player = await lookupPlayer({ data: { username } })
      const handle = normalizeUsername(player.username)
      await linkChessUsername(handle)
      await refreshProfile()
      await navigate({ to: '/analyze/$username', params: { username: handle } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not link that username')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-3 border border-line bg-surface p-5">
      <h2 className="text-sm uppercase tracking-wider text-muted">Chess.com username</h2>
      <p className="text-sm text-muted">
        We will verify the username, download your games, and save the analysis in batches.
      </p>
      <label htmlFor="link-username" className="sr-only">
        Chess.com username
      </label>
      <input
        id="link-username"
        name="username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="min-h-11 border border-line bg-canvas px-3 font-mono text-base sm:text-sm"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
      />
      {error ? (
        <p className="text-sm text-blunder" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center border border-ink bg-ink px-3 text-sm text-canvas hover:bg-transparent hover:text-ink disabled:opacity-50"
      >
        {pending ? 'Checking…' : 'Link and import games'}
      </button>
    </form>
  )
}
