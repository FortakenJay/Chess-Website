import { toWhiteRelative } from './classify'
import type { EngineEval } from './types'

export type EnginePort = {
  send: (cmd: string) => void
  subscribe: (cb: (line: string) => void) => () => void
  quit: () => void
}

const ENGINE_JS = '/engine/stockfish-18-lite-single.js'
const ENGINE_WASM = '/engine/stockfish-18-lite-single.wasm'
const ENGINE_ASM = '/engine/stockfish-18-asm.js'
const ENGINE_ASM_STUB = '/engine/asm-stub.txt'
const ENGINE_ERROR = '__engine_error__:'
const SKIP_WASM_KEY = 'leak:skip-wasm-engine'

function absoluteUrl(path: string) {
  const origin = self.location.origin
  return origin && origin !== 'null' ? `${origin}${path}` : path
}

function wasmWorkerUrl() {
  return `${absoluteUrl(ENGINE_JS)}#${encodeURIComponent(absoluteUrl(ENGINE_WASM))}`
}

function asmWorkerUrl() {
  return `${absoluteUrl(ENGINE_ASM)}#${encodeURIComponent(absoluteUrl(ENGINE_ASM_STUB))}`
}

function shouldSkipWasm() {
  try {
    return localStorage.getItem(SKIP_WASM_KEY) === '1'
  } catch {
    return false
  }
}

function rememberWasmFailed() {
  try {
    localStorage.setItem(SKIP_WASM_KEY, '1')
  } catch {
    /* ignore quota / private mode */
  }
}

function emit(listeners: Set<(line: string) => void>, line: string) {
  for (const listener of listeners) listener(line)
}

function createWorkerPort(url: string): EnginePort {
  const worker = new Worker(url)
  const listeners = new Set<(line: string) => void>()
  let lastError: string | null = null

  function fail(message: string) {
    lastError = `${ENGINE_ERROR}${message}`
    emit(listeners, lastError)
  }

  worker.addEventListener('message', (event: MessageEvent<unknown>) => {
    const line = typeof event.data === 'string' ? event.data.trim() : String(event.data)
    emit(listeners, line)
  })
  worker.addEventListener('error', (event) => {
    fail(event.message || 'Stockfish failed to load')
  })
  worker.addEventListener('messageerror', () => {
    fail('Stockfish sent a malformed message')
  })

  return {
    send: (cmd) => worker.postMessage(cmd),
    subscribe: (cb) => {
      listeners.add(cb)
      if (lastError) cb(lastError)
      return () => listeners.delete(cb)
    },
    quit: () => worker.terminate(),
  }
}

export function createBrowserPort(): EnginePort {
  return createWorkerPort(shouldSkipWasm() ? asmWorkerUrl() : wasmWorkerUrl())
}

export class UciEngine {
  private ready = false
  private queue: Promise<void> = Promise.resolve()

  constructor(private port: EnginePort) {}

  async init(): Promise<void> {
    if (this.ready) return
    await this.waitFor('uci', (line) => line === 'uciok', 30_000)
    await this.waitFor('isready', (line) => line === 'readyok')
    this.ready = true
  }

  async newGame(): Promise<void> {
    await this.init()
    this.port.send('ucinewgame')
    await this.waitFor('isready', (line) => line === 'readyok')
  }

  evaluate(fen: string, movetimeMs = 80): Promise<EngineEval> {
    const run = async () => {
      await this.init()
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
        if (line.startsWith(ENGINE_ERROR) || line.startsWith('Aborted(')) {
          clearTimeout(timer)
          unsub()
          reject(
            new Error(
              line.startsWith(ENGINE_ERROR) ? line.slice(ENGINE_ERROR.length) : line,
            ),
          )
          return
        }
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
  if (!shouldSkipWasm()) {
    const wasmEngine = new UciEngine(createWorkerPort(wasmWorkerUrl()))
    try {
      await wasmEngine.init()
      return wasmEngine
    } catch {
      wasmEngine.quit()
      rememberWasmFailed()
    }
  }

  const asmEngine = new UciEngine(createWorkerPort(asmWorkerUrl()))
  await asmEngine.init()
  return asmEngine
}
