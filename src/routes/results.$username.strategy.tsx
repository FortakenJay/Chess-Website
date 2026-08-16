import { createFileRoute } from '@tanstack/react-router'
import { StrategyInsights } from '@/components/StrategyInsights'
import { usePlayerData } from '@/lib/queries'
import { normalizeUsername } from '@/lib/username'

export const Route = createFileRoute('/results/$username/strategy')({
  component: ResultsStrategy,
})

function ResultsStrategy() {
  const { username } = Route.useParams()
  const name = normalizeUsername(username)
  const query = usePlayerData(name)
  const games = query.data?.games ?? []
  if (games.length === 0) return null
  return <StrategyInsights username={name} games={games} />
}
