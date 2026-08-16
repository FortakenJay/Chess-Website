import { builtOpeningFromCard } from './buildFromCard'
import { commentaryKey } from './evidence'
import { importPgn, mergeImportedLines, type ImportedLine } from './importPgn'
import { lessonFromOpening } from './lessonFromOpening'
import { formatMoveOrder, parseMoveOrderSans } from './tree'
import type { BuiltNode, BuiltOpening, TrainedSide } from './types'

export function openingFromDownloadHit(input: {
  name: string
  eco?: string | null
  moves: string
  side: TrainedSide
}): BuiltOpening {
  const name = input.name?.trim()
  const moves = input.moves?.trim()
  if (!name || !moves) throw new Error('That download has no name or moves')
  const sans = parseMoveOrderSans(moves)
  if (!sans.length) throw new Error('That line has no moves')
  return builtOpeningFromCard(
    lessonFromOpening({
      name,
      eco: input.eco?.trim() || null,
      moves: formatMoveOrder(sans),
      side: input.side,
    }),
  )
}

export function mainlineSans(nodes: BuiltNode[]): string[] {
  const sans: string[] = []
  let parent: string | null = null
  const used = new Set<string>()
  while (true) {
    const child = nodes.find((node) => node.parent_node_id === parent && !used.has(node.id))
    if (!child) break
    used.add(child.id)
    sans.push(child.san)
    parent = child.id
  }
  return sans
}

export function openingFromImportedLine(line: ImportedLine): BuiltOpening {
  const sans = mainlineSans(line.nodes)
  if (!sans.length) throw new Error('That PGN has no moves')
  const card = lessonFromOpening({
    name: line.name,
    eco: line.eco,
    moves: formatMoveOrder(sans),
    side: line.side,
  })
  if (card.low_confidence) {
    card.provenance = 'imported'
    const commentaries = { ...(card.commentaries ?? {}) }
    for (const node of line.nodes) {
      if (node.commentary) commentaries[commentaryKey(node.ply, node.san)] = node.commentary
    }
    card.commentaries = commentaries
  }
  const built = builtOpeningFromCard(card)
  const overlay = line.nodes.map((node) => {
    const match = built.nodes.find((row) => row.ply === node.ply && row.san === node.san)
    return {
      ...node,
      reason_tags: node.reason_tags.length ? node.reason_tags : (match?.reason_tags ?? []),
      reason_text: node.reason_text ?? match?.reason_text ?? null,
      commentary: node.commentary ?? match?.commentary ?? null,
    }
  })
  return { ...built, knowledge_card: card, nodes: overlay }
}

export function openingFromPgn(pgn: string, side: TrainedSide): BuiltOpening {
  const merged = mergeImportedLines(importPgn(pgn, { side }))
  if (!merged) throw new Error('Could not parse that PGN')
  return openingFromImportedLine(merged)
}
