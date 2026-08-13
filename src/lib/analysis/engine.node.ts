import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { UciEngine, type EnginePort } from './engine'

type StockfishFactory = () => (opts: {
  locateFile?: (file: string, prefix: string) => string
  listener?: (line: string) => void
}) => Promise<{ processCommand: (cmd: string) => void; terminate?: () => void }>

function resolveLiteSingle() {
  const require = createRequire(import.meta.url)
  try {
    return require.resolve('stockfish/bin/stockfish-18-lite-single.js')
  } catch {
    return join(process.cwd(), 'node_modules/stockfish/bin/stockfish-18-lite-single.js')
  }
}

export async function createNodePort(): Promise<EnginePort> {
  const require = createRequire(import.meta.url)
  const jsPath = resolveLiteSingle()
  const wasmPath = join(dirname(jsPath), 'stockfish-18-lite-single.wasm')
  const factory = require(jsPath) as StockfishFactory
  const listeners = new Set<(line: string) => void>()
  const engine = await factory()({
    locateFile: (file) => (file.includes('.wasm') ? wasmPath : jsPath),
    listener: (line) => {
      for (const listener of listeners) listener(line)
    },
  })
  return {
    send: (cmd) => engine.processCommand(cmd),
    subscribe: (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    quit: () => engine.terminate?.(),
  }
}

export async function createNodeEngine(): Promise<UciEngine> {
  const engine = new UciEngine(await createNodePort())
  await engine.init()
  return engine
}
