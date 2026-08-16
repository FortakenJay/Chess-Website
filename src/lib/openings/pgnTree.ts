import { Chess } from 'chess.js'
import { parseComment } from './tree'
import {
  COMMENTARY_GENERATOR_VERSION,
  type BuiltNode,
  type MoveCommentary,
  type NodeSource,
  type TrainedSide,
} from './types'

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

type Token =
  | { type: 'san'; value: string }
  | { type: 'comment'; value: string }
  | { type: 'nag'; value: string }
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'result' }

export type ParsedPgnGame = {
  name: string
  eco: string | null
  chapter: string | null
  side: TrainedSide
  nodes: BuiltNode[]
}

function header(pgn: string, key: string): string {
  const match = new RegExp(`\\[${key}\\s+"([^"]*)"\\]`, 'i').exec(pgn)
  return match?.[1] ?? ''
}

export function splitPgnGames(pgn: string): string[] {
  const chunks = pgn
    .replace(/^\uFEFF/, '')
    .trim()
    .split(/\n(?=\[Event )/g)
  return chunks.map((chunk) => chunk.trim()).filter(Boolean)
}

function moveTextOf(pgn: string): string {
  const stripped = pgn.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
  const blank = stripped.search(/\n\s*\n/)
  if (blank >= 0 && stripped.trimStart().startsWith('[')) {
    return stripped.slice(blank).trim()
  }
  return stripped.replace(/\[[^\]]*\]/g, ' ').trim()
}

function tokenize(moveText: string): Token[] {
  const tokens: Token[] = []
  let i = 0
  const text = moveText
  while (i < text.length) {
    const ch = text[i]!
    if (/\s/.test(ch)) {
      i += 1
      continue
    }
    if (ch === '{') {
      let depth = 1
      let j = i + 1
      while (j < text.length && depth > 0) {
        if (text[j] === '{') depth += 1
        else if (text[j] === '}') depth -= 1
        j += 1
      }
      tokens.push({ type: 'comment', value: text.slice(i + 1, j - 1) })
      i = j
      continue
    }
    if (ch === ';') {
      const end = text.indexOf('\n', i)
      i = end === -1 ? text.length : end + 1
      continue
    }
    if (ch === '(') {
      tokens.push({ type: 'lparen' })
      i += 1
      continue
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen' })
      i += 1
      continue
    }
    if (ch === '$') {
      let j = i + 1
      while (j < text.length && /\d/.test(text[j]!)) j += 1
      tokens.push({ type: 'nag', value: text.slice(i, j) })
      i = j
      continue
    }
    const rest = text.slice(i)
    if (/^(1-0|0-1|1\/2-1\/2|\*)$/.test(rest)) {
      tokens.push({ type: 'result' })
      break
    }
    if (/^\d+\.+\s*/.test(rest)) {
      const m = /^\d+\.+\s*/.exec(rest)!
      i += m[0].length
      continue
    }
    const sanMatch = /^(O-O-O|O-O|0-0-0|0-0|[NBRQK]?[a-h]?[1-8]?x?[a-h][1-8](?:=[NBRQnbrq])?[+#]?|--)/.exec(
      rest,
    )
    if (sanMatch) {
      let san = sanMatch[1]!.replace(/0-0-0/g, 'O-O-O').replace(/0-0/g, 'O-O')
      i += sanMatch[0].length
      while (i < text.length && /[!?]/.test(text[i]!)) i += 1
      tokens.push({ type: 'san', value: san })
      continue
    }
    i += 1
  }
  return tokens
}

function importedCommentary(text: string, fen: string, fenBefore: string, san: string, ply: number): MoveCommentary | null {
  const cleaned = text.replace(/\s*\[%[^\]]*\]\s*/g, ' ').trim()
  if (!cleaned) return null
  return {
    why: cleaned,
    confidence: 'imported',
    provenance: 'imported',
    generator_version: COMMENTARY_GENERATOR_VERSION,
    evidence: {
      fen,
      fen_before: fenBefore,
      san,
      ply,
      attacks: [],
      defends: [],
      controls: [],
      opened: [],
      blocked_breaks: [],
      legal_breaks: [],
    },
  }
}

