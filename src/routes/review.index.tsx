import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { PageHeader, ErrorText } from '@/components/ui'
import { lookupPlayer } from '@/lib/chesscom.functions'
import { isLikelyUsername, normalizeUsername } from '@/lib/username'
import { titleHead } from '@/lib/pageTitle'
import { btnPrimary } from '@/components/review/reviewUi'
import { cn } from '@/lib/cn'

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

      <form
        onSubmit={onSubmit}
        className="mt-8 flex max-w-md flex-col gap-3 border border-line bg-surface p-5"
      >
        <label htmlFor="review-username" className="font-mono text-xs uppercase tracking-wider text-muted">
          Chess.com username
        </label>
        <input
          id="review-username"
          name="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="min-h-11 border border-line bg-canvas px-3 font-mono text-base sm:text-sm"
          placeholder="hikaru"
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
        />
        {error ? <ErrorText>{error}</ErrorText> : null}
        <button
          type="submit"
          disabled={pending}
          className={cn(btnPrimary, 'inline-flex min-h-11 items-center justify-center px-3 text-sm')}
        >
          {pending ? 'Checking…' : 'Load recent games'}
        </button>
      </form>
    </AppShell>
  )
}
