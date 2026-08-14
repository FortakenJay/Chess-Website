import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { UciEngine, type EnginePort } from './engine'

function resolveAsmEngine() {
  const require = createRequire(import.meta.url)
  try {
    return require.resolve('stockfish/bin/stockfish-18-asm.js')
  } catch {
    return join(process.cwd(), 'node_modules/stockfish/bin/stockfish-18-asm.js')
  }
}

export async function createNodePort(): Promise<EnginePort> {
  const child = spawn(process.execPath, [resolveAsmEngine()], {
    stdio: ['pipe', 'pipe', 'pipe'],
    windowsHide: true,
  })
  const listeners = new Set<(line: string) => void>()
  const output = createInterface({ input: child.stdout })
  output.on('line', (line) => {
    for (const listener of listeners) listener(line.trim())
  })
  child.stderr.on('data', (chunk) => {
    const line = String(chunk).trim()
    if (line) for (const listener of listeners) listener(line)
  })

  return {
    send: (cmd) => child.stdin.write(`${cmd}\n`),
    subscribe: (cb) => {
      listeners.add(cb)
      return () => listeners.delete(cb)
    },
    quit: () => {
      child.stdin.write('quit\n')
      output.close()
    },
  }
}

export async function createNodeEngine(): Promise<UciEngine> {
  const engine = new UciEngine(await createNodePort())
  await engine.init()
  return engine
}
