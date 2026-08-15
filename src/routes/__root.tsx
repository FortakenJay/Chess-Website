import type { ReactNode } from 'react'
import {
  createRootRouteWithContext,
  HeadContent,
  Outlet,
  Scripts,
} from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'
import { AuthProvider } from '@/lib/auth'
import { BackgroundSyncProvider } from '@/lib/backgroundSync'
import appCss from '../styles.css?url'

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
      { title: 'leak - chess error analysis' },
      {
        name: 'description',
        content: 'Engine-verified breakdown of where you lose rating, drilled on your own mistakes.',
      },
    ],
    links: [
      { rel: 'stylesheet', href: appCss },
      { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
      { rel: 'icon', type: 'image/png', href: '/favicon.png' },
      { rel: 'apple-touch-icon', href: '/leek-logo.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600&display=swap',
      },
    ],
  }),
  component: RootComponent,
  notFoundComponent: () => (
    <div className="flex min-h-screen items-center justify-center font-mono text-sm text-muted">
      Not found
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="flex min-h-screen flex-col items-center justify-center gap-2 font-mono text-sm">
      <p className="text-blunder">Error</p>
      <p className="text-muted">{error.message}</p>
    </div>
  ),
})

function RootComponent() {
  return (
    <AuthProvider>
      <RootDocument>
        <BackgroundSyncProvider>
          <Outlet />
        </BackgroundSyncProvider>
      </RootDocument>
    </AuthProvider>
  )
}

function RootDocument({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="bg-canvas">
      <head>
        <HeadContent />
      </head>
      <body className="bg-canvas text-ink antialiased">
        {children}
        <Scripts />
      </body>
    </html>
  )
}
