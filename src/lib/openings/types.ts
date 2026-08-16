import type { ReasonTag } from './tags'

export type TrainedSide = 'w' | 'b'
export type CenterType = 'open' | 'semi_open' | 'closed' | 'fixed' | 'tense' | 'fluid'
export type NodeSource = 'repertoire' | 'explorer'

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
