export type Classification = 'blunder' | 'mistake' | 'inaccuracy' | 'fine'
export type MoveQuality =
  | 'brilliant'
  | 'great'
  | 'book'
  | 'best'
  | 'excellent'
  | 'good'
  | 'miss'
  | 'inaccuracy'
  | 'mistake'
  | 'blunder'
export type Phase = 'opening' | 'middlegame' | 'endgame'
export type EndgameType = 'pawn' | 'minor' | 'rook' | 'queen' | 'mixed'
export type Side = 'white' | 'black'
export type Motif =
  | 'hanging_piece'
  | 'fork'
  | 'pin'
  | 'skewer'
  | 'discovered_attack'
  | 'back_rank'
  | 'missed_mate'
  | 'missed_fork'
  | 'missed_pin'
  | 'missed_skewer'
  | 'missed_discovered_attack'
  | 'missed_hanging_piece'
  | 'missed_back_rank'

export type MotifKind = 'commission' | 'omission'

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

/** One MultiPV candidate line from the engine. */
export type EngineLine = {
  multipv: number
  /** White-relative centipawns. */
  cp: number
  mate: number | null
  /** First move in UCI. */
  bestMove: string
  /** Full PV in UCI moves. */
  pvUci: string[]
  /** SAN sequence for display (best-effort). */
  pvSan: string[]
}

export type AnalysisBudget = {
  kind: 'nodes'
  value: number
  multipv: number
}

export type BucketStats = {
  total: number
  blunder: number
  mistake: number
  inaccuracy: number
}

export type QualityStats = Record<MoveQuality, number>

export type PhaseStats = Record<Phase, BucketStats>
export type ColorStats = Record<Side, BucketStats>
export type ClockStats = Record<ClockBucket, BucketStats>
export type EndgameTypeStats = Record<EndgameType, BucketStats>
export type PhaseAcpl = Record<Phase, { totalLoss: number; moves: number }>

/** Bump when persisted analysis JSON shape or scoring rules change. */
export const ANALYSIS_VERSION = 1

export type PositionStructure = 'open' | 'closed' | 'semi_closed'
export type StrategyMetric =
  | 'activePiece'
  | 'attacking'
  | 'defending'
  | 'overall'
  | 'pawnStructure'
  | 'space'
export type EndgameTheme = 'pawn' | 'rook' | 'queen' | 'other' | 'overall'
export type EndgameEntry = 'better' | 'equal' | 'worse'

export type AccuracyBucket = {
  moves: number
  squaredError: number
}

export type StrategyGroup = Record<StrategyMetric, AccuracyBucket>
export type StrategyStats = Record<'all' | PositionStructure, StrategyGroup>
export type EndgameAccuracyStats = Record<EndgameTheme, AccuracyBucket>

export type EndgameEntryBucket = {
  games: number
  wins: number
  draws: number
  losses: number
  expectedScore: number
}

export type EndgameConversion = {
  opportunities: number
  conversions: number
  better: EndgameEntryBucket
  equal: EndgameEntryBucket
  worse: EndgameEntryBucket
}

export type FlaggedPosition = {
  username: string
  playedOn: string
  opponent: string
  color: Side
  moveNumber: number
  san: string
  loss: number
  classification: Exclude<Classification, 'fine'>
  /** Persisted leak tier; cosmetic overrides never enter drills. */
  quality: 'inaccuracy' | 'mistake' | 'blunder'
  phase: Phase
  endgameType: EndgameType | null
  clockLeft: number | null
  fenBefore: string
  gameLink: string
  motif: Motif | null
  motifKind: MotifKind | null
  timeClass: string | null
}

