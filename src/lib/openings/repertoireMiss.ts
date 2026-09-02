import type { AnalyzedPly } from '@/lib/analysis/types'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export function boardFenKey(fen: string) {
  return fen.split(' ').slice(0, 4).join(' ')
}

export type RepertoireMove = {
  fen: string
  parentFen: string | null
  san: string
  isMine: boolean
  source: string
}

export function repertoireMovesFromNodes(
  nodes: Array<{
    id: string
    parent_node_id: string | null
    fen: string
    san: string
    is_mine: boolean
    source: string
  }>,
): RepertoireMove[] {
  const byId = new Map(nodes.map((node) => [node.id, node]))
  return nodes.map((node) => {
    const parent = node.parent_node_id ? byId.get(node.parent_node_id) : null
    return {
      fen: node.fen,
      parentFen: parent?.fen ?? (node.parent_node_id ? null : START_FEN),
      san: node.san,
      isMine: node.is_mine,
      source: node.source === 'explorer' ? 'explorer' : 'repertoire',
    }
  })
}

/** Positions where we have a taught repertoire reply. */
export function repertoireSansAt(
  nodes: RepertoireMove[],
  fenBefore: string,
): string[] {
  const key = boardFenKey(fenBefore)
  const sans: string[] = []
  for (const node of nodes) {
    if (!node.isMine || node.source !== 'repertoire') continue
    if (!node.parentFen) continue
    if (boardFenKey(node.parentFen) !== key) continue
    if (node.san && !sans.includes(node.san)) sans.push(node.san)
  }
  return sans
}

/**
 * User plies that left a taught repertoire branch. Separate from engine leak quality.
 * Only marks when the position is in the tree — unknown FENs are not misses.
 */
export function repertoireMissPlies(
  plies: AnalyzedPly[],
  nodes: RepertoireMove[],
): Set<number> {
  const missed = new Set<number>()
  if (nodes.length === 0) return missed
  for (const ply of plies) {
    if (!ply.isUserMove) continue
    const taught = repertoireSansAt(nodes, ply.fenBefore)
    if (taught.length === 0) continue
    if (!taught.includes(ply.san)) missed.add(ply.ply)
  }
  return missed
}
