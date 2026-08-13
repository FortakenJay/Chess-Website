import { useState } from 'react'
import { lookupPlayer } from '@/lib/chesscom.functions'
import { useAuth } from '@/lib/auth'
import { getBrowserClient } from '@/lib/supabase/browser'
import { isLikelyUsername, normalizeUsername } from '@/lib/username'

export function UsernamePrompt() {
  const { user, refreshProfile } = useAuth()
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
      const { error: writeError } = await getBrowserClient().from('profiles').upsert({
        user_id: user.id,
        chess_com_username: normalizeUsername(player.username),
      })
      if (writeError) throw writeError
      await refreshProfile()
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
        Linked once. After this, any device with this account opens your history.
      </p>
      <input
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        className="border border-line bg-canvas px-3 py-2 font-mono text-sm outline-none focus:border-ink"
        placeholder="hikaru"
        autoCapitalize="off"
        autoCorrect="off"
      />
      {error ? <p className="text-sm text-blunder">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="border border-ink bg-ink px-3 py-2 text-sm text-canvas hover:bg-transparent hover:text-ink disabled:opacity-50"
      >
        {pending ? 'Checking…' : 'Link account'}
      </button>
    </form>
  )
}
