import { useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/browser'

export function SignInForm({ redirectTo }: { redirectTo?: string }) {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    const origin = window.location.origin
    const { error: authError } = await getBrowserClient().auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${origin}/auth/callback${redirectTo ? `?next=${encodeURIComponent(redirectTo)}` : ''}`,
      },
    })
    setPending(false)
    if (authError) {
      setError(authError.message)
      return
    }
    setSent(true)
  }

  if (sent) {
    return (
      <p className="border border-line bg-surface p-4 text-sm text-muted">
        Check {email} for a magic link.
      </p>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label className="text-xs uppercase tracking-wider text-muted">Email</label>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="border border-line bg-canvas px-3 py-2 text-sm outline-none focus:border-ink"
        placeholder="you@example.com"
      />
      {error ? <p className="text-sm text-blunder">{error}</p> : null}
      <button
        type="submit"
        disabled={pending}
        className="border border-ink bg-ink px-3 py-2 text-sm text-canvas hover:bg-transparent hover:text-ink disabled:opacity-50"
      >
        {pending ? 'Sending…' : 'Send magic link'}
      </button>
    </form>
  )
}
