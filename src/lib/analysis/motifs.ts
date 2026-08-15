import { Chess, SQUARES, type Color, type Square } from 'chess.js'
import { INACCURACY_CP } from './classify'
import type { Motif } from './types'

const VALUE: Record<string, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 100,
}

const SLIDERS = new Set(['b', 'r', 'q'])
const FILES = 'abcdefgh'
const RANKS = '12345678'

function opp(color: Color): Color {
  return color === 'w' ? 'b' : 'w'
}

function parseUci(uci: string): { from: Square; to: Square; promotion?: string } | null {
  if (!uci || uci === '0000' || uci === '(none)' || uci.length < 4) return null
  return {
    from: uci.slice(0, 2) as Square,
    to: uci.slice(2, 4) as Square,
    promotion: uci.length > 4 ? uci[4] : undefined,
  }
}

function coords(square: Square): [number, number] {
  return [FILES.indexOf(square[0]!), RANKS.indexOf(square[1]!)]
}

function at(file: number, rank: number): Square | null {
  if (file < 0 || file > 7 || rank < 0 || rank > 7) return null
  return `${FILES[file]}${RANKS[rank]}` as Square
}

function rayBetween(from: Square, to: Square): Square[] {
  const [ff, fr] = coords(from)
  const [tf, tr] = coords(to)
  const df = Math.sign(tf - ff)
  const dr = Math.sign(tr - fr)
  if (df === 0 && dr === 0) return []
  if (df !== 0 && dr !== 0 && Math.abs(tf - ff) !== Math.abs(tr - fr)) return []
  if (df !== 0 && dr === 0) {
    /* rook/queen file */
  } else if (df === 0 && dr !== 0) {
    /* rook/queen rank */
  } else if (Math.abs(tf - ff) !== Math.abs(tr - fr)) {
    return []
  }
  const squares: Square[] = []
  let f = ff + df
  let r = fr + dr
  while (f !== tf || r !== tr) {
    const sq = at(f, r)
    if (!sq) return []
    squares.push(sq)
    f += df
    r += dr
  }
  return squares
}

function tryMove(chess: Chess, uci: string) {
  const parsed = parseUci(uci)
  if (!parsed) return null
  try {
    return chess.move({
      from: parsed.from,
      to: parsed.to,
      promotion: parsed.promotion ?? 'q',
    })
  } catch {
    return null
  }
}

type Pin = { pinned: Square; behind: Square; attacker: Square }

function findPins(chess: Chess, victim: Color): Pin[] {
  const pins: Pin[] = []
  for (const sq of SQUARES) {
    const piece = chess.get(sq)
    if (!piece || piece.color === victim || !SLIDERS.has(piece.type)) continue
    for (const target of SQUARES) {
      if (target === sq) continue
      const behind = chess.get(target)
      if (!behind || behind.color !== victim) continue
      if (VALUE[behind.type] < 5 && behind.type !== 'k') continue
      const between = rayBetween(sq, target)
      if (between.length === 0) continue
      let mid: { s: Square; p: NonNullable<ReturnType<Chess['get']>> } | null = null
      let occupantCount = 0
      for (const s of between) {
        const p = chess.get(s)
        if (!p) continue
        occupantCount += 1
        if (occupantCount > 1) break
        mid = { s, p }
      }
      if (occupantCount !== 1 || !mid) continue
      if (mid.p.color !== victim) continue
      if (VALUE[behind.type] <= VALUE[mid.p.type]) continue
      pins.push({ pinned: mid.s, behind: target, attacker: sq })
    }
  }
  return pins
}

function isHangingPiece(beforePunish: Chess, punishTo: Square, attacker: Color): boolean {
  const captured = beforePunish.get(punishTo)
  if (!captured || captured.color === attacker) return false
  const attackers = beforePunish.attackers(punishTo, attacker)
  const defenders = beforePunish.attackers(punishTo, captured.color)
  return attackers.length > defenders.length
}

