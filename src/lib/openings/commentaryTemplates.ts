import { Chess } from 'chess.js'
import { explainPlayedMove, fPawnBlocked } from './explainMove'
import {
  commentaryKey,
  emptyCommentary,
  gatherMoveEvidence,
  isBoardSquare,
  positionPhase,
} from './evidence'
import {
  COMMENTARY_GENERATOR_VERSION,
  type MoveCommentary,
  type MoveOrderLogic,
} from './types'

function joinList(items: string[]): string {
  if (items.length === 0) return ''
  if (items.length === 1) return items[0]!
  if (items.length === 2) return `${items[0]} and ${items[1]}`
  return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`
}

function omittedConsequence(before: Chess, san: string): string | undefined {
  if (san === 'O-O' || san === 'O-O-O') {
    return 'Leaving the king on the e-file keeps it in the center after the first pawn trade.'
  }
  const clone = new Chess(before.fen())
  const played = clone.move(san)
  if (!played) return undefined
  if (played.piece === 'n' || played.piece === 'b') {
    const word = played.piece === 'n' ? 'knight' : 'bishop'
    return `The ${word} stays on ${played.from} and ${played.to} stays empty.`
  }
  if (played.piece === 'p') {
    return `${played.to} stays unoccupied, so the opponent is not yet asked to contest that square.`
  }
  return undefined
}

/**
 * Fill the teaching rubric from proven board (and optional engine) facts.
 * Omit a section when the underlying fact cannot be shown.
 */
export function commentaryFromEvidence(
  before: Chess,
  san: string,
  ply: number,
  logic?: MoveOrderLogic,
): MoveCommentary | null {
  const evidence = gatherMoveEvidence(before, san, ply)
  if (!evidence) return null
  const clone = new Chess(before.fen())
  const played = clone.move(san)
  if (!played) return null

  const dest = played.to
  const problem =
    played.san === 'O-O' || played.san === 'O-O-O'
      ? 'Get the king off the center files before they open.'
      : played.captured
        ? `Take the unit on ${dest}.`
        : played.piece === 'p'
          ? `Occupy ${dest} and fight for the center.`
          : `Get the ${
              played.piece === 'n'
                ? 'knight'
                : played.piece === 'b'
                  ? 'bishop'
                  : played.piece === 'r'
                    ? 'rook'
                    : played.piece === 'q'
                      ? 'queen'
                      : 'king'
            } into the game.`

  const bits: string[] = []
  if (played.captured) bits.push(`takes on ${dest}`)
  else bits.push(`occupies ${dest}`)
  if (evidence.attacks.length) bits.push(`attacks ${joinList(evidence.attacks)}`)
  if (evidence.defends.length) bits.push(`defends ${joinList(evidence.defends)}`)
  if (evidence.opened.length) bits.push(`opens ${joinList(evidence.opened)}`)
  if (played.piece === 'n' && fPawnBlocked(clone, played.color)) {
    bits.push(
      `sits on ${dest}, so ${played.color === 'w' ? 'f2–f4' : 'f7–f5'} is illegal until this knight moves`,
    )
  }
  const accomplishes = bits.length ? `${bits.join(', ')}.` : undefined

  const enables = evidence.legal_breaks[0]
    ? `The legal pawn strike now on the board is ${evidence.legal_breaks[0]}.`
    : evidence.opened.length
      ? `${joinList(evidence.opened)} can use the newly opened line.`
      : undefined

  let drawback: string | undefined
  if (evidence.blocked_breaks.length) {
    drawback = `${joinList(evidence.blocked_breaks)} is not legal in this position.`
  }
  if (evidence.engine_best_san && evidence.engine_best_san !== played.san) {
    const line = `Stockfish’s first choice here is ${evidence.engine_best_san}; this is the repertoire move.`
    drawback = drawback ? `${drawback} ${line}` : line
  }

  const why = logic?.why ?? accomplishes ?? `Plays ${played.san}.`
  const hasGeometry = Boolean(
    evidence.attacks.length ||
      evidence.defends.length ||
      evidence.controls.length ||
      evidence.opened.length ||
      evidence.blocked_breaks.length,
  )

  return emptyCommentary(evidence, why, {
    problem,
    accomplishes,
    attacks: evidence.attacks.length ? evidence.attacks : undefined,
    defends: evidence.defends.length ? evidence.defends : undefined,
    controls: evidence.controls.length ? evidence.controls : undefined,
    enables,
    drawback,
    if_omitted: omittedConsequence(before, san),
    position_type: positionPhase(clone, ply),
    confidence: hasGeometry ? 'evidence' : 'basic',
    provenance: 'template',
    generator_version: COMMENTARY_GENERATOR_VERSION,
  })
}

export function attachEngineToCommentary(
  commentary: MoveCommentary,
  bestSan: string | null,
  replySan: string | null,
): MoveCommentary {
  const evidence = {
    ...commentary.evidence,
    engine_best_san: bestSan,
    engine_reply_san: replySan,
  }
  let drawback = commentary.drawback
  if (bestSan && bestSan !== commentary.evidence.san && !drawback?.includes('Stockfish')) {
    drawback = `Stockfish’s first choice here is ${bestSan}; this is the repertoire move.`
  }
  return {
    ...commentary,
    drawback,
    evidence,
    confidence: commentary.confidence === 'basic' ? 'evidence' : commentary.confidence,
  }
}

export function commentariesFromMainline(sans: string[]): Record<string, MoveCommentary> {
  const board = new Chess()
  const out: Record<string, MoveCommentary> = {}
  sans.forEach((san, index) => {
    const ply = index + 1
    const commentary = commentaryFromEvidence(board, san, ply, explainPlayedMove(board, san, ply))
    if (commentary) out[commentaryKey(ply, commentary.evidence.san)] = commentary
    if (!board.move(san)) return
  })
  return out
}

export function squaresNamedIn(text: string): string[] {
  return [...text.matchAll(/\b([a-h][1-8])\b/g)].map((match) => match[1]!).filter(isBoardSquare)
}

export function claimsAttack(text: string, unit: string): boolean {
  return text.toLowerCase().includes(unit.toLowerCase())
}
