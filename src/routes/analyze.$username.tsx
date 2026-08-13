import { createFileRoute, Link } from '@tanstack/react-router'
import { useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/AppShell'
import { ProgressPanel } from '@/components/ProgressPanel'
import { getAnalyzeWorker } from '@/lib/analyzeClient'
import { listArchives, listMonthGames } from '@/lib/chesscom.functions'
import type { ChessComGame } from '@/lib/chesscom'
import { useAuth } from '@/lib/auth'
import { persistGames } from '@/lib/persist'
import { getBrowserClient } from '@/lib/supabase/browser'
import { normalizeUsername } from '@/lib/username'
import type { WorkerResponse } from '@/workers/analyze.worker'
import type { GameAnalysis } from '@/lib/analysis/types'

export const Route = createFileRoute('/analyze/$username')({
  component: AnalyzePage,
})

function AnalyzePage() {
  const { username } = Route.useParams()
  const name = normalizeUsername(username)
  const { ready, profile } = useAuth()
  const owner = profile?.chess_com_username === name
  const [status, setStatus] = useState('Checking archives…')
  const [done, setDone] = useState(0)
  const [total, setTotal] = useState(0)
  const [flagged, setFlagged] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [finished, setFinished] = useState(false)
  const started = useRef(false)

  useEffect(() => {
    if (!ready || !owner || started.current) return
    started.current = true
    run()

    async function run() {
      const supabase = getBrowserClient()
      const worker = getAnalyzeWorker()
      try {
        const { data: sync } = await supabase
          .from('sync_state')
          .select('*')
          .eq('username', name)
          .maybeSingle()
        const since = sync?.last_game_end_time ?? undefined
        const archives = await listArchives({ data: { username: name } })
        const months = since
          ? archives.filter((a) => {
              const stamp = Date.UTC(a.year, a.month - 1, 1) / 1000
              return stamp + 32 * 86400 >= since
            })
          : archives

        setStatus(`Fetching ${months.length} month${months.length === 1 ? '' : 's'} from Chess.com…`)
        const games: ChessComGame[] = []
        for (const month of months) {
          setStatus(`Fetching ${month.year}-${String(month.month).padStart(2, '0')}`)
          const batch = await listMonthGames({
            data: { username: name, year: month.year, month: month.month, since },
          })
          games.push(...batch)
          await new Promise((r) => setTimeout(r, 150))
        }

        if (games.length === 0) {
          setStatus('No new games.')
          setFinished(true)
          return
        }

        setTotal(games.length)
        setStatus(`Analyzing ${games.length} games in the browser…`)

        await new Promise<void>((resolve, reject) => {
          const onMessage = async (event: MessageEvent<WorkerResponse>) => {
            const data = event.data
            if (data.type === 'progress') {
              setDone(data.gamesDone)
              setTotal(data.gamesTotal)
              if (data.currentUrl) setStatus(data.currentUrl)
            }
            if (data.type === 'game') {
              setFlagged((n) => n + data.analysis.flagged.length)
              try {
                await persistGames(supabase, [data.analysis as GameAnalysis])
              } catch (err) {
                worker.removeEventListener('message', onMessage)
                reject(err)
              }
            }
            if (data.type === 'done') {
              worker.removeEventListener('message', onMessage)
              resolve()
            }
            if (data.type === 'error') {
              worker.removeEventListener('message', onMessage)
              reject(new Error(data.message))
            }
          }
          worker.addEventListener('message', onMessage)
          worker.postMessage({ type: 'analyze', games, username: name, movetime: 80 })
        })

        setStatus('Stored.')
        setFinished(true)
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err))
      }
    }
  }, [ready, owner, name])

  return (
    <AppShell username={name}>
      <h1 className="font-mono text-xs uppercase tracking-[0.2em] text-muted">Analyze</h1>
      <p className="mt-2 text-2xl">{name}</p>
      {!ready ? <p className="mt-6 font-mono text-xs text-muted">Loading session…</p> : null}
      {ready && !owner ? (
        <p className="mt-6 max-w-lg text-sm text-muted">
          Backfill and on-demand sync run in your browser, so they require the account linked to this
          username.{' '}
          <Link to="/" className="text-ink underline">
            Sign in
          </Link>
        </p>
      ) : null}
      {owner ? (
        <div className="mt-8 max-w-xl">
          <ProgressPanel
            title={finished ? 'Sync complete' : 'Engine running locally'}
            detail={error ?? status}
            done={done}
            total={total}
          />
          <p className="mt-3 font-mono text-xs text-muted">{flagged} flagged positions this run</p>
          {error ? <p className="mt-3 text-sm text-blunder">{error}</p> : null}
          {finished ? (
            <Link
              to="/results/$username"
              params={{ username: name }}
              className="mt-6 inline-block border border-ink px-3 py-2 text-sm hover:bg-ink hover:text-canvas"
            >
              Open results
            </Link>
          ) : null}
        </div>
      ) : null}
    </AppShell>
  )
}
