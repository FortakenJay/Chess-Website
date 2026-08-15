import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { lookupPlayer } from '@/lib/chesscom.functions'
import { useAuth } from '@/lib/auth'
import { linkChessUsername } from '@/lib/profile'
import { getBrowserClient } from '@/lib/supabase/browser'
import { isLikelyUsername, normalizeUsername } from '@/lib/username'

const fieldClass = 'min-h-11 w-full border border-line bg-canvas px-3 text-base sm:text-sm'
const MIN_PASSWORD = 8
const MAX_PASSWORD = 72

const COMMON_PASSWORDS = new Set([
  'password',
  'password1',
  'password12',
  'password123',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'letmein1',
  'welcome1',
  'iloveyou',
  'admin123',
  'monkey12',
  'dragon12',
  'chess123',
  'hikaru12',
])

type FieldErrors = {
  name?: string
  email?: string
  username?: string
  password?: string
  confirm?: string
}

function passwordIssue(password: string, email: string, username: string): string | null {
  if (password.length < MIN_PASSWORD) return `Use at least ${MIN_PASSWORD} characters.`
  if (password.length > MAX_PASSWORD) return `Use at most ${MAX_PASSWORD} characters.`
  const lower = password.toLowerCase()
  if (COMMON_PASSWORDS.has(lower)) return 'That password is too common. Choose another.'
  const local = email.split('@')[0]?.toLowerCase() ?? ''
  if (local.length >= 4 && lower.includes(local)) return 'Do not use your email address in the password.'
  if (username.length >= 4 && lower.includes(username.toLowerCase())) {
    return 'Do not use your Chess.com username in the password.'
  }
  return null
}

function Field({
  id,
  label,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  hint?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm text-muted">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-blunder" role="alert">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  )
}

export function SignupForm() {
  const { refreshProfile } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [needsEmail, setNeedsEmail] = useState(false)

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    const trimmedName = name.trim()
    const trimmedEmail = email.trim()
    const trimmedUsername = username.trim()

    if (trimmedName.length < 2) next.name = 'Enter your full name.'
    else if (trimmedName.length > 80) next.name = 'Keep the name under 80 characters.'

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      next.email = 'Enter a valid email address.'
    }

    if (!isLikelyUsername(trimmedUsername)) {
      next.username = 'Chess.com usernames are 2-25 letters, numbers, _ or -.'
    }

    const passwordError = passwordIssue(password, trimmedEmail, trimmedUsername)
    if (passwordError) next.password = passwordError

    if (!confirm) next.confirm = 'Re-enter the password.'
    else if (password !== confirm) next.confirm = 'Passwords do not match.'

    return next
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault()
    const nextErrors = validate()
    setFieldErrors(nextErrors)
    setError(null)
    if (Object.keys(nextErrors).length > 0) return

    setPending(true)
    try {
      const player = await lookupPlayer({ data: { username } })
      const handle = normalizeUsername(player.username)
      const supabase = getBrowserClient()
      const { data, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim(),
            chess_com_username: handle,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(
            `/analyze/${handle}`,
          )}`,
        },
      })
      if (authError) throw authError
      if (!data.session) {
        setNeedsEmail(true)
        return
      }
      await linkChessUsername(handle)
      await refreshProfile()
      await navigate({ to: '/analyze/$username', params: { username: handle } })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the account')
    } finally {
      setPending(false)
    }
  }

  if (needsEmail) {
    return (
      <p className="text-sm text-muted" role="status">
        Check {email.trim()} to confirm the account, then come back and log in.
      </p>
    )
  }

  const passwordType = showPassword ? 'text' : 'password'

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Field id="signup-name" label="Full name" error={fieldErrors.name}>
        <input
          id="signup-name"
          name="name"
          type="text"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => {
            setName(e.target.value)
            if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: undefined }))
          }}
          className={fieldClass}
          aria-invalid={Boolean(fieldErrors.name)}
          aria-describedby={fieldErrors.name ? 'signup-name-error' : undefined}
        />
      </Field>

      <Field id="signup-email" label="Email" error={fieldErrors.email}>
        <input
          id="signup-email"
          name="email"
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }))
          }}
          className={fieldClass}
          autoComplete="email"
          inputMode="email"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          aria-invalid={Boolean(fieldErrors.email)}
          aria-describedby={fieldErrors.email ? 'signup-email-error' : undefined}
        />
      </Field>

      <Field
        id="signup-username"
        label="Chess.com username"
        hint="Must match your public Chess.com profile."
        error={fieldErrors.username}
      >
        <input
          id="signup-username"
          name="chesscom-username"
          required
          value={username}
          onChange={(e) => {
            setUsername(e.target.value)
            if (fieldErrors.username) setFieldErrors((prev) => ({ ...prev, username: undefined }))
          }}
          className={`${fieldClass} font-mono`}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          aria-invalid={Boolean(fieldErrors.username)}
          aria-describedby={
            fieldErrors.username ? 'signup-username-error' : 'signup-username-hint'
          }
        />
      </Field>

      <Field
        id="signup-password"
        label="Password"
        hint={`At least ${MIN_PASSWORD} characters.`}
        error={fieldErrors.password}
      >
        <div className="relative">
          <input
            id="signup-password"
            name="password"
            type={passwordType}
            required
            minLength={MIN_PASSWORD}
            maxLength={MAX_PASSWORD}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }))
            }}
            className={`${fieldClass} pr-14`}
            autoComplete="new-password"
            spellCheck={false}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={
              fieldErrors.password ? 'signup-password-error' : 'signup-password-hint'
            }
          />
          <button
            type="button"
            className="absolute top-1/2 right-1 -translate-y-1/2 inline-flex min-h-11 min-w-11 items-center justify-center px-2 text-xs text-muted hover:text-ink"
            onClick={() => setShowPassword((value) => !value)}
            aria-pressed={showPassword}
            aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </Field>

      <Field id="signup-confirm" label="Confirm password" error={fieldErrors.confirm}>
        <input
          id="signup-confirm"
          name="password-confirm"
          type={passwordType}
          required
          minLength={MIN_PASSWORD}
          maxLength={MAX_PASSWORD}
          value={confirm}
          onChange={(e) => {
            setConfirm(e.target.value)
            if (fieldErrors.confirm) setFieldErrors((prev) => ({ ...prev, confirm: undefined }))
          }}
          className={fieldClass}
          autoComplete="new-password"
          spellCheck={false}
          aria-invalid={Boolean(fieldErrors.confirm)}
          aria-describedby={fieldErrors.confirm ? 'signup-confirm-error' : undefined}
        />
      </Field>

      {error ? (
        <p className="text-sm text-blunder" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex min-h-11 items-center justify-center border border-ink bg-ink px-3 text-sm text-canvas hover:bg-transparent hover:text-ink disabled:opacity-50"
      >
        {pending ? 'Creating account…' : 'Create account'}
      </button>
    </form>
  )
}
