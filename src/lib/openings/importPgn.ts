import { parsePgnTree, type ParsedPgnGame } from './pgnTree'
import type { BuiltNode, TrainedSide } from './types'

export type ImportedLine = {
  name: string
  eco: string | null
  side: TrainedSide
  nodes: BuiltNode[]
  chapter?: string | null
}

export function importPgn(
  pgn: string,
  options: { side?: TrainedSide; idFactory?: () => string } = {},
): ImportedLine[] {
  return parsePgnTree(pgn, options).map((game: ParsedPgnGame) => ({
    name: game.name,
    eco: game.eco,
    side: game.side,
    nodes: game.nodes,
    chapter: game.chapter,
  }))
}

export function mergeImportedLines(lines: ImportedLine[]): ImportedLine | null {
  if (!lines.length) return null
  const root = lines[0]!
  const nodes = [...root.nodes]
  const seen = new Set(nodes.map((node) => `${node.parent_node_id ?? 'root'}:${node.san}`))
  for (const line of lines.slice(1)) {
    const idMap = new Map<string, string>()
    for (const node of line.nodes) {
      const parent = node.parent_node_id ? (idMap.get(node.parent_node_id) ?? node.parent_node_id) : null
      const key = `${parent ?? 'root'}:${node.san}`
      const existing = nodes.find((row) => `${row.parent_node_id ?? 'root'}:${row.san}` === key)
      if (existing) {
        idMap.set(node.id, existing.id)
        if (!existing.reason_text && node.reason_text) existing.reason_text = node.reason_text
        if (!existing.commentary && node.commentary) existing.commentary = node.commentary
        if (!existing.reason_tags.length && node.reason_tags.length) existing.reason_tags = node.reason_tags
        continue
      }
      const copy = { ...node, parent_node_id: parent }
      nodes.push(copy)
      idMap.set(node.id, copy.id)
      seen.add(key)
    }
  }
  return { ...root, nodes }
}
