import type { ReactNode } from 'react'
import { Link } from '@tanstack/react-router'

const MARKED_CELLS = new Set([3, 11, 18, 27, 28, 35, 36, 45, 52, 60])

export function AuthFrame({
  kind,
  children,
}: {
  kind: 'login' | 'signup'
  children: ReactNode
}) {
  const isLogin = kind === 'login'

  return (
    <div className="w-full max-w-full self-center py-5 sm:max-w-5xl sm:py-10">
      <div className="grid min-w-0 overflow-hidden border border-line bg-surface lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative min-h-72 min-w-0 overflow-hidden border-b border-line p-6 sm:min-h-96 sm:p-10 lg:min-h-[34rem] lg:border-r lg:border-b-0">
          <div
            className="pointer-events-none absolute inset-0 grid grid-cols-8 grid-rows-8 opacity-[0.12]"
            aria-hidden
          >
            {Array.from({ length: 64 }, (_, index) => (
              <span className="grid place-items-center font-mono text-[10px] text-ink" key={index}>
                {MARKED_CELLS.has(index) ? '×' : ''}
              </span>
            ))}
          </div>
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-surface to-transparent" aria-hidden />

          <div className="relative z-10 flex h-full flex-col">
            <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
              {isLogin ? '01 / Player access' : '01 / Build your profile'}
            </p>
            <h1 className="mt-5 max-w-[10ch] font-display text-5xl uppercase leading-[0.9] tracking-[-0.025em] text-ink sm:text-7xl">
              {isLogin ? 'Return to the positions that matter.' : 'Turn repeat mistakes into a training plan.'}
            </h1>
            <p className="mt-5 max-w-md text-sm leading-6 text-muted sm:text-base">
              {isLogin
                ? 'Your analysis, drills, and progress are waiting where you left them.'
                : 'Connect your Chess.com identity. We map the patterns; you drill the right positions.'}
            </p>

            <div className="mt-auto hidden grid-cols-3 border-t border-line pt-5 sm:grid">
              {[
                ['Analyze', 'Every game'],
                ['Isolate', 'Every leak'],
                ['Repeat', 'Until fixed'],
              ].map(([label, detail]) => (
                <div key={label}>
                  <span className="block font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                    {label}
                  </span>
                  <strong className="mt-1 block text-sm font-medium text-bone">{detail}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="flex min-w-0 flex-col justify-center bg-canvas p-6 sm:p-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-accent">
            {isLogin ? 'Welcome back' : 'New player'}
          </p>
          <h2 className="mt-2 font-display text-3xl uppercase leading-none text-ink sm:text-4xl">
            {isLogin ? 'Log in' : 'Create account'}
          </h2>
          <div className="mt-7">{children}</div>
          <p className="mt-7 border-t border-line pt-5 text-sm text-muted">
            {isLogin ? 'New here? ' : 'Already have an account? '}
            <Link
              to={isLogin ? '/signup' : '/login'}
              className="font-medium text-ink underline decoration-accent underline-offset-4"
            >
              {isLogin ? 'Create an account' : 'Log in'}
            </Link>
          </p>
        </section>
      </div>
    </div>
  )
}