/** One ply in a move-by-move game review (optional on GameAnalysis). */
export type AnalyzedPly = {
  ply: number
  moveNumber: number
  san: string
  from: string
  to: string
  color: Side
  fenBefore: string
  fenAfter: string
  /** White-relative centipawns after this move. */
  evalCp: number
  mate: number | null
  isUserMove: boolean
  loss: number | null
  /** Per-move win%-based accuracy 0–100. */
  accuracy: number | null
  /** Expected points lost by this move, in the 0–1 range. */
  epLost: number | null
  quality: MoveQuality | null
  classification: Classification | null
  bestSan: string | null
  bestUci: string | null
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
  qualityStats: QualityStats
  /** Expected-points loss for each user move, in game order. */
  epLosses: number[]
  acpl: number
  accuracyPct: number
  phaseAcpl: PhaseAcpl
  endgameStats: EndgameTypeStats
  endgameConversion: EndgameConversion
  endgameAccuracyStats: EndgameAccuracyStats
  strategyStats: StrategyStats
  analysisVersion: number
  recoveryStats: { moves: number; errors: number }
  openingEco: string | null
  openingName: string | null
  timeClass: string | null
  opponentRating: number | null
  userRating: number | null
  gameLink: string
  endTime: number
  flagged: FlaggedPosition[]
  /** Present when analyzed with includePlies (free review path). */
  plies?: AnalyzedPly[]
  /** White-relative CP after each ply; index 0 = start position. */
  evalCurve?: number[]
  whiteUsername?: string
  blackUsername?: string
  /** Opponent move-quality tape (free review / report). */
  opponentQualityStats?: QualityStats
  opponentAcpl?: number
  opponentAccuracyPct?: number
  opponentTotalMoves?: number
  opponentPhaseStats?: PhaseStats
  opponentPhaseAcpl?: PhaseAcpl
  opponentEpLosses?: number[]
  /** Fixed engine budget used for every position in this analysis. */
  analysisBudget?: AnalysisBudget
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

export function emptyQualityStats(): QualityStats {
  return {
    brilliant: 0,
    great: 0,
    book: 0,
    best: 0,
    excellent: 0,
    good: 0,
    miss: 0,
    inaccuracy: 0,
    mistake: 0,
    blunder: 0,
  }
}

export function emptyEndgameStats(): EndgameTypeStats {
  return {
    pawn: { ...EMPTY_BUCKET },
    minor: { ...EMPTY_BUCKET },
    rook: { ...EMPTY_BUCKET },
    queen: { ...EMPTY_BUCKET },
    mixed: { ...EMPTY_BUCKET },
  }
}

export function emptyPhaseAcpl(): PhaseAcpl {
  return {
    opening: { totalLoss: 0, moves: 0 },
    middlegame: { totalLoss: 0, moves: 0 },
    endgame: { totalLoss: 0, moves: 0 },
  }
}

export function emptyAccuracyBucket(): AccuracyBucket {
  return { moves: 0, squaredError: 0 }
}

export function emptyStrategyGroup(): StrategyGroup {
  return {
    activePiece: emptyAccuracyBucket(),
    attacking: emptyAccuracyBucket(),
    defending: emptyAccuracyBucket(),
    overall: emptyAccuracyBucket(),
    pawnStructure: emptyAccuracyBucket(),
    space: emptyAccuracyBucket(),
  }
}

export function emptyStrategyStats(): StrategyStats {
  return {
    all: emptyStrategyGroup(),
    open: emptyStrategyGroup(),
    closed: emptyStrategyGroup(),
    semi_closed: emptyStrategyGroup(),
  }
}

export function emptyEndgameAccuracyStats(): EndgameAccuracyStats {
  return {
    pawn: emptyAccuracyBucket(),
    rook: emptyAccuracyBucket(),
    queen: emptyAccuracyBucket(),
    other: emptyAccuracyBucket(),
    overall: emptyAccuracyBucket(),
  }
}

export function emptyEndgameEntryBucket(): EndgameEntryBucket {
  return { games: 0, wins: 0, draws: 0, losses: 0, expectedScore: 0 }
}

export function emptyEndgameConversion(): EndgameConversion {
  return {
    opportunities: 0,
    conversions: 0,
    better: emptyEndgameEntryBucket(),
    equal: emptyEndgameEntryBucket(),
    worse: emptyEndgameEntryBucket(),
  }
}

export function isOmissionMotif(motif: Motif | null | undefined): boolean {
  return Boolean(motif?.startsWith('missed_'))
}

export function isAnalysisStale(version: number | null | undefined) {
  return (version ?? 0) < ANALYSIS_VERSION
}
