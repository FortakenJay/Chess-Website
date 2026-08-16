import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { lookupPlayer } from '@/lib/chesscom.functions'
import { useAuth } from '@/lib/auth'
import { linkChessUsername } from '@/lib/profile'
import { isLikelyUsername, normalizeUsername } from '@/lib/username'
import { Button, fieldControlClass } from '@/components/ui'

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
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4 border border-line border-l-4 border-l-accent bg-surface p-5 sm:p-7">
      <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent">Connect account</p>
      <h2 className="font-display text-3xl uppercase leading-none text-ink">Chess.com username</h2>
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
        className={`${fieldControlClass} font-mono`}
        placeholder="chess.com handle"
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
      />
      {error ? (
        <p className="text-sm text-blunder-text" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={pending}
        className="w-full"
      >
        {pending ? 'Checking…' : 'Link and import games'}
      </Button>
    </form>
  )
}