function parseVariation(
  tokens: Token[],
  start: number,
  board: Chess,
  parentId: string | null,
  parentPly: number,
  side: TrainedSide,
  idFactory: () => string,
  nodes: BuiltNode[],
  beforeById: Map<string, string>,
): number {
  let i = start
  let parent = parentId
  let ply = parentPly
  let last: BuiltNode | null = null
  let pendingComment = ''

  const flushComment = (node: BuiltNode) => {
    if (!pendingComment.trim()) return
    const parsed = parseComment(pendingComment)
    if (node.is_mine) {
      node.reason_tags = parsed.tags.length ? parsed.tags : node.reason_tags
      node.reason_text = parsed.text || node.reason_text
      node.alternatives = parsed.alternatives.length ? parsed.alternatives : node.alternatives
    } else if (parsed.text) {
      node.reason_text = parsed.text
    }
    const fenBefore = beforeById.get(node.id) ?? START_FEN
    node.commentary = importedCommentary(
      parsed.text || pendingComment,
      node.fen,
      fenBefore,
      node.san,
      node.ply,
    )
    pendingComment = ''
  }

  while (i < tokens.length) {
    const token = tokens[i]!
    if (token.type === 'result' || token.type === 'rparen') return i
    if (token.type === 'lparen') {
      if (!last) {
        i += 1
        continue
      }
      const parentFen = beforeById.get(last.id) ?? START_FEN
      const fork = new Chess(parentFen)
      i = parseVariation(
        tokens,
        i + 1,
        fork,
        last.parent_node_id,
        last.ply - 1,
        side,
        idFactory,
        nodes,
        beforeById,
      )
      if (tokens[i]?.type === 'rparen') i += 1
      continue
    }
    if (token.type === 'comment') {
      pendingComment = pendingComment ? `${pendingComment} ${token.value}` : token.value
      if (last) flushComment(last)
      i += 1
      continue
    }
    if (token.type === 'nag') {
      i += 1
      continue
    }
    if (token.type === 'san') {
      if (token.value === '--') {
        i += 1
        continue
      }
      const fenBefore = board.fen()
      const mover: TrainedSide = board.turn()
      let played
      try {
        played = board.move(token.value)
      } catch {
        played = null
      }
      if (!played) {
        i += 1
        continue
      }
      const node: BuiltNode = {
        id: idFactory(),
        parent_node_id: parent,
        fen: board.fen(),
        ply: ply + 1,
        san: played.san,
        is_mine: mover === side,
        source: 'repertoire' satisfies NodeSource,
        reason_tags: [],
        reason_text: null,
        alternatives: [],
        explorer_stats: null,
        frequency_weight: 1,
        commentary: null,
      }
      beforeById.set(node.id, fenBefore)
      nodes.push(node)
      last = node
      parent = node.id
      ply = node.ply
      if (pendingComment) flushComment(node)
      i += 1
      continue
    }
    i += 1
  }
  return i
}

export function parsePgnTree(
  pgn: string,
  options: { side?: TrainedSide; idFactory?: () => string } = {},
): ParsedPgnGame[] {
  const games = splitPgnGames(pgn)
  if (games.length === 0 && pgn.trim()) games.push(pgn.trim())
  const idFactory = options.idFactory ?? (() => crypto.randomUUID())

  return games.map((game) => {
    const white = header(game, 'White').toLowerCase()
    const black = header(game, 'Black').toLowerCase()
    const side: TrainedSide =
      options.side ??
      (white.includes('me') || white === 'white' ? 'w' : black.includes('me') ? 'b' : 'w')
    const tokens = tokenize(moveTextOf(game))
    const board = new Chess()
    const nodes: BuiltNode[] = []
    parseVariation(tokens, 0, board, null, 0, side, idFactory, nodes, new Map())
    if (nodes.length === 0) {
      throw new Error(`Could not parse PGN: ${header(game, 'Event') || 'untitled'}`)
    }
    const event = header(game, 'Event')
    const opening = header(game, 'Opening')
    return {
      name: opening || event || 'Imported line',
      eco: header(game, 'ECO') || null,
      chapter: event || opening || null,
      side,
      nodes,
    }
  })
}

export function parseLichessStudyId(input: string): string | null {
  const trimmed = input.trim()
  const fromUrl = /lichess\.org\/study\/([a-zA-Z0-9]{8,12})/i.exec(trimmed)
  if (fromUrl) return fromUrl[1]!
  if (/^[a-zA-Z0-9]{8,12}$/.test(trimmed)) return trimmed
  return null
}
