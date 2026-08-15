import { analyzeGame, type RawGame } from '../lib/analysis/analyzeGame'
import {
  createBrowserEngine,
  DEFAULT_ANALYSIS_BUDGET,
  type UciEngine,
} from '../lib/analysis/engine'
import type {
  AnalysisBudget,
  EngineEval,
  EngineLine,
  GameAnalysis,
} from '../lib/analysis/types'
import { errorMessage } from '../lib/errorMessage'

export type WorkerRequest =
  | {
      type: 'analyze'
      requestId: number
      games: RawGame[]
      username: string
      movetime?: number
      includePlies?: boolean
      analysisBudget?: AnalysisBudget
    }
  | { type: 'eval'; requestId: number; fen: string; movetime?: number }
  | {
      type: 'evalLines'
      requestId: number
      fen: string
      movetime?: number
      multipv?: number
    }
  | { type: 'abort'; requestId: number }

export type WorkerResponse =
  | { type: 'engine'; requestId: number }
  | {
      type: 'progress'
      requestId: number
      gamesDone: number
      gamesTotal: number
      ply: number
      plyTotal: number
    }
  | { type: 'game'; requestId: number; analysis: GameAnalysis }
  | { type: 'done'; requestId: number }
  | { type: 'evalResult'; requestId: number; result: EngineEval }
  | { type: 'evalLinesResult'; requestId: number; result: EngineLine[] }
  | { type: 'error'; requestId: number; message: string }

let engine: UciEngine | null = null
let activeRequestId: number | null = null
let abortActive = false

async function getEngine() {
  if (!engine) engine = await createBrowserEngine()
  return engine
}

function aborted() {
  return abortActive
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data
  if (message.type === 'abort') {
    if (activeRequestId === message.requestId) abortActive = true
    return
  }

  const { requestId } = message
  activeRequestId = requestId
  abortActive = false

  try {
    const sf = await getEngine()
    if (aborted()) throw new DOMException('Aborted', 'AbortError')

    if (message.type === 'eval') {
      const result = await sf.evaluate(message.fen, message.movetime ?? 150)
      const response: WorkerResponse = { type: 'evalResult', requestId, result }
      self.postMessage(response)
      return
    }

    if (message.type === 'evalLines') {
      const result = await sf.evaluateLines(
        message.fen,
        message.movetime ?? 250,
        message.multipv ?? 3,
      )
      const response: WorkerResponse = { type: 'evalLinesResult', requestId, result }
      self.postMessage(response)
      return
    }

    const { games, username, movetime = 80, includePlies } = message
    const budget = message.analysisBudget ?? DEFAULT_ANALYSIS_BUDGET
    self.postMessage({ type: 'engine', requestId } satisfies WorkerResponse)

    for (let i = 0; i < games.length; i++) {
      if (aborted()) throw new DOMException('Aborted', 'AbortError')
      const game = games[i]!
      await sf.newGame()
      self.postMessage({
        type: 'progress',
        requestId,
        gamesDone: i,
        gamesTotal: games.length,
        ply: 0,
        plyTotal: 0,
      } satisfies WorkerResponse)

      const analysis = await analyzeGame(game, username, (fen) => sf.evaluate(fen, movetime), {
        includePlies,
        analysisBudget: budget,
        evaluateLines: (fen) => sf.evaluateLines(fen, budget, budget.multipv),
        signal: {
          get aborted() {
            return aborted()
          },
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() {
            return false
          },
          onabort: null,
          reason: undefined,
          throwIfAborted() {
            if (aborted()) throw new DOMException('Aborted', 'AbortError')
          },
        } as AbortSignal,
        onPly: ({ ply, plyTotal }) => {
          self.postMessage({
            type: 'progress',
            requestId,
            gamesDone: i,
            gamesTotal: games.length,
            ply,
            plyTotal,
          } satisfies WorkerResponse)
        },
      })
      if (analysis) {
        self.postMessage({ type: 'game', requestId, analysis } satisfies WorkerResponse)
      }
    }

    self.postMessage({
      type: 'progress',
      requestId,
      gamesDone: games.length,
      gamesTotal: games.length,
      ply: 0,
      plyTotal: 0,
    } satisfies WorkerResponse)
    self.postMessage({ type: 'done', requestId } satisfies WorkerResponse)
  } catch (error) {
    self.postMessage({
      type: 'error',
      requestId,
      message: errorMessage(error),
    } satisfies WorkerResponse)
  } finally {
    if (activeRequestId === requestId) {
      activeRequestId = null
      abortActive = false
    }
  }
}
