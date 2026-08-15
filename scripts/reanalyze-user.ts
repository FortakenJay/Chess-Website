/**
 * Re-run Stockfish on saved games that still have the old analyzer scores.
 *
 *   npx tsx scripts/reanalyze-user.ts sakenetal
 *   npx tsx scripts/reanalyze-user.ts sakenetal --all
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { analyzeGame } from '../src/lib/analysis/analyzeGame.ts'
import { DEFAULT_ANALYSIS_BUDGET } from '../src/lib/analysis/engine.ts'
import { createNodeEngine } from '../src/lib/analysis/engine.node.ts'
import { fetchArchives, fetchMonthGames } from '../src/lib/chesscom.ts'
import { fetchAllRows, markSyncState, persistGames } from '../src/lib/persist.ts'
import { getServiceClient } from '../src/lib/supabase/admin.ts'
import { runUserSync } from '../src/lib/sync/runSync.ts'
import { normalizeUsername } from '../src/lib/username.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function loadEnvFiles() {
  for (const name of ['.env.local', '.env']) {
    try {
      const text = await readFile(path.join(ROOT, name), 'utf8')
      for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim()
        if (!line || line.startsWith('#')) continue
        const eq = line.indexOf('=')
        if (eq <= 0) continue
        const key = line.slice(0, eq).trim()
        let value = line.slice(eq + 1).trim()
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }
        if (process.env[key] == null || process.env[key] === '') {
          process.env[key] = value
        }
      }
    } catch {
      // optional
    }
  }
}

async function main() {
  await loadEnvFiles()
  const args = process.argv.slice(2).filter((arg) => !arg.startsWith('--'))
  const all = process.argv.includes('--all')
  const username = normalizeUsername(args[0] || 'sakenetal')
  const supabase = getServiceClient()

  const stale = all
    ? null
    : new Set(
        (
          await fetchAllRows((from, to) =>
            supabase
              .from('games')
              .select('game_link')
              .eq('username', username)
              .is('analysis_budget', null)
              .range(from, to),
          )
        ).map((row) => row.game_link),
      )

  console.log(
    all
      ? `Reanalyzing every saved game for ${username}`
      : `Reanalyzing ${stale?.size ?? 0} stale games for ${username}`,
  )

  const engine = await createNodeEngine()
  const started = Date.now()
  let analyzed = 0

  try {
    const result = await runUserSync(username, {
      history: 'reanalyze',
      shouldAnalyze: stale ? (game) => stale.has(game.url) : () => true,
      listArchives: fetchArchives,
      listMonthGames: fetchMonthGames,
      getSavedGameLinks: async (name) => {
        const rows = await fetchAllRows((from, to) =>
          supabase.from('games').select('game_link').eq('username', name).range(from, to),
        )
        return new Set(rows.map((row) => row.game_link))
      },
      getSinceEndTime: async () => 0,
      analyzeBatch: async (games, name, options) => {
        for (let i = 0; i < games.length; i++) {
          if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
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
          if (analysis) {
            analyzed += 1
            await options.onGame?.(analysis)
            if (analyzed % 10 === 0) {
              const mins = ((Date.now() - started) / 60000).toFixed(1)
              console.log(`  ${analyzed} rewritten · ${mins} min`)
            }
          }
        }
      },
      persistBatch: (analyses) => persistGames(supabase, analyses, { updateSyncState: false }),
      markSync: (name, maxEndTime) => markSyncState(supabase, name, maxEndTime),
      onProgress: (event) => {
        if (event.type === 'month_batch') {
          console.log(
            `Month ${event.monthsDone}/${event.monthsTotal} · ${event.chesscomSeen} games seen`,
          )
        }
        if (event.type === 'complete') {
          console.log(
            `Done. Rewrote ${event.saved} games, flagged ${event.flagged} positions.`,
          )
        }
      },
    })
    console.log(JSON.stringify({ username, analyzed, ...result }, null, 2))
  } finally {
    engine.quit()
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
