import type { Classification, EngineEval, Side } from './types'

export const BLUNDER_CP = 300
export const MISTAKE_CP = 100
export const INACCURACY_CP = 50

/** Mate scores are mapped to a large CP so CPL arithmetic stays uniform. */
export const MATE_CP = 100_000

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

export function classify(loss: number): Classification {
  if (loss >= BLUNDER_CP) return 'blunder'
  if (loss >= MISTAKE_CP) return 'mistake'
  if (loss >= INACCURACY_CP) return 'inaccuracy'
  return 'fine'
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
