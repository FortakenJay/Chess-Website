import { analyzeGame, type RawGame } from '@/lib/analysis/analyzeGame'
import {
  createBrowserEngine,
  DEFAULT_ANALYSIS_BUDGET,
  type UciEngine,
} from '@/lib/analysis/engine'
import type {
  AnalysisBudget,
  EngineEval,
  EngineLine,
  FlaggedPosition,
  GameAnalysis,
} from '@/lib/analysis/types'
import { errorMessage } from '@/lib/errorMessage'
import type { WorkerRequest, WorkerResponse } from '@/workers/analyze.worker'

export type AnalyzeProgress = {
  phase: 'engine' | 'game'
  gamesDone: number
  gamesTotal: number
  ply: number
  plyTotal: number
}

type AnalyzeOptions = {
  movetime?: number
  signal?: AbortSignal
  onProgress?: (info: AnalyzeProgress) => void
  onGame?: (analysis: GameAnalysis) => void | Promise<void>
  onFlagged?: (position: FlaggedPosition) => void
  /** Full move tape for free Chess.com-style review (never persisted). */
  includePlies?: boolean
  analysisBudget?: AnalysisBudget
}

type Pending = {
  resolve: (value: unknown) => void
  reject: (error: Error) => void
  onProgress?: (info: AnalyzeProgress) => void
  onGame?: (analysis: GameAnalysis) => void | Promise<void>
  signal?: AbortSignal
  onAbort?: () => void
  /** Serializes async persistence callbacks from worker messages. */
  gameQueue?: Promise<void>
}

class GameCallbackError extends Error {
  override name = 'GameCallbackError'
}

let worker: Worker | null = null
let workerFailed = false
let nextId = 1
const pending = new Map<number, Pending>()

let mainEnginePromise: Promise<UciEngine> | null = null

function getMainEngine() {
  if (!mainEnginePromise) {
    mainEnginePromise = createBrowserEngine().catch((err) => {
      mainEnginePromise = null
      throw err
    })
  }
  return mainEnginePromise
}

