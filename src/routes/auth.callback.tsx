import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useEffect } from 'react'
import { getBrowserClient } from '@/lib/supabase/browser'
import { titleHead } from '@/lib/pageTitle'

export const Route = createFileRoute('/auth/callback')({
  head: () => titleHead('Signing in'),
  component: AuthCallback,
})

function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    const next = url.searchParams.get('next') || '/'
    const supabase = getBrowserClient()

    async function run() {
      if (code) {
        await supabase.auth.exchangeCodeForSession(code)
      }
      navigate({ to: next as '/' })
    }

    run()
  }, [navigate])

  return (
    <div className="flex min-h-screen items-center justify-center font-mono text-xs text-muted">
      Completing sign-in…
    </div>
  )
}
