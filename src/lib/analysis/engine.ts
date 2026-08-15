import { Chess, type Square } from 'chess.js'
import { toWhiteRelative } from './classify'
import type { AnalysisBudget, EngineEval, EngineLine } from './types'

export const DEFAULT_ANALYSIS_BUDGET: AnalysisBudget = {
  kind: 'nodes',
  value: 12_000,
  multipv: 4,
}

function uciPvToSan(fen: string, pv: string[]): string[] {
  try {
    const board = new Chess(fen)
    const sans: string[] = []
    for (const uci of pv) {
      if (!uci || uci.length < 4) break
      const move = board.move({
        from: uci.slice(0, 2) as Square,
        to: uci.slice(2, 4) as Square,
        promotion: (uci[4] as 'q' | 'r' | 'b' | 'n' | undefined) ?? undefined,
      })
      if (!move) break
      sans.push(move.san)
    }
    return sans
  } catch {
    return []
  }
}

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

function storage(): Storage | null {
  try {
    // Dedicated workers have no localStorage; main thread may block it in private mode.
    if (typeof localStorage === 'undefined') return null
    return localStorage
  } catch {
    return null
  }
}

function shouldSkipWasm() {
  try {
    return storage()?.getItem(SKIP_WASM_KEY) === '1'
  } catch {
    return false
  }
}

function rememberWasmFailed() {
  try {
    storage()?.setItem(SKIP_WASM_KEY, '1')
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
      this.port.send('setoption name MultiPV value 1')
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

  /** Top N engine lines (MultiPV). Scores are white-relative. */
  evaluateLines(
    fen: string,
    search: number | Pick<AnalysisBudget, 'kind' | 'value'> = 200,
    multipv = 3,
  ): Promise<EngineLine[]> {
    const run = async () => {
      await this.init()
      const count = Math.max(1, Math.min(5, multipv))
      this.port.send(`setoption name MultiPV value ${count}`)
      this.port.send(`position fen ${fen}`)

      const byPv = new Map<number, { cp?: number; mate?: number; pv: string[] }>()
      let bestMove = '0000'

      const go =
        typeof search === 'number'
          ? `go movetime ${search}`
          : `go ${search.kind} ${Math.max(1, Math.round(search.value))}`
      await this.waitFor(go, (line) => {
        if (line.startsWith('info ') && line.includes(' score ') && line.includes(' pv ')) {
          const multipvMatch = / multipv (\d+)/.exec(line)
          const idx = multipvMatch ? Number(multipvMatch[1]) : 1
          const mate = /score mate (-?\d+)/.exec(line)
          const cp = /score cp (-?\d+)/.exec(line)
          const pvMatch = / pv (.+)$/.exec(line)
          const pv = pvMatch?.[1]?.trim().split(/\s+/).filter(Boolean) ?? []
          if (mate) byPv.set(idx, { mate: Number(mate[1]), pv })
          else if (cp) byPv.set(idx, { cp: Number(cp[1]), pv })
        }
        if (line.startsWith('bestmove ')) {
          bestMove = line.split(/\s+/)[1] ?? '0000'
          return true
        }
        return false
      })

      // Reset MultiPV so batch game analysis stays single-line fast.
      this.port.send('setoption name MultiPV value 1')

      const stm = fen.split(' ')[1] === 'b' ? 'b' : 'w'
      const lines: EngineLine[] = []
      for (let i = 1; i <= count; i++) {
        const raw = byPv.get(i)
        if (!raw) continue
        const first = raw.pv[0] ?? (i === 1 ? bestMove : '0000')
        const scored = toWhiteRelative(raw, stm, first)
        lines.push({
          multipv: i,
          cp: scored.cp,
          mate: scored.mate,
          bestMove: first,
          pvUci: raw.pv,
          pvSan: uciPvToSan(fen, raw.pv),
        })
      }
      return lines
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
