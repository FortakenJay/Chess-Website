import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { ShellSkeleton } from '@/components/ShellSkeleton'
import { SignupForm } from '@/components/SignupForm'
import { useAuth } from '@/lib/auth'

export const Route = createFileRoute('/signup')({
  component: SignupPage,
})

function SignupPage() {
  const { ready, user, profile } = useAuth()

  if (!ready) {
    return (
      <AppShell>
        <ShellSkeleton />
      </AppShell>
    )
  }

  if (user && profile?.chess_com_username) {
    return <Navigate to="/results/$username" params={{ username: profile.chess_com_username }} />
  }

  if (user) {
    return <Navigate to="/" />
  }

  return (
    <AppShell hideSignup>
      <div className="mx-auto max-w-md pt-10">
        <h1 className="text-2xl font-medium tracking-tight">Create an account</h1>
        <p className="mt-2 mb-6 text-sm text-muted">
          Use your email and password. Link a Chess.com username so analysis follows this account.
        </p>
        <SignupForm />
        <p className="mt-6 text-sm text-muted">
          Already have an account?{' '}
          <Link to="/login" className="text-ink underline-offset-4 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </AppShell>
  )
}
