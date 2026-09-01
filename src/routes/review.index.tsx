import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { PageHeader, Button, FormField, Panel, fieldControlClass } from '@/components/ui'
import { lookupPlayer } from '@/lib/chesscom.functions'
import { isLikelyUsername, normalizeUsername } from '@/lib/username'
import { titleHead } from '@/lib/pageTitle'

export const Route = createFileRoute('/review/')({
  head: () => titleHead('Review'),
  component: ReviewEntryPage,
})

function ReviewEntryPage() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!isLikelyUsername(username)) {
      setError('Use a Chess.com username, 2–25 characters.')
      return
    }
    setPending(true)
    setError(null)
    try {
      const player = await lookupPlayer({ data: { username } })
      await navigate({
        to: '/review/$username',
        params: { username: normalizeUsername(player.username) },
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not find that player')
    } finally {
      setPending(false)
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Free review"
        description="Pull recent Chess.com games, spot underperforming ones, and analyze move by move with Stockfish. Nothing is written to the database."
      />

      <Panel className="mt-8 max-w-md">
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <FormField id="review-username" label="Chess.com username" error={error ?? undefined}>
            <input
              id="review-username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className={`${fieldControlClass} font-mono`}
              placeholder="hikaru"
              autoCapitalize="off"
              autoCorrect="off"
              autoComplete="off"
              spellCheck={false}
            />
          </FormField>
          <Button type="submit" variant="primary" disabled={pending} className="w-full">
            {pending ? 'Checking…' : 'Load recent games'}
          </Button>
        </form>
      </Panel>
    </AppShell>
  )
}
