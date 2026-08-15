import type { Classification, EngineEval, Side } from './types'

export const BLUNDER_CP = 300
export const MISTAKE_CP = 100
export const INACCURACY_CP = 50
export const GOOD_CP = 20
export const EXCELLENT_CP = 10

/** Mate scores are mapped to a large CP so CPL arithmetic stays uniform. */
export const MATE_CP = 100_000

/** Cap used for win% / display-style accuracy (mates ≈ decisive edge, not 1000 pawns). */
export const WIN_CAP_CP = 1000

export function centipawnLoss(
  evalBefore: EngineEval,
  evalAfter: EngineEval,
  mover: Side,
): number {
  const raw =
    mover === 'white'
      ? evalBefore.cp - evalAfter.cp
      : evalAfter.cp - evalBefore.cp
  return Math.max(0, Math.round(raw))
}

/** Soft CPL for accuracy — mates don't nuke the game score. */
export function softCentipawnLoss(
  evalBefore: EngineEval,
  evalAfter: EngineEval,
  mover: Side,
): number {
  const before = cappedCp(evalBefore.cp)
  const after = cappedCp(evalAfter.cp)
  const raw = mover === 'white' ? before - after : after - before
  return Math.max(0, Math.round(raw))
}

export function cappedCp(cp: number): number {
  return Math.max(-WIN_CAP_CP, Math.min(WIN_CAP_CP, cp))
}

/** Lichess winning chances in [-1, 1] from a side-to-move-relative CP. */
export function winningChances(cp: number): number {
  return 2 / (1 + Math.exp(-0.00368208 * cappedCp(cp))) - 1
}

/** Win probability 0–100 from white-relative CP, for a given mover. */
export function winPercentForMover(whiteRelativeCp: number, mover: Side): number {
  const pov = mover === 'white' ? whiteRelativeCp : -whiteRelativeCp
  return 50 + 50 * winningChances(pov)
}

/**
 * Chess.com / modern Lichess-style move accuracy from win% drop.
 * Much closer to Chess.com game review numbers than raw ACPL.
 */
export function moveAccuracy(
  evalBefore: EngineEval,
  evalAfter: EngineEval,
  mover: Side,
): number {
  const before = winPercentForMover(evalBefore.cp, mover)
  const after = winPercentForMover(evalAfter.cp, mover)
  const winLoss = Math.max(0, before - after)
  const raw = 103.1668 * Math.exp(-0.04354 * winLoss) - 3.1669
  return Math.max(0, Math.min(100, Math.round(raw * 10) / 10))
}

export function classify(loss: number): Classification {
  if (loss >= BLUNDER_CP) return 'blunder'
  if (loss >= MISTAKE_CP) return 'mistake'
  if (loss >= INACCURACY_CP) return 'inaccuracy'
  return 'fine'
}

/** Fallback when only ACPL is available (legacy aggregates). */
export function accuracyFromAcpl(acpl: number): number {
  // Map typical ACPL (20–80) onto a 100–40 band. Mate-inflated 5000+ must not become 0%.
  const soft = Math.min(Math.max(acpl, 0), 160)
  const raw = 100 * Math.exp(-soft / 90)
  return Math.max(25, Math.min(100, Math.round(raw * 10) / 10))
}

/** Drop unanalyzed or mate-nuked rows so a 0% / 5000 ACPL game cannot flatten the chart. */
export function usableAccuracy(accuracyPct: number, acpl: number): number | null {
  const acc = Number(accuracyPct)
  const loss = Number(acpl)
  if (loss >= 400) return null
  if (acc > 0 && acc <= 100) return acc
  if (loss > 0) return accuracyFromAcpl(loss)
  return null
}

export function usableAcpl(acpl: number): number | null {
  const loss = Number(acpl)
  if (loss <= 0 || loss >= 400) return null
  return loss
}

/**
 * Chess.com-like game accuracy: RMS of per-move error, not arithmetic mean.
 * Arithmetic mean of move scores reads ~5–15pts high vs Chess.com.
 */
export function averageAccuracy(scores: number[]): number {
  if (!scores.length) return 0
  const meanSqErr = scores.reduce((sum, a) => sum + (100 - a) ** 2, 0) / scores.length
  return Math.round((100 - Math.sqrt(meanSqErr)) * 10) / 10
}

export function toWhiteRelative(
  score: { cp?: number; mate?: number },
  stm: 'w' | 'b',
  bestMove: string,
): EngineEval {
  const sign = stm === 'w' ? 1 : -1
  if (score.mate != null && score.mate !== 0) {
    const abs = Math.abs(score.mate)
    return {
      cp: sign * Math.sign(score.mate) * (MATE_CP - abs * 100),
      mate: sign * score.mate,
      mateForStm: score.mate,
      bestMove,
    }
  }
  return {
    cp: sign * (score.cp ?? 0),
    mate: null,
    mateForStm: null,
    bestMove,
  }
}
