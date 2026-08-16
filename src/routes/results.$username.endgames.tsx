import { createFileRoute } from '@tanstack/react-router'
import { EndgameInsights } from '@/components/EndgameInsights'
import { usePlayerData } from '@/lib/queries'
import { normalizeUsername } from '@/lib/username'

export const Route = createFileRoute('/results/$username/endgames')({
  component: ResultsEndgames,
})

function ResultsEndgames() {
  const { username } = Route.useParams()
  const name = normalizeUsername(username)
  const query = usePlayerData(name)
  const games = query.data?.games ?? []
  if (games.length === 0) return null
  return <EndgameInsights username={name} games={games} />
}