async function analyzeGamesOnMain(
  games: RawGame[],
  username: string,
  options: AnalyzeOptions,
) {
  options.onProgress?.({
    phase: 'engine',
    gamesDone: 0,
    gamesTotal: games.length,
    ply: 0,
    plyTotal: 0,
  })
  const engine = await getMainEngine()
  const budget = options.analysisBudget ?? DEFAULT_ANALYSIS_BUDGET
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
    const analysis = await analyzeGame(game, username, (fen) => engine.evaluate(fen, options.movetime ?? 80), {
      signal: options.signal,
      includePlies: options.includePlies,
      analysisBudget: budget,
      evaluateLines: (fen) => engine.evaluateLines(fen, budget, budget.multipv),
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

function getWorker() {
  if (workerFailed || typeof Worker === 'undefined') return null
  if (!worker) {
    try {
      worker = new Worker(new URL('../workers/analyze.worker.ts', import.meta.url), {
        type: 'module',
      })
    } catch {
      workerFailed = true
      return null
    }
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data
      const job = pending.get(message.requestId)
      if (!job) return

      if (message.type === 'engine') {
        job.onProgress?.({
          phase: 'engine',
          gamesDone: 0,
          gamesTotal: 0,
          ply: 0,
          plyTotal: 0,
        })
        return
      }
      if (message.type === 'progress') {
        job.onProgress?.({
          phase: 'game',
          gamesDone: message.gamesDone,
          gamesTotal: message.gamesTotal,
          ply: message.ply,
          plyTotal: message.plyTotal,
        })
        return
      }
      if (message.type === 'game') {
        const next = (job.gameQueue ?? Promise.resolve()).then(async () => {
          await job.onGame?.(message.analysis)
        })
        job.gameQueue = next
        void next.catch((error) => {
          if (pending.get(message.requestId) !== job) return
          job.reject(new GameCallbackError(errorMessage(error)))
          cleanup(message.requestId)
        })
        return
      }
      if (message.type === 'evalResult') {
        job.resolve(message.result)
        cleanup(message.requestId)
        return
      }
      if (message.type === 'evalLinesResult') {
        job.resolve(message.result)
        cleanup(message.requestId)
        return
      }
      if (message.type === 'done') {
        void (job.gameQueue ?? Promise.resolve()).then(
          () => {
            if (pending.get(message.requestId) !== job) return
            job.resolve(undefined)
            cleanup(message.requestId)
          },
          (error) => {
            if (pending.get(message.requestId) !== job) return
            job.reject(new GameCallbackError(errorMessage(error)))
            cleanup(message.requestId)
          },
        )
        return
      }
      if (message.type === 'error') {
        job.reject(new Error(message.message))
        cleanup(message.requestId)
      }
    }
    worker.onerror = () => {
      workerFailed = true
      worker?.terminate()
      worker = null
      const error = new Error('Analysis worker failed')
      for (const [id, job] of pending) {
        job.reject(error)
        cleanup(id)
      }
    }
  }
  return worker
}

function cleanup(requestId: number) {
  const job = pending.get(requestId)
  if (!job) return
  if (job.onAbort && job.signal) {
    job.signal.removeEventListener('abort', job.onAbort)
  }
  pending.delete(requestId)
}

function post(request: WorkerRequest, job: Pending) {
  const w = getWorker()
  if (!w) {
    job.reject(new Error('Analysis worker unavailable'))
    return
  }
  pending.set(request.requestId, job)
  if (job.signal) {
    const onAbort = () => {
      w.postMessage({ type: 'abort', requestId: request.requestId } satisfies WorkerRequest)
      job.reject(new DOMException('Aborted', 'AbortError'))
      cleanup(request.requestId)
    }
    job.onAbort = onAbort
    if (job.signal.aborted) {
      onAbort()
      return
    }
    job.signal.addEventListener('abort', onAbort, { once: true })
  }
  w.postMessage(request)
}

export async function evaluateFen(fen: string, movetime = 150): Promise<EngineEval> {
  const w = getWorker()
  if (!w) {
    const engine = await getMainEngine()
    return engine.evaluate(fen, movetime)
  }
  const requestId = nextId++
  try {
    return await new Promise<EngineEval>((resolve, reject) => {
      post(
        { type: 'eval', requestId, fen, movetime },
        {
          resolve: (value) => resolve(value as EngineEval),
          reject,
        },
      )
    })
  } catch {
    workerFailed = true
    const engine = await getMainEngine()
    return engine.evaluate(fen, movetime)
  }
}

export async function evaluateLines(
  fen: string,
  movetime = 250,
  multipv = 3,
): Promise<EngineLine[]> {
  const w = getWorker()
  if (!w) {
    const engine = await getMainEngine()
    return engine.evaluateLines(fen, movetime, multipv)
  }
  const requestId = nextId++
  try {
    return await new Promise<EngineLine[]>((resolve, reject) => {
      post(
        { type: 'evalLines', requestId, fen, movetime, multipv },
        {
          resolve: (value) => resolve(value as EngineLine[]),
          reject,
        },
      )
    })
  } catch {
    workerFailed = true
    const engine = await getMainEngine()
    return engine.evaluateLines(fen, movetime, multipv)
  }
}

export async function analyzeGames(
  games: RawGame[],
  username: string,
  options: AnalyzeOptions = {},
) {
  const w = getWorker()
  if (!w) {
    await analyzeGamesOnMain(games, username, options)
    return
  }

  const requestId = nextId++
  try {
    await new Promise<void>((resolve, reject) => {
      post(
        {
          type: 'analyze',
          requestId,
          games,
          username,
          movetime: options.movetime,
          includePlies: options.includePlies,
          analysisBudget: options.analysisBudget ?? DEFAULT_ANALYSIS_BUDGET,
        },
        {
          resolve: () => resolve(),
          reject,
          onProgress: options.onProgress,
          onGame: options.onGame,
          signal: options.signal,
        },
      )
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    if (error instanceof GameCallbackError) throw error
    workerFailed = true
    await analyzeGamesOnMain(games, username, options)
  }
}
