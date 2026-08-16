import { createFileRoute } from '@tanstack/react-router'
import { EndgameInsights } from '@/components/EndgameInsights'
import { usePlayerData } from '@/lib/queries'
import { normalizeUsername } from '@/lib/username'
import { playerHead } from '@/lib/pageTitle'
import { SessionTitle } from '@/lib/useDocumentTitle'

export const Route = createFileRoute('/results/$username/endgames')({
  head: ({ params }) => playerHead('Endgames', params.username),
  component: ResultsEndgames,
})

function ResultsEndgames() {
  const { username } = Route.useParams()
  const name = normalizeUsername(username)
  const query = usePlayerData(name)
  const games = query.data?.games ?? []
  return (
    <>
      <SessionTitle page="Endgames" library={name} />
      {games.length > 0 ? <EndgameInsights username={name} games={games} /> : null}
    </>
  )
}
