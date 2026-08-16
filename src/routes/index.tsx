import { createFileRoute, Navigate } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { LandingPage } from '@/components/landing/LandingPage'
import { ShellSkeleton } from '@/components/ShellSkeleton'
import { UsernamePrompt } from '@/components/UsernamePrompt'
import { useAuth } from '@/lib/auth'
import { SessionTitle } from '@/lib/useDocumentTitle'

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ title: 'leak — chess error analysis' }],
  }),
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
        <SessionTitle page="Link Chess.com" library="" />
        <div className="mx-auto max-w-md">
          <UsernamePrompt />
        </div>
      </AppShell>
    )
  }

  return <LandingPage />
}
