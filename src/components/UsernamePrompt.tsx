import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { lookupPlayer } from '@/lib/chesscom.functions'
import { useAuth } from '@/lib/auth'
import { linkChessUsername } from '@/lib/profile'
import { isLikelyUsername, normalizeUsername } from '@/lib/username'
import { Button, Callout, FormField, Kicker, fieldControlClass } from '@/components/ui'

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
    <form onSubmit={onSubmit} className="max-w-md">
      <Callout className="flex flex-col gap-4">
        <Kicker tone="accent">Connect account</Kicker>
        <h2 className="font-display text-3xl uppercase leading-none text-ink">Chess.com username</h2>
        <p className="text-sm text-muted">
          We will verify the username, download your games, and save the analysis in batches.
        </p>
        <FormField id="link-username" label="Chess.com username" error={error ?? undefined}>
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
        </FormField>
        <Button type="submit" variant="primary" disabled={pending} className="w-full">
          {pending ? 'Checking…' : 'Link and import games'}
        </Button>
      </Callout>
    </form>
  )
}
