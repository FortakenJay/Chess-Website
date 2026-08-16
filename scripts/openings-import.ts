/**
 * Import a repertoire PGN into opening_nodes. Comments like
 * `{prophylaxis: stops ...e5}` become reason tags. No UI.
 *
 *   npx tsx scripts/openings-import.ts --file repertoire.pgn --side w --username hikaru
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { importPgn } from '../src/lib/openings/importPgn.ts'
import { saveOpening } from '../src/lib/openings/persist.ts'
import { getServiceClient } from '../src/lib/supabase/admin.ts'
import { normalizeUsername } from '../src/lib/username.ts'
import type { KnowledgeCard, TrainedSide } from '../src/lib/openings/types.ts'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

async function loadEnvFiles() {
  for (const name of ['.env.local', '.env']) {
    try {
      const text = await readFile(path.join(ROOT, name), 'utf8')
      for (const raw of text.split(/\r?\n/)) {
        const line = raw.trim()
        if (!line || line.startsWith('#')) continue
        const eq = line.indexOf('=')
        if (eq <= 0) continue
        const key = line.slice(0, eq).trim()
        let value = line.slice(eq + 1).trim()
        if (
          (value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))
        ) {
          value = value.slice(1, -1)
        }
        if (process.env[key] == null || process.env[key] === '') process.env[key] = value
      }
    } catch {
      // optional
    }
  }
}

function arg(flag: string): string | undefined {
  const index = process.argv.indexOf(flag)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

function stubCard(name: string, side: TrainedSide, eco: string | null, moveOrder: string): KnowledgeCard {
  return {
    name,
    side,
    eco: eco ?? undefined,
    move_order: moveOrder,
    one_line_argument: 'Imported repertoire line. Annotate the card before treating this as understood.',
    their_argument: 'Opponent ideas are not annotated yet.',
    center: { type: 'tense', structure_family: 'imported' },
    space_and_targets: { who_has_space: 'unknown', my_targets: ['d4'], their_targets: ['d5'] },
    breaks: {
      mine: [{ move: 'none - maneuvering only', why: 'Imported line; add the real pawn break on the card.' }],
      theirs: [{ move: 'none - maneuvering only', why: 'Imported line; add their break on the card.' }],
    },
    problem_pieces: { mine: 'Bc1', theirs: 'Bc8' },
    move_order_logic: [],
    expected_deviations: [],
    traps: [],
    typical_endgame: 'unknown',
    theory_load: 3,
    style_fit: 'imported',
  }
}

async function main() {
  await loadEnvFiles()
  const file = arg('--file')
  const username = arg('--username')
  const side = (arg('--side') === 'b' ? 'b' : 'w') as TrainedSide
  if (!file || !username) {
    console.error('Usage: npx tsx scripts/openings-import.ts --file line.pgn --username <handle> [--side w|b]')
    process.exit(1)
  }
  const pgn = await readFile(path.resolve(file), 'utf8')
  const lines = importPgn(pgn, { side })
  const client = getServiceClient()
  const handle = normalizeUsername(username)
  for (const line of lines) {
    const moveOrder = line.nodes.map((node) => node.san).join(' ')
    const card = stubCard(line.name, line.side, line.eco, moveOrder)
    const id = await saveOpening(
      client,
      {
        name: line.name,
        eco: line.eco,
        side: line.side,
        structure_family: 'imported',
        center_type: 'tense',
        theory_load: 3,
        knowledge_card: card,
        nodes: line.nodes,
        targets: {
          my_breaks: ['none - maneuvering only'],
          their_breaks: ['none - maneuvering only'],
          my_good_squares: [],
          their_good_squares: [],
          my_problem_piece: 'Bc1',
          their_problem_piece: 'Bc8',
          typical_endgame: null,
          tempo_traps: [],
        },
      },
      handle,
    )
    console.log(`${line.name}: ${line.nodes.length} nodes id=${id}`)
  }
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
