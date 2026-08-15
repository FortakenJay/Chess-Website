import { useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/browser'

const fieldClass = 'border border-line bg-canvas px-3 py-2 text-sm'

export function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    setPending(true)
    setError(null)
    try {
      const { error: authError } = await getBrowserClient().auth.signInWithPassword({
        email,
        password,
      })
      if (authError) setError(authError.message)
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <label htmlFor="auth-email" className="text-sm text-muted">
        Email
      </label>
      <input
        id="auth-email"
        name="email"
        type="email"
        required
        autoComplete="email"
        spellCheck={false}
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className={fieldClass}
        placeholder="you@example.com"
      />
      <label htmlFor="auth-password" className="text-sm text-muted">
        Password
      </label>
      <input
        id="auth-password"
        name="password"
        type="password"
        required
        autoComplete="current-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={fieldClass}
      />
      {error ? (
        <p className="text-sm text-blunder" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 border border-ink bg-ink px-3 py-2 text-sm text-canvas hover:bg-transparent hover:text-ink disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Log in'}
      </button>
    </form>
  )
}
