/**
 * Build the local move-level ECO lookup used by the classifier.
 * Source: @chess-openings/eco.json (MIT), generated from JeffML/eco.json.
 */
import { openingBook } from '@chess-openings/eco.json'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, 'src', 'lib', 'analysis', 'openingBookPositions.json')
const MAX_PLIES = 20

function plyCount(moves) {
  return moves
    .split(/\s+/)
    .filter((token) => token && !/^\d+\.{1,3}$/.test(token))
    .length
}

const openings = await openingBook()
const positions = new Set()

for (const [fen, opening] of Object.entries(openings)) {
  if (plyCount(opening.moves) > MAX_PLIES) continue
  positions.add(fen.split(' ')[0])
}

const output = JSON.stringify([...positions].sort())
await writeFile(OUT, output)
console.log(`Wrote ${positions.size} opening positions (${output.length} bytes)`)
