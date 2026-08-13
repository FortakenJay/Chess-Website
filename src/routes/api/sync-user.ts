import { createFileRoute } from '@tanstack/react-router'
import { analyzeGame } from '@/lib/analysis/analyzeGame'
import { createNodeEngine } from '@/lib/analysis/engine.node'
import { fetchArchives, fetchMonthGames } from '@/lib/chesscom'
import { persistGames } from '@/lib/persist'
import { getServiceClient } from '@/lib/supabase/admin'
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
            const since = state.last_game_end_time ?? undefined
            const archives = await fetchArchives(username)
            const months = since
              ? archives.filter((a) => {
                  const stamp = Date.UTC(a.year, a.month - 1, 1) / 1000
                  return stamp + 32 * 86400 >= since
                })
              : archives.slice(-2)

            const games = []
            for (const month of months) {
              if (Date.now() - started > budget) break
              const batch = await fetchMonthGames(username, month.year, month.month, since)
              games.push(...batch)
            }

            const analyses = []
            for (const game of games) {
              if (Date.now() - started > budget) break
              const analysis = await analyzeGame(game, username, (fen) => engine.evaluate(fen, 80))
              if (analysis) analyses.push(analysis)
            }
            if (analyses.length) await persistGames(supabase, analyses)
            results.push({ username, games: analyses.length })
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
