import { createFileRoute, Navigate } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { AuthFrame } from '@/components/AuthFrame'
import { ShellSkeleton } from '@/components/ShellSkeleton'
import { SignupForm } from '@/components/SignupForm'
import { useAuth } from '@/lib/auth'
import { titleHead } from '@/lib/pageTitle'

export const Route = createFileRoute('/signup')({
  head: () => titleHead('Sign up'),
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
      <AuthFrame kind="signup">
        <SignupForm />
      </AuthFrame>
    </AppShell>
  )
}
