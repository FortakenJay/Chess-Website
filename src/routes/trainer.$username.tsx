import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { OpeningTrainer, parseTrainerTab, type TrainerTab } from '@/components/OpeningTrainer'
import { BoardPageSkeleton, PageHeader } from '@/components/ui'
import { useAuth } from '@/lib/auth'
import { useOpeningTrainer } from '@/lib/openings/useOpeningTrainer'
import { normalizeUsername } from '@/lib/username'
import { playerHead } from '@/lib/pageTitle'

type TrainerSearch = {
  tab?: TrainerTab | 'openings'
  structure?: string
}

const HEADER: Record<TrainerTab, { title: string; description: string }> = {
  theory: {
    title: 'Theory',
    description: 'Openings you already play. Weak spots skip the lesson. Dual-score keeps the weaker skill due.',
  },
  learn: {
    title: 'Learn',
    description: 'Pick a new line. Frequency-first lesson, then master it from memory.',
  },
  foundations: {
    title: 'Foundations',
    description: 'Principles before a full repertoire. Same roadmap — playing a game does not mark a node done.',
  },
  endgames: {
    title: 'Endgames',
    description: 'Your leaked endings, then the technique track.',
  },
  structures: {
    title: 'Structures',
    description: 'Pawn skeletons the openings become. Identity is the pawn-only FEN.',
  },
}

export const Route = createFileRoute('/trainer/$username')({
  head: ({ params, match }) =>
    playerHead(HEADER[parseTrainerTab(match.search.tab)].title, params.username),
  validateSearch: (search: Record<string, unknown>): TrainerSearch => {
    const tab = parseTrainerTab(typeof search.tab === 'string' ? search.tab : undefined)
    return {
      tab: search.tab === 'openings' ? 'theory' : tab,
      structure: typeof search.structure === 'string' ? search.structure : undefined,
    }
  },
  component: TrainerPage,
})

function TrainerPage() {
  const { username } = Route.useParams()
  const { tab, structure } = Route.useSearch()
  const navigate = Route.useNavigate()
  const name = normalizeUsername(username)
  const { ready } = useAuth()
  const trainer = useOpeningTrainer(name)
  const boardMode = trainer.phase === 'recall' || trainer.phase === 'reason' || trainer.phase === 'lesson'
  const module = parseTrainerTab(tab)
  const header = HEADER[module]

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
              title={header.title}
              username={name}
              description={header.description}
            />
          )}
          <div className={boardMode ? 'lg:min-h-0 lg:h-full lg:overflow-hidden' : 'min-w-0'}>
            <OpeningTrainer
              trainer={trainer}
              username={name}
              tab={tab}
              structure={structure}
              onTabChange={(next) => {
                void navigate({
                  search: (prev) => ({
                    ...prev,
                    tab: next,
                    structure: next === 'structures' ? prev.structure : undefined,
                  }),
                })
              }}
            />
          </div>
        </div>
      )}
    </AppShell>
  )
}
