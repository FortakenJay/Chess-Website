import { createFileRoute, Navigate } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { LandingPage } from '@/components/landing/LandingPage'
import { ShellSkeleton } from '@/components/ShellSkeleton'
import { UsernamePrompt } from '@/components/UsernamePrompt'
import { useAuth } from '@/lib/auth'

export const Route = createFileRoute('/')({
  component: HomePage,
})

function HomePage() {
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

  if (user && !profile) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md">
          <UsernamePrompt />
        </div>
      </AppShell>
    )
  }

  return <LandingPage />
}
