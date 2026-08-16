import { Chess } from 'chess.js'
import { parseComment } from './tree'
import type { BuiltNode, TrainedSide } from './types'

function splitPgnGames(pgn: string): string[] {
  const chunks = pgn
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\n(?=\[Event )/g)
  return chunks.map((chunk) => chunk.trim()).filter(Boolean)
}

function header(pgn: string, key: string): string {
  const match = new RegExp(`\\[${key}\\s+"([^"]*)"\\]`, 'i').exec(pgn)
  return match?.[1] ?? ''
}

export type ImportedLine = {
  name: string
  eco: string | null
  side: TrainedSide
  nodes: BuiltNode[]
}

export function importPgn(
  pgn: string,
  options: { side?: TrainedSide; idFactory?: () => string } = {},
): ImportedLine[] {
  const games = splitPgnGames(pgn)
  if (games.length === 0 && pgn.trim()) games.push(pgn.trim())
  const idFactory = options.idFactory ?? (() => crypto.randomUUID())

  return games.map((game) => {
    const board = new Chess()
    try {
      board.loadPgn(game, { strict: false })
    } catch {
      throw new Error(`Could not parse PGN: ${header(game, 'Event') || 'untitled'}`)
    }
    if (board.history().length === 0) {
      throw new Error(`Could not parse PGN: ${header(game, 'Event') || 'untitled'}`)
    }

    const comments = new Map(board.getComments().map((row) => [row.fen, row.comment]))
    const history = board.history({ verbose: true })
    const replay = new Chess()
    const nodes: BuiltNode[] = []
    let parent: string | null = null
    const white = header(game, 'White').toLowerCase()
    const black = header(game, 'Black').toLowerCase()
    const side: TrainedSide =
      options.side ??
      (white.includes('me') || white === 'white' ? 'w' : black.includes('me') ? 'b' : 'w')

    history.forEach((move, index) => {
      const mover: TrainedSide = replay.turn()
      replay.move(move.san)
      const parsed = parseComment(comments.get(replay.fen()) ?? '')
      const isMine = mover === side
      nodes.push({
        id: idFactory(),
        parent_node_id: parent,
        fen: replay.fen(),
        ply: index + 1,
        san: move.san,
        is_mine: isMine,
        source: 'repertoire',
        reason_tags: isMine ? parsed.tags : [],
        reason_text: isMine ? parsed.text || null : parsed.text || null,
        alternatives: parsed.alternatives,
        explorer_stats: null,
        frequency_weight: 1,
      })
      parent = nodes[nodes.length - 1]!.id
    })

    return {
      name: header(game, 'Opening') || header(game, 'Event') || 'Imported line',
      eco: header(game, 'ECO') || null,
      side,
      nodes,
    }
  })
}
