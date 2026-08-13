import { toWhiteRelative } from './classify'
import type { EngineEval } from './types'

export type EnginePort = {
  send: (cmd: string) => void
  subscribe: (cb: (line: string) => void) => () => void
  quit: () => void
}

const ENGINE_URL = '/engine/stockfish-18-lite-single.js'

export function createBrowserPort(): EnginePort {
  const worker = new Worker(ENGINE_URL)
  const listeners = new Set<(line: string) => void>()
  worker.addEventListener('message', (event: MessageEvent<string>) => {
    const line = typeof event.data === 'string' ? event.data : String(event.data)
    for (const listener of listeners) listener(line)
  })
  return {
    send: (cmd) => worker.postMessage(cmd),
    subscribe: (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    quit: () => worker.terminate(),
  }
}

export class UciEngine {
  private ready = false
  private queue: Promise<void> = Promise.resolve()

  constructor(private port: EnginePort) {}

  async init(): Promise<void> {
    if (this.ready) return
    await this.waitFor('uci', (line) => line === 'uciok')
    await this.waitFor('isready', (line) => line === 'readyok')
    this.ready = true
  }

  evaluate(fen: string, movetimeMs = 80): Promise<EngineEval> {
    const run = async () => {
      await this.init()
      this.port.send('ucinewgame')
      this.port.send(`position fen ${fen}`)
      let last: { cp?: number; mate?: number } = {}
      let bestMove = '0000'
      await this.waitFor(`go movetime ${movetimeMs}`, (line) => {
        if (line.startsWith('info ') && line.includes(' score ')) {
          const mate = /score mate (-?\d+)/.exec(line)
          const cp = /score cp (-?\d+)/.exec(line)
          if (mate) last = { mate: Number(mate[1]) }
          else if (cp) last = { cp: Number(cp[1]) }
        }
        if (line.startsWith('bestmove ')) {
          bestMove = line.split(/\s+/)[1] ?? '0000'
          return true
        }
        return false
      })
      const stm = fen.split(' ')[1] === 'b' ? 'b' : 'w'
      return toWhiteRelative(last, stm, bestMove)
    }

    const next = this.queue.then(run, run)
    this.queue = next.then(
      () => undefined,
      () => undefined,
    )
    return next
  }

  quit() {
    this.port.quit()
  }

  private waitFor(cmd: string, done: (line: string) => boolean, timeoutMs = 15_000) {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        unsub()
        reject(new Error(`Engine timeout after "${cmd}"`))
      }, timeoutMs)
      const unsub = this.port.subscribe((line) => {
        if (!done(line)) return
        clearTimeout(timer)
        unsub()
        resolve()
      })
      this.port.send(cmd)
    })
  }
}

export async function createBrowserEngine(): Promise<UciEngine> {
  const engine = new UciEngine(createBrowserPort())
  await engine.init()
  return engine
}
