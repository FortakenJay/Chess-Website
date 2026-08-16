import { createFileRoute } from '@tanstack/react-router'
import { StrategyInsights } from '@/components/StrategyInsights'
import { usePlayerData } from '@/lib/queries'
import { normalizeUsername } from '@/lib/username'
import { playerHead } from '@/lib/pageTitle'
import { SessionTitle } from '@/lib/useDocumentTitle'

export const Route = createFileRoute('/results/$username/strategy')({
  head: ({ params }) => playerHead('Strategy', params.username),
  component: ResultsStrategy,
})

function ResultsStrategy() {
  const { username } = Route.useParams()
  const name = normalizeUsername(username)
  const query = usePlayerData(name)
  const games = query.data?.games ?? []
  return (
    <>
      <SessionTitle page="Strategy" library={name} />
      {games.length > 0 ? <StrategyInsights username={name} games={games} /> : null}
    </>
  )
}
