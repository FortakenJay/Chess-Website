import { copyFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)
const pkgDir = dirname(require.resolve('stockfish/package.json'))
const destDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'engine')

mkdirSync(destDir, { recursive: true })

function findFile(dir, match) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) {
      const nested = findFile(path, match)
      if (nested) return nested
    } else if (match(entry.name)) {
      return path
    }
  }
  return null
}

const js = findFile(pkgDir, (name) => name === 'stockfish-18-lite-single.js')
const wasm = findFile(pkgDir, (name) => name === 'stockfish-18-lite-single.wasm')

if (!js || !wasm) {
  console.error('Could not find stockfish-18-lite-single.{js,wasm} under', pkgDir)
  process.exit(1)
}

copyFileSync(js, join(destDir, 'stockfish-18-lite-single.js'))
copyFileSync(wasm, join(destDir, 'stockfish-18-lite-single.wasm'))

if (!existsSync(join(destDir, 'stockfish-18-lite-single.wasm'))) {
  process.exit(1)
}

console.log('Copied Stockfish 18 lite-single to public/engine')
