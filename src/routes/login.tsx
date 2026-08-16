import { createFileRoute, Navigate } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { AuthFrame } from '@/components/AuthFrame'
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
      <AuthFrame kind="login">
        <SignInForm />
      </AuthFrame>
    </AppShell>
  )
}
