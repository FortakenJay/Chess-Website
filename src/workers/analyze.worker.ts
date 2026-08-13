import { analyzeGame, type RawGame } from '../lib/analysis/analyzeGame'
import { createBrowserEngine, type UciEngine } from '../lib/analysis/engine'

export type WorkerRequest =
  | { type: 'analyze'; games: RawGame[]; username: string; movetime?: number }
  | { type: 'eval'; id: string; fen: string; movetime?: number }

export type WorkerResponse =
  | {
      type: 'progress'
      gamesDone: number
      gamesTotal: number
      currentUrl: string
    }
  | { type: 'game'; analysis: NonNullable<Awaited<ReturnType<typeof analyzeGame>>> }
  | { type: 'done' }
  | { type: 'error'; message: string }
  | { type: 'evalResult'; id: string; result: Awaited<ReturnType<UciEngine['evaluate']>> }

let engine: UciEngine | null = null

async function getEngine() {
  if (!engine) engine = await createBrowserEngine()
  return engine
}

self.onmessage = async (event: MessageEvent<WorkerRequest>) => {
  const message = event.data
  try {
    const sf = await getEngine()
    if (message.type === 'eval') {
      const result = await sf.evaluate(message.fen, message.movetime ?? 150)
      const response: WorkerResponse = { type: 'evalResult', id: message.id, result }
      self.postMessage(response)
      return
    }

    const { games, username, movetime = 80 } = message
    for (let i = 0; i < games.length; i++) {
      const game = games[i]!
      self.postMessage({
        type: 'progress',
        gamesDone: i,
        gamesTotal: games.length,
        currentUrl: game.url,
      } satisfies WorkerResponse)
      const analysis = await analyzeGame(game, username, (fen) => sf.evaluate(fen, movetime))
      if (analysis) {
        self.postMessage({ type: 'game', analysis } satisfies WorkerResponse)
      }
    }
    self.postMessage({
      type: 'progress',
      gamesDone: games.length,
      gamesTotal: games.length,
      currentUrl: '',
    } satisfies WorkerResponse)
    self.postMessage({ type: 'done' } satisfies WorkerResponse)
  } catch (error) {
    self.postMessage({
      type: 'error',
      message: error instanceof Error ? error.message : String(error),
    } satisfies WorkerResponse)
  }
}
