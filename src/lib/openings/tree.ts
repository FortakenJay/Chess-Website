import { Chess } from 'chess.js'
import { isReasonTag, type ReasonTag } from './tags'
import type { BuiltNode, MoveOrderLogic, NodeAlternative, TrainedSide } from './types'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export function parseMoveOrderSans(moveOrder: string): string[] {
  return moveOrder
    .replace(/\{[^}]*\}/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .split(/\s+/)
    .map((token) => token.replace(/^\d+\.+\s*/, ''))
    .filter((token) => token && !/^\d+\.$/.test(token) && token !== '*')
}

export function formatMoveOrder(sans: string[]): string {
  const parts: string[] = []
  for (let i = 0; i < sans.length; i++) {
    const san = sans[i]!
    if (i % 2 === 0) parts.push(`${i / 2 + 1}.${san}`)
    else parts.push(san)
  }
  return parts.join(' ')
}

export function positionsAlong(sans: string[]): Array<{ fen: string; san: string | null; ply: number }> {
  const board = new Chess(START_FEN)
  const rows = [{ fen: board.fen(), san: null as string | null, ply: 0 }]
  for (let i = 0; i < sans.length; i++) {
    const played = board.move(sans[i]!)
    if (!played) break
    rows.push({ fen: board.fen(), san: played.san, ply: i + 1 })
  }
  return rows
}

export function matchLogic(
  logic: MoveOrderLogic[],
  ply: number,
  san: string,
): MoveOrderLogic | null {
  const moveNumber = Math.ceil(ply / 2)
  const isWhite = ply % 2 === 1
  const dotted = `${moveNumber}.${isWhite ? '' : '.'}${san}`
  const numbered = isWhite ? `${moveNumber}.${san}` : `${moveNumber}...${san}`
  return (
    logic.find((entry) => {
      const key = entry.move.replace(/\s+/g, '')
      return (
        key === san ||
        key === dotted.replace(/\s+/g, '') ||
        key === numbered.replace(/\s+/g, '') ||
        key.endsWith(san) && /\d/.test(key)
      )
    }) ?? null
  )
}

export function buildNodesFromSans(
  sans: string[],
  side: TrainedSide,
  logic: MoveOrderLogic[] = [],
  idFactory: () => string = () => crypto.randomUUID(),
): BuiltNode[] {
  const board = new Chess(START_FEN)
  const nodes: BuiltNode[] = []
  let parent: string | null = null

  for (let i = 0; i < sans.length; i++) {
    const san = sans[i]!
    const mover: TrainedSide = board.turn()
    const played = board.move(san)
    if (!played) {
      throw new Error(`Illegal move ${san} at ply ${i + 1}`)
    }
    const matched = matchLogic(logic, i + 1, played.san)
    const isMine = mover === side
    const tags = (matched?.tags ?? []).filter(isReasonTag)
    nodes.push({
      id: idFactory(),
      parent_node_id: parent,
      fen: board.fen(),
      ply: i + 1,
      san: played.san,
      is_mine: isMine,
      source: 'repertoire',
      reason_tags: isMine ? tags : [],
      reason_text: isMine ? (matched?.why ?? null) : null,
      alternatives: [],
      explorer_stats: null,
      frequency_weight: 1,
    })
    parent = nodes[nodes.length - 1]!.id
  }

  return nodes
}

export function parseComment(comment: string): {
  tags: ReasonTag[]
  text: string
  alternatives: NodeAlternative[]
} {
  const cleaned = comment.replace(/\s*\[%[^\]]*\]\s*/g, ' ').trim()
  const altMatch = /alt:([^;]+)/i.exec(cleaned)
  const alternatives: NodeAlternative[] = []
  if (altMatch) {
    for (const piece of altMatch[1]!.split(',')) {
      const [san, tag, ...why] = piece.trim().split(/\s+/)
      if (san && tag && isReasonTag(tag)) {
        alternatives.push({ san, tag, why_worse: why.join(' ') || 'Weaker than the repertoire move.' })
      }
    }
  }
  const withoutAlt = cleaned.replace(/alt:[^;]+;?/i, '').trim()
  const tagged = /^((?:[a-z_]+(?:,\s*)?)+):\s*(.+)$/.exec(withoutAlt)
  if (!tagged) return { tags: [], text: withoutAlt, alternatives }
  const tags = tagged[1]!.split(/,\s*/).filter(isReasonTag)
  return { tags, text: tagged[2]!.trim(), alternatives }
}
