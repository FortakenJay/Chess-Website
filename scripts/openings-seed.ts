/**
 * Seed the hand-written opening cards (shared catalog, username null).
 *
 *   npx tsx scripts/openings-seed.ts
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { buildFromCard } from '../src/lib/openings/buildFromCard.ts'
import { saveOpening } from '../src/lib/openings/persist.ts'
import { SEED_CARDS } from '../src/lib/openings/seed/index.ts'
import { getServiceClient } from '../src/lib/supabase/admin.ts'

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

async function main() {
  await loadEnvFiles()
  const client = getServiceClient()
  for (const card of SEED_CARDS) {
    const built = buildFromCard(card)
    const id = await saveOpening(
      client,
      {
        name: card.name,
        eco: card.eco ?? null,
        side: card.side,
        structure_family: card.center.structure_family,
        center_type: built.center_type,
        theory_load: card.theory_load,
        knowledge_card: card,
        nodes: built.nodes,
        targets: built.targets,
      },
      null,
    )
    const mine = built.nodes.filter((node) => node.is_mine).length
    console.log(`${card.name}: ${built.nodes.length} nodes (${mine} yours) id=${id}`)
  }
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
