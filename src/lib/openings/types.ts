import type { ReasonTag } from './tags'

export type TrainedSide = 'w' | 'b'
export type CenterType = 'open' | 'semi_open' | 'closed' | 'fixed' | 'tense' | 'fluid'
export type NodeSource = 'repertoire' | 'explorer'

/** Bump when commentary schema or templates change. Cached packs key on this. */
export const COMMENTARY_GENERATOR_VERSION = 1

export type CommentaryConfidence = 'verified' | 'evidence' | 'imported' | 'basic'
export type CommentaryProvenance = 'authored' | 'board' | 'imported' | 'template' | 'engine'
export type CardProvenance = 'authored' | 'generated' | 'imported'

export type PawnBreak = {
  move: string
  precondition?: string
  why?: string
}

export type MoveOrderLogic = {
  move: string
  tags: ReasonTag[]
  why: string
}

export type LessonVariation = {
  name: string
  line: string
  idea: string
}

export type LessonQuiz = {
  prompt: string
  choices: string[]
  answer: number
  why: string
}

export type AfterTheBook = {
  when: string
  your_jobs: string[]
  their_jobs: string[]
  typical_structures: string[]
  if_they_deviate: string
}

export type ModelGameRef = {
  id: string
  white: string
  black: string
  year?: number
  winner?: 'white' | 'black' | 'draw' | null
}

export type ExplorerEvidence = {
  source: 'lichess' | 'masters'
  rating_band: string
  san: string
  plays: number
  pct: number
}

export type CommentaryEvidence = {
  fen: string
  fen_before: string
  san: string
  ply: number
  attacks: string[]
  defends: string[]
  controls: string[]
  opened: string[]
  blocked_breaks: string[]
  legal_breaks: string[]
  explorer?: ExplorerEvidence[]
  model_games?: ModelGameRef[]
  engine_best_san?: string | null
  engine_reply_san?: string | null
}

export type MoveCommentary = {
  problem?: string
  accomplishes?: string
  attacks?: string[]
  defends?: string[]
  controls?: string[]
  enables?: string
  drawback?: string
  if_omitted?: string
  position_type?: string
  plans?: string[]
  why: string
  confidence: CommentaryConfidence
  provenance: CommentaryProvenance
  generator_version: number
  evidence: CommentaryEvidence
}

export type LessonDeviation = {
  at_fen: string
  they_play: string
  your_response?: string
  idea: string
  source: 'explorer' | 'imported'
}

export type MiddlegameMilestone = {
  fen: string
  ply: number
  title: string
  jobs: string[]
  model_games?: ModelGameRef[]
}

export type KnowledgeCard = {
  name: string
  side: TrainedSide
  eco?: string
  move_order: string
  one_line_argument: string
  their_argument: string
  center: { type: string; structure_family: string }
  space_and_targets: {
    who_has_space: string
    my_targets: string[]
    their_targets: string[]
  }
  breaks: { mine: PawnBreak[]; theirs: PawnBreak[] }
  problem_pieces: { mine: string; theirs: string }
  move_order_logic: MoveOrderLogic[]
  expected_deviations: unknown[]
  traps: Array<{ line: string; motif: string }>
  typical_endgame: string
  theory_load: number
  style_fit: string
  variations?: LessonVariation[]
  after_the_book?: AfterTheBook
  quizzes?: LessonQuiz[]
  low_confidence?: boolean
  uncertain_fields?: string[]
  commentaries?: Record<string, MoveCommentary>
  deviations?: LessonDeviation[]
  milestones?: MiddlegameMilestone[]
  generator_version?: number
  provenance?: CardProvenance
}

export type NodeAlternative = {
  san: string
  why_worse: string
  tag: ReasonTag
}

export type ExplorerReply = {
  rating_band: string
  san: string
  plays: number
  pct: number
  win_pct: number | null
  corpus?: 'club' | 'masters'
  games?: ModelGameRef[]
}

export type BuiltNode = {
  id: string
  opening_id?: string
  parent_node_id: string | null
  fen: string
  ply: number
  san: string
  is_mine: boolean
  source: NodeSource
  reason_tags: ReasonTag[]
  reason_text: string | null
  alternatives: NodeAlternative[]
  explorer_stats: ExplorerReply[] | null
  frequency_weight: number
  commentary: MoveCommentary | null
}

export type StructureTargets = {
  my_breaks: string[]
  their_breaks: string[]
  my_good_squares: string[]
  their_good_squares: string[]
  my_problem_piece: string | null
  their_problem_piece: string | null
  typical_endgame: string | null
  tempo_traps: string[]
}

export type BuiltOpening = {
  name: string
  eco: string | null
  side: TrainedSide
  structure_family: string | null
  center_type: CenterType | null
  theory_load: number
  knowledge_card: KnowledgeCard
  nodes: BuiltNode[]
  targets: StructureTargets
}

export type NodeProgress = {
  node_id: string
  recall_ease: number
  understanding_ease: number
  due_at: string
  last_recall_pass: boolean | null
  last_understanding_pass: boolean | null
  streak: number
  lapses: number
}

export type GenerationStage =
  | 'queued'
  | 'starter'
  | 'explorer'
  | 'engine'
  | 'commentary'
  | 'milestones'
  | 'ready'
  | 'paused'
  | 'error'

export type GenerationCursor = {
  stage: GenerationStage
  nodeIndex: number
}

export type OpeningPackKey = {
  name: string
  side: TrainedSide
  rating_band: string
  generator_version: number
}
