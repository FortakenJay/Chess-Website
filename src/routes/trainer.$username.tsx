import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { OpeningTrainer } from '@/components/OpeningTrainer'
import { BoardPageSkeleton, PageHeader } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useOpeningTrainer } from '@/lib/openings/useOpeningTrainer'
import { normalizeUsername } from '@/lib/username'
import { playerHead } from '@/lib/pageTitle'

type TrainerSearch = {
  tab?: 'openings' | 'structures'
  structure?: string
}

export const Route = createFileRoute('/trainer/$username')({
  head: ({ params, match }) =>
    playerHead(match.search.tab === 'structures' ? 'Structures' : 'Trainer', params.username),
  validateSearch: (search: Record<string, unknown>): TrainerSearch => ({
    tab: search.tab === 'structures' || search.tab === 'openings' ? search.tab : undefined,
    structure: typeof search.structure === 'string' ? search.structure : undefined,
  }),
  component: TrainerPage,
})

function TrainerPage() {
  const { username } = Route.useParams()
  const { tab, structure } = Route.useSearch()
  const name = normalizeUsername(username)
  const { ready } = useAuth()
  const trainer = useOpeningTrainer(name)
  const boardMode = trainer.phase === 'recall' || trainer.phase === 'reason' || trainer.phase === 'lesson'

  return (
    <AppShell username={name} dense={boardMode}>
      {!ready || trainer.phase === 'loading' ? (
        <BoardPageSkeleton label="Loading opening trainer" className="mt-0" />
      ) : (
        <div
          className={
            boardMode
              ? 'flex flex-col lg:min-h-0 lg:flex-1 lg:overflow-hidden'
              : 'flex flex-1 flex-col'
          }
        >
          {boardMode ? null : (
            <PageHeader
              className="shrink-0 pb-3"
              title="Opening trainer"
              username={name}
              description="Train White or Black, or learn the pawn structures the openings become."
            />
          )}
          <div className={boardMode ? 'lg:min-h-0 lg:h-full lg:overflow-hidden' : 'min-w-0'}>
            <OpeningTrainer trainer={trainer} username={name} tab={tab} structure={structure} />
          </div>
        </div>
      )}
    </AppShell>
  )
}
