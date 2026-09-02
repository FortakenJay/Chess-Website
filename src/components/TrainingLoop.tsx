import { ButtonLink, Callout, Kicker } from '@/components/ui'
import { trainingLoop, type LoopAction, type LoopGame, type LoopPosition } from '@/lib/trainingLoop'
import type { Headline } from '@/lib/stats'

function StepCta({
  username,
  action,
  variant,
}: {
  username: string
  action: LoopAction
  variant: 'primary' | 'secondary'
}) {
  const params = { username }
  if (action.to === '/drill/$username') {
    return (
      <ButtonLink variant={variant} className="w-full sm:w-auto" to={action.to} params={params} search={action.search}>
        {action.label}
      </ButtonLink>
    )
  }
  if (action.to === '/trainer/$username') {
    return (
      <ButtonLink variant={variant} className="w-full sm:w-auto" to={action.to} params={params} search={action.search}>
        {action.label}
      </ButtonLink>
    )
  }
  return (
    <ButtonLink variant={variant} className="w-full sm:w-auto" to={action.to} params={params}>
      {action.label}
    </ButtonLink>
  )
}

export function TrainingLoop({
  username,
  headline,
  games,
  positions,
}: {
  username: string
  headline: Headline | null
  games: LoopGame[]
  positions: LoopPosition[]
}) {
  const steps = trainingLoop({ headline, games, positions })
  return (
    <Callout className="mt-6">
      <Kicker tone="accent">The loop</Kicker>
      <h2 className="mt-3 max-w-[18ch] font-display text-4xl uppercase leading-[0.92] text-ink sm:text-5xl">
        Find it. Hide it. Play it.
      </h2>
      <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
        Import is done. This is the rest of the room: leak, line, tactics, conversion, review.
        Same routes — one walk.
      </p>
      <ol className="mt-6 list-none divide-y divide-line border border-line bg-canvas p-0">
        {steps.map((step, index) => (
          <li key={step.id} className="px-4 py-4 sm:px-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-accent">
              {index + 1} · {step.kicker}
            </p>
            <h3 className="mt-2 font-display text-2xl uppercase leading-none text-ink">{step.title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{step.body}</p>
            <div className="mt-4 flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
              <StepCta username={username} action={step.primary} variant="primary" />
              {step.secondary ? (
                <StepCta username={username} action={step.secondary} variant="secondary" />
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </Callout>
  )
}
