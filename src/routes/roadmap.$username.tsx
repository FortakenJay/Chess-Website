import { createFileRoute } from '@tanstack/react-router'
import { AppShell } from '@/components/AppShell'
import { ChessRoadmap } from '@/components/ChessRoadmap'
import { PageHeader } from '@/components/ui'
import { roadmapNodeById } from '@/lib/roadmap/topics'
import { normalizeUsername } from '@/lib/username'
import { playerHead } from '@/lib/pageTitle'

type RoadmapSearch = {
  node?: string
}

export const Route = createFileRoute('/roadmap/$username')({
  validateSearch: (search: Record<string, unknown>): RoadmapSearch => ({
    node: typeof search.node === 'string' ? search.node : undefined,
  }),
  head: ({ params, match }) =>
    playerHead('Roadmap', params.username, match.search.node ? roadmapNodeById(match.search.node)?.title : undefined),
  component: RoadmapPage,
})

function RoadmapPage() {
  const { username } = Route.useParams()
  const { node } = Route.useSearch()
  const name = normalizeUsername(username)

  return (
    <AppShell username={name}>
      <PageHeader
        title="Roadmap"
        username={name}
        description="Named openings, structures, and endgames. Playing a line does not mark it done — you do."
      />
      <ChessRoadmap username={name} selectedId={node} />
    </AppShell>
  )
}