function isFork(afterPunish: Chess, landed: Square, attacker: Color): boolean {
  const piece = afterPunish.get(landed)
  if (!piece || piece.color !== attacker) return false
  let hits = 0
  for (const sq of SQUARES) {
    if (sq === landed) continue
    const target = afterPunish.get(sq)
    if (!target || target.color === attacker) continue
    const valuable = target.type === 'k' || VALUE[target.type] >= 3
    if (!valuable) continue
    if (afterPunish.attackers(sq, attacker).includes(landed)) hits += 1
    if (hits >= 2) return true
  }
  return false
}

function isSkewer(afterPunish: Chess, from: Square, to: Square, attacker: Color): boolean {
  const piece = afterPunish.get(to)
  if (!piece || piece.color !== attacker || !SLIDERS.has(piece.type)) return false
  const [ff, fr] = coords(to)
  const dirs: Array<[number, number]> = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [1, -1],
    [-1, 1],
    [-1, -1],
  ]
  const bishopLike = piece.type === 'b' || piece.type === 'q'
  const rookLike = piece.type === 'r' || piece.type === 'q'
  for (const [df, dr] of dirs) {
    const diag = df !== 0 && dr !== 0
    if (diag && !bishopLike) continue
    if (!diag && !rookLike) continue
    let first: { sq: Square; type: string } | null = null
    let second: { sq: Square; type: string } | null = null
    for (let step = 1; step < 8; step++) {
      const sq = at(ff + df * step, fr + dr * step)
      if (!sq) break
      const occ = afterPunish.get(sq)
      if (!occ) continue
      if (occ.color === attacker) break
      if (!first) first = { sq, type: occ.type }
      else {
        second = { sq, type: occ.type }
        break
      }
    }
    if (!first || !second) continue
    if (VALUE[first.type] > VALUE[second.type] && VALUE[first.type] >= 5) {
      if (first.sq === from) continue
      return true
    }
  }
  return false
}

function isDiscoveredAttack(
  beforePunish: Chess,
  from: Square,
  to: Square,
  attacker: Color,
): boolean {
  const victim = opp(attacker)
  for (const sq of SQUARES) {
    const piece = beforePunish.get(sq)
    if (!piece || piece.color !== attacker || !SLIDERS.has(piece.type)) continue
    if (sq === from) continue
    for (const target of SQUARES) {
      const hit = beforePunish.get(target)
      if (!hit || hit.color !== victim) continue
      if (VALUE[hit.type] < 3 && hit.type !== 'k') continue
      const between = rayBetween(sq, target)
      if (!between.includes(from)) continue
      if (between.includes(to)) continue
      const others = between.filter((s) => s !== from && beforePunish.get(s))
      if (others.length > 0) continue
      return true
    }
  }
  return false
}

function isBackRank(beforePunish: Chess, afterPunish: Chess, victim: Color): boolean {
  const kingSq = beforePunish.findPiece({ type: 'k', color: victim })[0]
  if (!kingSq) return false
  const rank = kingSq[1]
  const back = victim === 'w' ? '1' : '8'
  if (rank !== back) return false
  const [kf, kr] = coords(kingSq)
  const forward = victim === 'w' ? 1 : -1
  const front = at(kf, kr + forward)
  const frontL = at(kf - 1, kr + forward)
  const frontR = at(kf + 1, kr + forward)
  const blocked = [front, frontL, frontR].filter(Boolean) as Square[]
  const pawnBlocked = blocked.filter((sq) => {
    const p = beforePunish.get(sq)
    return p?.color === victim && p.type === 'p'
  })
  if (pawnBlocked.length < 2) return false
  if (!afterPunish.isCheck()) return false
  return true
}

