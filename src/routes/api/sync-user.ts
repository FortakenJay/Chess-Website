import { createFileRoute } from '@tanstack/react-router'
import { analyzeGame } from '@/lib/analysis/analyzeGame'
import { DEFAULT_ANALYSIS_BUDGET } from '@/lib/analysis/engine'
import { createNodeEngine } from '@/lib/analysis/engine.node'
import { fetchArchives, fetchMonthGames } from '@/lib/chesscom'
import { errorMessage } from '@/lib/errorMessage'
import { fetchAllRows, markSyncState, persistGames, purgeExpiredGames } from '@/lib/persist'
import { getServiceClient } from '@/lib/supabase/admin'
import { runUserSync } from '@/lib/sync/runSync'
import { normalizeUsername } from '@/lib/username'

export const Route = createFileRoute('/api/sync-user')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const auth = request.headers.get('authorization') ?? ''
        const secret = process.env.CRON_SECRET
        if (!secret || auth !== `Bearer ${secret}`) {
          return Response.json({ error: 'unauthorized' }, { status: 401 })
        }

        const started = Date.now()
        const budget = Number(process.env.MAX_SYNC_MS ?? 8000)
        const only = url.searchParams.get('username')

        const supabase = getServiceClient()
        const { data: states, error } = only
          ? await supabase.from('sync_state').select('*').eq('username', normalizeUsername(only))
          : await supabase.from('sync_state').select('*')
        if (error) return Response.json({ error: error.message }, { status: 500 })

        const engine = await createNodeEngine()
        const results: Array<{ username: string; games: number }> = []

        try {
          for (const state of states ?? []) {
            if (Date.now() - started > budget) break
            const username = state.username
            const result = await runUserSync(username, {
              shouldStop: () => Date.now() - started > budget,
              maxMonthsWithoutSince: 2,
              history: 'incremental',
              listArchives: fetchArchives,
              listMonthGames: fetchMonthGames,
              getSavedGameLinks: async (name) => {
                const rows = await fetchAllRows((from, to) =>
                  supabase
                    .from('games')
                    .select('game_link')
                    .eq('username', name)
                    .range(from, to),
                )
                return new Set(rows.map((row) => row.game_link))
              },
              getSinceEndTime: async () => state.last_game_end_time ?? 0,
              analyzeBatch: async (games, name, options) => {
                for (let i = 0; i < games.length; i++) {
                  if (options.signal?.aborted || Date.now() - started > budget) {
                    throw new DOMException('Aborted', 'AbortError')
                  }
                  const game = games[i]!
                  options.onProgress?.({
                    phase: 'game',
                    gamesDone: i,
                    gamesTotal: games.length,
                    ply: 0,
                    plyTotal: 0,
                  })
                  await engine.newGame()
                  const analysis = await analyzeGame(
                    game,
                    name,
                    (fen) => engine.evaluate(fen, options.movetime),
                    {
                      analysisBudget: DEFAULT_ANALYSIS_BUDGET,
                      evaluateLines: (fen) =>
                        engine.evaluateLines(
                          fen,
                          DEFAULT_ANALYSIS_BUDGET,
                          DEFAULT_ANALYSIS_BUDGET.multipv,
                        ),
                    },
                  )
                  if (analysis) await options.onGame?.(analysis)
                }
              },
              persistBatch: (analyses) =>
                persistGames(supabase, analyses, { updateSyncState: false }),
              markSync: (name, maxEndTime) => markSyncState(supabase, name, maxEndTime),
              purgeExpired: () => purgeExpiredGames(supabase),
            })
            results.push({ username, games: result.saved })
          }
        } catch (error) {
          if (!(error instanceof DOMException && error.name === 'AbortError')) {
            return Response.json(
              { error: errorMessage(error) },
              { status: 500 },
            )
          }
        } finally {
          engine.quit()
        }

        return Response.json({
          ok: true,
          elapsedMs: Date.now() - started,
          results,
        })
      },
    },
  },
})
