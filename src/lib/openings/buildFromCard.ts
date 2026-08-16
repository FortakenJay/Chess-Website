import type { BuiltNode, BuiltOpening, CenterType, KnowledgeCard, StructureTargets, TrainedSide } from './types'
import { buildNodesFromSans, parseMoveOrderSans } from './tree'
import { validateKnowledgeCard } from './validate'

function mapCenter(type: string): CenterType | null {
  const t = type.toLowerCase()
  if (t.includes('semi')) return 'semi_open'
  if (t.includes('tense')) return 'tense'
  if (t.includes('fluid')) return 'fluid'
  if (t.includes('fixed')) return 'fixed'
  if (t.includes('closed')) return 'closed'
  if (t.includes('open')) return 'open'
  return null
}

export function targetsFromCard(card: KnowledgeCard): StructureTargets {
  return {
    my_breaks: card.breaks.mine.map((item) => item.move),
    their_breaks: card.breaks.theirs.map((item) => item.move),
    my_good_squares: card.space_and_targets.my_targets,
    their_good_squares: card.space_and_targets.their_targets,
    my_problem_piece: card.problem_pieces.mine,
    their_problem_piece: card.problem_pieces.theirs,
    typical_endgame: card.typical_endgame,
    tempo_traps: card.traps.map((trap) => trap.line),
  }
}

export function builtOpeningFromCard(card: KnowledgeCard): BuiltOpening {
  const built = buildFromCard(card)
  return {
    name: card.name,
    eco: card.eco ?? null,
    side: card.side,
    structure_family: card.center.structure_family,
    center_type: built.center_type,
    theory_load: card.theory_load,
    knowledge_card: card,
    nodes: built.nodes,
    targets: built.targets,
  }
}

export function buildFromCard(
  card: KnowledgeCard,
  idFactory?: () => string,
): { nodes: BuiltNode[]; targets: StructureTargets; side: TrainedSide; center_type: CenterType | null } {
  const issues = validateKnowledgeCard(card)
  if (issues.length) {
    throw new Error(issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'))
  }
  const sans = parseMoveOrderSans(card.move_order)
  if (!sans.length) throw new Error('move_order produced no moves')
  return {
    side: card.side,
    center_type: mapCenter(card.center.type),
    nodes: buildNodesFromSans(sans, card.side, card.move_order_logic, idFactory, card.commentaries),
    targets: targetsFromCard(card),
  }
}
