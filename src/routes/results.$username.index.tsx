import { createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense, useState } from 'react'
import { ResultsSkeleton, SegmentedControl } from '@/components/ui'
import { usePlayerData } from '@/lib/queries'
import { useResultsModel } from '@/lib/resultsModel'
import { TIMEFRAME_LABEL, type Timeframe } from '@/lib/stats'
import { normalizeUsername } from '@/lib/username'
import { playerHead } from '@/lib/pageTitle'
import { SessionTitle } from '@/lib/useDocumentTitle'

const ResultsCharts = lazy(() =>
  import('@/components/ResultsCharts').then((mod) => ({ default: mod.ResultsCharts })),
)

export const Route = createFileRoute('/results/$username/')({
  head: ({ params }) => playerHead('Results', params.username),
  component: ResultsOverview,
})

function ResultsOverview() {
  const { username } = Route.useParams()
  const name = normalizeUsername(username)
  const query = usePlayerData(name)
  const [timeframe, setTimeframe] = useState<Timeframe>('month')
  const games = query.data?.games ?? []
  const positions = query.data?.positions ?? []
  const attempts = query.data?.attempts ?? []
  const model = useResultsModel(games, positions, attempts, timeframe)

  return (
    <>
      <SessionTitle page="Results" library={name} />
      <SegmentedControl
        label="Results timeframe"
        value={timeframe}
        onChange={setTimeframe}
        className="mt-4 sm:mt-4"
        options={(Object.keys(TIMEFRAME_LABEL) as Timeframe[]).map((value) => ({
          value,
          label: TIMEFRAME_LABEL[value],
        }))}
      />
      <Suspense fallback={<ResultsSkeleton className="mt-6" />}>
        <ResultsCharts model={model} timeframe={timeframe} />
      </Suspense>
    </>
  )
}