function commissionMotifFromPunish(args: {
  fenAfterUser: string
  punishUci: string
  userFrom: Square
}): Motif | null {
  const before = new Chess(args.fenAfterUser)
  const userColor = opp(before.turn())
  const attacker = before.turn()
  const punish = parseUci(args.punishUci)
  if (!punish) return null

  const pinsBeforePunish = findPins(before, userColor)
  const hanging = isHangingPiece(before, punish.to, attacker)
  const discovered = isDiscoveredAttack(before, punish.from, punish.to, attacker)

  const after = new Chess(before.fen())
  if (!tryMove(after, args.punishUci)) return hanging ? 'hanging_piece' : null

  const fork = isFork(after, punish.to, attacker)
  const skewer = isSkewer(after, punish.from, punish.to, attacker)
  const backRank = isBackRank(before, after, userColor)
  const pinExploited =
    pinsBeforePunish.some((p) => p.pinned === punish.to) ||
    pinsBeforePunish.some((p) => p.pinned === args.userFrom)

  if (hanging) return 'hanging_piece'
  if (fork) return 'fork'
  if (pinExploited) return 'pin'
  if (skewer) return 'skewer'
  if (discovered) return 'discovered_attack'
  if (backRank) return 'back_rank'
  return null
}

/** Motif of a tactic the user could have played (best move). */
function tacticMotifForMove(fenBefore: string, uci: string): Motif | null {
  const parsed = parseUci(uci)
  if (!parsed) return null
  const before = new Chess(fenBefore)
  const attacker = before.turn()
  const after = new Chess(fenBefore)
  if (!tryMove(after, uci)) return null

  if (after.isCheckmate()) return 'missed_mate'

  const victim = opp(attacker)
  const hanging = (() => {
    const captured = before.get(parsed.to)
    if (!captured || captured.color === attacker) return false
    const attackers = after.attackers(parsed.to, attacker)
    // After capture, piece sits on `to` — treat as hanging win if under-defended before.
    const defenders = before.attackers(parsed.to, captured.color)
    return before.attackers(parsed.to, attacker).length > defenders.length || attackers.length > 0
  })()

  if (isFork(after, parsed.to, attacker)) return 'fork'
  if (isSkewer(after, parsed.from, parsed.to, attacker)) return 'skewer'
  if (isDiscoveredAttack(before, parsed.from, parsed.to, attacker)) return 'discovered_attack'
  if (isBackRank(before, after, victim)) return 'back_rank'

  const pins = findPins(after, victim)
  if (pins.some((p) => p.attacker === parsed.to || p.pinned === parsed.to)) return 'pin'
  if (hanging) return 'hanging_piece'
  return null
}

const TO_MISSED: Partial<Record<Motif, Motif>> = {
  fork: 'missed_fork',
  pin: 'missed_pin',
  skewer: 'missed_skewer',
  discovered_attack: 'missed_discovered_attack',
  hanging_piece: 'missed_hanging_piece',
  back_rank: 'missed_back_rank',
  missed_mate: 'missed_mate',
}

export function detectMotif(args: {
  fenBefore: string
  userFrom: Square
  userTo: Square
  userSan: string
  punishUci: string
  mateForUser: boolean
  bestUci: string
  loss: number
  deliveredMate?: boolean
}): Motif | null {
  // Delivering mate (or matching the engine mate) is never an omission.
  if (args.deliveredMate) return null

  // Omission: a decisive shot was on the board and wasn't taken.
  if (args.mateForUser) return 'missed_mate'
  if (args.loss >= INACCURACY_CP) {
    const shot = tacticMotifForMove(args.fenBefore, args.bestUci)
    if (shot) return TO_MISSED[shot] ?? (shot === 'missed_mate' ? 'missed_mate' : null)
  }

  const before = new Chess(args.fenBefore)
  try {
    before.move({
      from: args.userFrom,
      to: args.userTo,
      promotion: 'q',
    })
  } catch {
    try {
      before.move(args.userSan)
    } catch {
      return null
    }
  }

  return commissionMotifFromPunish({
    fenAfterUser: before.fen(),
    punishUci: args.punishUci,
    userFrom: args.userFrom,
  })
}
