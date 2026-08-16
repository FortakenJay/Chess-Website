/**
 * For each repertoire node, fetch Lichess explorer replies at rating ±100.
 * Stores stats on the node. Creates child nodes for replies ≥1.5% that are
 * not already in the tree. Does not invent reasons.
 *
 *   npx tsx scripts/openings-explorer.ts --username hikaru --rating 1700
 */
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  expandNodeFromExplorer,
  explorerForFen,
} from '../src/lib/openings/explorer.ts'
import { insertExplorerNodes } from '../src/lib/openings/persist.ts'
import { getServiceClient } from '../src/lib/supabase/admin.ts'
import { normalizeUsername } from '../src/lib/username.ts'
import type { BuiltNode } from '../src/lib/openings/types.ts'
import type { Json } from '../src/lib/supabase/database.types.ts'

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

async function main() {
  await loadEnvFiles()
  const username = arg('--username')
  const rating = Number(arg('--rating') ?? '1600')
  if (!username || !Number.isFinite(rating)) {
    console.error('Usage: npx tsx scripts/openings-explorer.ts --username <handle> [--rating 1600]')
    process.exit(1)
  }
  const handle = normalizeUsername(username)
  const client = getServiceClient()
  const shared = await client.from('openings').select('id, side, name').is('username', null)
  if (shared.error) throw shared.error
  const personal = await client.from('openings').select('id, side, name').eq('username', handle)
  if (personal.error) throw personal.error
  const openings = [...(shared.data ?? []), ...(personal.data ?? [])]

  let added = 0
  let scanned = 0
  for (const opening of openings ?? []) {
    const { data: rows, error: nodeError } = await client
      .from('opening_nodes')
      .select('*')
      .eq('opening_id', opening.id)
      .order('ply')
    if (nodeError) throw nodeError
    const byParent = new Map<string | null, typeof rows>()
    for (const row of rows ?? []) {
      const key = row.parent_node_id
      const list = byParent.get(key) ?? []
      list.push(row)
      byParent.set(key, list)
    }

    for (const row of rows ?? []) {
      if (row.source !== 'repertoire') continue
      scanned += 1
      let replies
      try {
        replies = await explorerForFen(row.fen, rating)
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        console.warn(`explorer skip ${opening.name} ply ${row.ply} ${row.san}: ${message}`)
        if (message.includes('429')) {
          console.error(
            'Lichess explorer is rate-limiting. Retry later: npm run openings:explorer -- --username <handle> --rating 1600',
          )
          process.exit(1)
        }
        continue
      }
      const current: BuiltNode = {
        id: row.id,
        opening_id: row.opening_id,
        parent_node_id: row.parent_node_id,
        fen: row.fen,
        ply: row.ply,
        san: row.san,
        is_mine: row.is_mine,
        source: 'repertoire',
        reason_tags: [],
        reason_text: row.reason_text,
        alternatives: [],
        explorer_stats: null,
        frequency_weight: row.frequency_weight ?? 1,
      }
      const children = (byParent.get(row.id) ?? []).map((child) => ({
        ...current,
        id: child.id,
        san: child.san,
        parent_node_id: child.parent_node_id,
      }))
      const expansion = expandNodeFromExplorer(
        current,
        replies,
        opening.side === 'b' ? 'b' : 'w',
        children,
      )
      const { error: statsError } = await client
        .from('opening_nodes')
        .update({ explorer_stats: expansion.stats as unknown as Json })
        .eq('id', row.id)
      if (statsError) throw statsError
      if (expansion.newNodes.length) {
        await insertExplorerNodes(client, opening.id, row.id, expansion.newNodes)
        added += expansion.newNodes.length
        console.log(
          `${opening.name} ply ${row.ply} ${row.san}: +${expansion.newNodes.length} explorer replies`,
        )
      }
      await new Promise((r) => setTimeout(r, 150))
    }
  }
  console.log(`Scanned ${scanned} repertoire nodes, added ${added} explorer deviations.`)
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
