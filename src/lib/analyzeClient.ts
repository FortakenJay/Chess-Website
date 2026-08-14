import { analyzeGame, type RawGame } from '@/lib/analysis/analyzeGame'
import { createBrowserEngine, type UciEngine } from '@/lib/analysis/engine'
import type { EngineEval, FlaggedPosition, GameAnalysis } from '@/lib/analysis/types'

let enginePromise: Promise<UciEngine> | null = null

function getBrowserEngine() {
  if (!enginePromise) {
    enginePromise = createBrowserEngine().catch((err) => {
      enginePromise = null
      throw err
    })
  }
  return enginePromise
}

export function evaluateFen(fen: string, movetime = 150): Promise<EngineEval> {
  return getBrowserEngine().then((engine) => engine.evaluate(fen, movetime))
}

export type AnalyzeProgress = {
  phase: 'engine' | 'game'
  gamesDone: number
  gamesTotal: number
  ply: number
  plyTotal: number
}

export async function analyzeGames(
  games: RawGame[],
  username: string,
  options: {
    movetime?: number
    signal?: AbortSignal
    onProgress?: (info: AnalyzeProgress) => void
    onGame?: (analysis: GameAnalysis) => void | Promise<void>
    onFlagged?: (position: FlaggedPosition) => void
  } = {},
) {
  options.onProgress?.({
    phase: 'engine',
    gamesDone: 0,
    gamesTotal: games.length,
    ply: 0,
    plyTotal: 0,
  })
  const engine = await getBrowserEngine()
  const movetime = options.movetime ?? 80
  const total = games.length

  for (let i = 0; i < games.length; i++) {
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    const game = games[i]!
    await engine.newGame()
    options.onProgress?.({
      phase: 'game',
      gamesDone: i,
      gamesTotal: total,
      ply: 0,
      plyTotal: 0,
    })
    const analysis = await analyzeGame(game, username, (fen) => engine.evaluate(fen, movetime), {
      signal: options.signal,
      onPly: ({ ply, plyTotal }) => {
        options.onProgress?.({
          phase: 'game',
          gamesDone: i,
          gamesTotal: total,
          ply,
          plyTotal,
        })
      },
      onFlagged: options.onFlagged,
    })
    if (analysis) await options.onGame?.(analysis)
  }

  options.onProgress?.({
    phase: 'game',
    gamesDone: total,
    gamesTotal: total,
    ply: 0,
    plyTotal: 0,
  })
}
