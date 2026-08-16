import { createFileRoute } from '@tanstack/react-router'
import { OpeningRepertoire } from '@/components/OpeningRepertoire'
import { usePlayerData } from '@/lib/queries'
import { normalizeUsername } from '@/lib/username'

export const Route = createFileRoute('/results/$username/openings')({
  component: ResultsOpenings,
})

function ResultsOpenings() {
  const { username } = Route.useParams()
  const name = normalizeUsername(username)
  const query = usePlayerData(name)
  const games = query.data?.games ?? []
  if (games.length === 0) return null
  return <OpeningRepertoire username={name} games={games} />
}
