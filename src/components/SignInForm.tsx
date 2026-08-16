import { useState } from 'react'
import { getBrowserClient } from '@/lib/supabase/browser'
import { Button, fieldControlClass, fieldLabelClass } from '@/components/ui'

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
      <label htmlFor="auth-email" className={fieldLabelClass}>
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
        className={fieldControlClass}
        placeholder="you@example.com"
      />
      <label htmlFor="auth-password" className={fieldLabelClass}>
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
        className={fieldControlClass}
        placeholder="Enter your password…"
      />
      {error ? (
        <p className="text-sm text-blunder-text" role="alert">
          {error}
        </p>
      ) : null}
      <Button
        type="submit"
        disabled={pending}
        className="mt-1 w-full"
      >
        {pending ? 'Signing in…' : 'Log in'}
      </Button>
    </form>
  )
}
