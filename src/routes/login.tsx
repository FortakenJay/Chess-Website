import { createFileRoute, Link, Navigate } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { ShellSkeleton } from '@/components/ShellSkeleton'
import { SignInForm } from '@/components/SignInForm'
import { useAuth } from '@/lib/auth'

export const Route = createFileRoute('/login')({
  component: LoginPage,
})

function LoginPage() {
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
    <AppShell>
      <div className="mx-auto max-w-sm pt-10">
        <h1 className="mb-6 text-2xl font-medium tracking-tight">Log in</h1>
        <SignInForm />
        <p className="mt-6 text-sm text-muted">
          New here?{' '}
          <Link to="/signup" className="text-ink underline-offset-4 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </AppShell>
  )
}
