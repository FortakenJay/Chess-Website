import { Chess, type Color, type PieceSymbol, type Square } from 'chess.js'
import type { MoveOrderLogic, PawnBreak, TrainedSide } from './types'
import type { ReasonTag } from './tags'

const PIECE_WORD: Record<PieceSymbol, string> = {
  p: 'pawn',
  n: 'knight',
  b: 'bishop',
  r: 'rook',
  q: 'queen',
  k: 'king',
}

export function numberedMove(ply: number, san: string): string {
  const n = Math.ceil(ply / 2)
  return ply % 2 === 1 ? `${n}.${san}` : `${n}...${san}`
}

export function destinationSquare(san: string): string | null {
  const clean = san.replace(/[+#]+$/g, '').replace(/=[QRBN]/, '')
  if (clean === 'O-O' || clean === 'O-O-O') return null
  const match = /[a-h][1-8]$/.exec(clean)
  return match?.[0] ?? null
}

function fPawnHome(color: Color): Square {
  return color === 'w' ? 'f2' : 'f7'
}

function fPawnOne(color: Color): Square {
  return color === 'w' ? 'f3' : 'f6'
}

/** f2–f4 / …f7–f5 needs the one-step square empty. A knight on f3 blocks it. */
export function fPawnBlocked(board: Chess, color: Color): boolean {
  const pawn = board.get(fPawnHome(color))
  if (!pawn || pawn.type !== 'p' || pawn.color !== color) return false
  return board.get(fPawnOne(color)) != null
}

function pieceWord(type: PieceSymbol): string {
  return PIECE_WORD[type]
}

function attackedSans(board: Chess, from: Square): string[] {
  return board
    .moves({ square: from, verbose: true })
    .filter((move) => Boolean(move.captured))
    .map((move) => `${move.captured === 'p' ? 'pawn' : pieceWord(move.captured as PieceSymbol)} on ${move.to}`)
}

function openedSliders(before: Chess, after: Chess, color: Color): string[] {
  const opens: string[] = []
  const bishops = color === 'w' ? (['c1', 'f1'] as const) : (['c8', 'f8'] as const)
  const queen = color === 'w' ? 'd1' : 'd8'
  for (const square of [...bishops, queen]) {
    const piece = after.get(square as Square)
    if (!piece || piece.color !== color) continue
    const beforeCount = before.moves({ square: square as Square }).length
    const afterCount = after.moves({ square: square as Square }).length
    if (afterCount > beforeCount) {
      opens.push(piece.type === 'q' ? `Q${square}` : `B${square}`)
    }
  }
  return opens
}

/**
 * Comment a real move from the board. Geometry and occupancy only — no evals,
 * no invented explorer frequencies.
 */
export function explainPlayedMove(before: Chess, san: string, ply: number): MoveOrderLogic {
  const move = numberedMove(ply, san)
  const clone = new Chess(before.fen())
  const played = clone.move(san)
  if (!played) {
    return heuristicFromSan(ply, san)
  }

  const color = played.color
  const dest = played.to
  const blockedAfter = fPawnBlocked(clone, color)
  const blockedBefore = fPawnBlocked(before, color)
  const hits = attackedSans(clone, dest)
  const sliders = openedSliders(before, clone, color)
  const leftFfile =
    played.piece === 'n' &&
    played.from === fPawnOne(color) &&
    blockedBefore &&
    !blockedAfter

  if (played.san === 'O-O' || played.san === 'O-O-O') {
    return {
      move,
      tags: ['king_safety'],
      why:
        played.san === 'O-O'
          ? 'Castles short so the king leaves the center before files open, and the rook can use the f-file later.'
          : 'Castles long so the king leaves the e-file and a rook can use the d-file.',
    }
  }

  if (played.captured) {
    const tags: ReasonTag[] = ['tempo_gain']
    if (played.san.includes('+')) tags.push('king_safety')
    return {
      move,
      tags,
      why: `Takes the ${pieceWord(played.captured)} on ${dest}${
        leftFfile
          ? `, and leaves ${fPawnOne(color)}, so the f-pawn can later go to ${color === 'w' ? 'f4' : 'f5'}`
          : ''
      }.${played.san.includes('+') ? ' It also checks.' : ' Recapture or a concession is forced.'}`,
    }
  }

  if (played.piece === 'p') {
    const tags: ReasonTag[] = ['control_square']
    const extra: string[] = []
    if (sliders.length) extra.push(`opens ${sliders.join(' and ')}`)
    if (played.to === 'e4' || played.to === 'e5' || played.to === 'd4' || played.to === 'd5') {
      extra.push(`asks the opponent to contest ${dest}`)
    }
    if (hits.length) extra.push(`now hits ${hits.slice(0, 2).join(' and ')}`)
    return {
      move,
      tags,
      why: `Takes ${dest}${extra.length ? ` and ${extra.join(', ')}` : ' and fights for the center'}.`,
    }
  }

  const tags: ReasonTag[] = ['develop']
  const bits: string[] = [
    `Develops the ${pieceWord(played.piece)} to ${dest}`,
  ]
  if (hits.length) {
    tags.push('tempo_gain')
    bits.push(`attacking ${hits.slice(0, 2).join(' and ')}`)
  }
  if (played.piece === 'n' && dest === fPawnOne(color) && blockedAfter) {
    bits.push(
      `sitting on ${dest}, so the f-pawn cannot yet go two squares (${
        color === 'w' ? 'f2–f4' : 'f7–f5'
      }) until this knight moves`,
    )
  }
  if (leftFfile) {
    tags.push('break_prep')
    bits.push(
      `leaving ${played.from}, so the f-pawn is free to go to ${color === 'w' ? 'f4' : 'f5'} later`,
    )
  }
  if (played.piece === 'n' && (dest === 'f3' || dest === 'f6') && !blockedAfter) {
    bits.push('covering the center and preparing short castling')
  }
  if ((played.piece === 'b' || played.piece === 'n') && (dest === 'c4' || dest === 'c5' || dest === 'f7' || dest === 'f2')) {
    bits.push(`looking at ${dest === 'c4' || dest === 'c5' ? 'the center and f7/f2' : dest}`)
  }
  if (clone.isCheck()) bits.push('and it checks')

  const why = `${bits.join(', ')}.`
  return { move, tags: [...new Set(tags)], why }
}

/** Fallback when SAN cannot be replayed (tests, truncated lines). */
export function heuristicFromSan(ply: number, san: string): MoveOrderLogic {
  const move = numberedMove(ply, san)
  const dest = destinationSquare(san)
  if (san === 'O-O' || san === 'O-O-O') {
    return {
      move,
      tags: ['king_safety'],
      why:
        san === 'O-O'
          ? 'Castles short so the king leaves the center before files open.'
          : 'Castles long so the king leaves the e-file and a rook can use the d-file.',
    }
  }
  if (san.includes('x') && dest) {
    return {
      move,
      tags: ['tempo_gain'],
      why: `Takes on ${dest} and forces a recapture or a concession.`,
    }
  }
  if (/^[NBRQK]/.test(san) && dest) {
    const piece =
      san[0] === 'N'
        ? 'knight'
        : san[0] === 'B'
          ? 'bishop'
          : san[0] === 'R'
            ? 'rook'
            : san[0] === 'Q'
              ? 'queen'
              : 'king'
    return {
      move,
      tags: ['develop'],
      why: `Develops the ${piece} toward ${dest}.`,
    }
  }
  if (dest) {
    return {
      move,
      tags: ['control_square'],
      why: `Takes ${dest} and asks the opponent to contest the center.`,
    }
  }
  return {
    move,
    tags: ['develop'],
    why: 'Puts a piece into the game and prepares the next developing move.',
  }
}

export function heuristicMoveLogic(ply: number, san: string, before?: Chess): MoveOrderLogic {
  if (before) return explainPlayedMove(before, san, ply)
  if (ply === 1) {
    const start = new Chess()
    return explainPlayedMove(start, san, ply)
  }
  return heuristicFromSan(ply, san)
}

export function breaksFromBoard(board: Chess, side: TrainedSide): { mine: PawnBreak[]; theirs: PawnBreak[] } {
  const me: Color = side
  const them: Color = side === 'w' ? 'b' : 'w'
  const mine = pawnBreaksFor(board, me)
  const theirs = pawnBreaksFor(board, them)
  return {
    mine: mine.length ? mine : [{ move: me === 'w' ? 'd4' : '...d5', why: 'Strike the extra center once development is ready.' }],
    theirs: theirs.length
      ? theirs
      : [{ move: them === 'w' ? 'd4' : '...d5', why: 'Their thematic strike against your extra center.' }],
  }
}

function pawnBreaksFor(board: Chess, color: Color): PawnBreak[] {
  const rows: PawnBreak[] = []
  const dHome = color === 'w' ? 'd2' : 'd7'
  const dTwo = color === 'w' ? 'd4' : 'd5'
  const eHome = color === 'w' ? 'e2' : 'e7'
  const eTwo = color === 'w' ? 'e4' : 'e5'
  const cPawn = color === 'w' ? 'c2' : 'c7'
  const prefix = color === 'w' ? '' : '...'

  const dPawn = board.get(dHome as Square)
  if (dPawn?.type === 'p' && dPawn.color === color && !board.get(dTwo as Square)) {
    rows.push({
      move: `${prefix}${dTwo}`,
      why: `The second central pawn strike, asking them to take or push past ${dTwo}.`,
    })
  }
  const ePawn = board.get(eHome as Square)
  if (ePawn?.type === 'p' && ePawn.color === color && !board.get(eTwo as Square)) {
    rows.push({
      move: `${prefix}${eTwo}`,
      why: `The e-pawn strike once the center is ready.`,
    })
  }

  if (color === 'w') {
    if (fPawnBlocked(board, color)) {
      rows.push({
        move: 'f4',
        precondition: `A piece on ${fPawnOne(color)} blocks f2–f4. The pawn cannot jump the knight.`,
        why: 'Kingside space is a later job, not this position. In Open Sicilians the king knight usually recaptures on d4, which leaves f3 and frees f4–f5. That is when e6 can become a target — not while Nf3 is still on the board.',
      })
    } else {
      const fHome = board.get(fPawnHome(color))
      const knightOnD4 = board.get('d4')?.type === 'n' && board.get('d4')?.color === 'w'
      if (fHome?.type === 'p' && fHome.color === 'w' && (knightOnD4 || !board.get('f3'))) {
        rows.push({
          move: 'f4',
          why: 'The f-pawn is free. f4–f5 can cramp ...e6 once the pieces are out — that is a middlegame attack, not a move you play through the knight.',
        })
      }
    }
  }

  const c = board.get(cPawn as Square)
  if (c?.type === 'p' && c.color === color) {
    rows.push({
      move: `${prefix}${color === 'w' ? 'c4' : 'c5'}`,
      why: `Challenges their extra center and opens a file for a rook.`,
    })
  }

  return rows.slice(0, 2)
}

export function undevelopedBishops(board: Chess, side: TrainedSide): { mine: string; theirs: string } {
  const white = board.get('c1')?.type === 'b' ? 'Bc1' : board.get('f1')?.type === 'b' ? 'Bf1' : 'Bc1'
  const black = board.get('c8')?.type === 'b' ? 'Bc8' : board.get('f8')?.type === 'b' ? 'Bf8' : 'Bc8'
  const whiteText = `${white} until the center opens`
  const blackText = `${black} until the center opens`
  return side === 'w' ? { mine: whiteText, theirs: blackText } : { mine: blackText, theirs: whiteText }
}
