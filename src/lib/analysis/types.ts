export type Classification = 'blunder' | 'mistake' | 'inaccuracy' | 'fine'
export type Phase = 'opening' | 'middlegame' | 'endgame'
export type Side = 'white' | 'black'
export type Motif =
  | 'hanging_piece'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovered_attack'
  | 'back_rank'
  | 'missed_mate'

export type ClockBucket = 'lt30' | '30_60' | 'gt60'

export type EngineEval = {
  /** White-relative centipawns. Mate is mapped onto a large CP scale. */
  cp: number
  /** White-relative mate in N. Positive = White mates. */
  mate: number | null
  /** UCI mate score for the side to move. Positive = STM mates. */
  mateForStm: number | null
  bestMove: string
}

export type BucketStats = {
  total: number
  blunder: number
  mistake: number
  inaccuracy: number
}

export type PhaseStats = Record<Phase, BucketStats>
export type ColorStats = Record<Side, BucketStats>
export type ClockStats = Record<ClockBucket, BucketStats>

export type FlaggedPosition = {
  username: string
  playedOn: string
  opponent: string
  color: Side
  moveNumber: number
  san: string
  loss: number
  classification: Exclude<Classification, 'fine'>
  phase: Phase
  clockLeft: number | null
  fenBefore: string
  gameLink: string
  motif: Motif | null
}

export type GameAnalysis = {
  username: string
  playedOn: string
  opponent: string
  color: Side
  result: 'win' | 'loss' | 'draw'
  blunderCount: number
  mistakeCount: number
  inaccuracyCount: number
  totalMoves: number
  phaseStats: PhaseStats
  clockStats: ClockStats
  gameLink: string
  endTime: number
  flagged: FlaggedPosition[]
}

export const EMPTY_BUCKET: BucketStats = {
  total: 0,
  blunder: 0,
  mistake: 0,
  inaccuracy: 0,
}

export function emptyPhaseStats(): PhaseStats {
  return {
    opening: { ...EMPTY_BUCKET },
    middlegame: { ...EMPTY_BUCKET },
    endgame: { ...EMPTY_BUCKET },
  }
}

export function emptyColorStats(): ColorStats {
  return {
    white: { ...EMPTY_BUCKET },
    black: { ...EMPTY_BUCKET },
  }
}

export function emptyClockStats(): ClockStats {
  return {
    lt30: { ...EMPTY_BUCKET },
    '30_60': { ...EMPTY_BUCKET },
    gt60: { ...EMPTY_BUCKET },
  }
}
