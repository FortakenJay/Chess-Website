import { Chess } from 'chess.js'
import { commentaryKey } from './evidence'
import { attachEngineToCommentary, commentaryFromEvidence } from './commentaryTemplates'
import { expandNodeFromExplorer, type ExplorerSlice } from './explorer'
import {
  COMMENTARY_GENERATOR_VERSION,
  type BuiltNode,
  type BuiltOpening,
  type GenerationCursor,
  type GenerationStage,
  type KnowledgeCard,
  type LessonDeviation,
  type MiddlegameMilestone,
  type TrainedSide,
} from './types'
import { validateMoveCommentary } from './validate'
import { explainPlayedMove } from './explainMove'

export const COURSE_MAX_PLY = 18
export const COURSE_CHUNK = 4
export const COURSE_REPLY_CAP = 3

export const STAGE_LABEL: Record<GenerationStage, string> = {
  queued: 'Queued',
  starter: 'Starter ready',
  explorer: 'Collecting common replies',
  engine: 'Checking moves',
  commentary: 'Writing move reasons',
  milestones: 'Building middlegame plans',
  ready: 'Ready',
  paused: 'Paused',
  error: 'Paused on error',
}

export type GenerationDeps = {
  fetchSlice: (fen: string) => Promise<ExplorerSlice>
  evaluate?: (fen: string) => Promise<{ best: string | null; reply: string | null }>
}

export type GenerationState = {
  stage: GenerationStage
  cursor: GenerationCursor
  nodes: BuiltNode[]
  card: KnowledgeCard
  done: number
  total: number
}

function childrenOf(nodes: BuiltNode[], parentId: string): BuiltNode[] {
  return nodes.filter((node) => node.parent_node_id === parentId)
}

function fenBefore(node: BuiltNode, nodes: BuiltNode[]): string {
  const parent = node.parent_node_id ? nodes.find((row) => row.id === node.parent_node_id) : null
  return parent?.fen ?? 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'
}

export function shouldGenerateCourse(card: KnowledgeCard): boolean {
  if (card.provenance === 'authored') return false
  if (!card.low_confidence && !card.generator_version) return false
  return true
}

function deviationsFromNodes(nodes: BuiltNode[], side: TrainedSide): LessonDeviation[] {
  const rows: LessonDeviation[] = []
  for (const node of nodes) {
    if (node.source !== 'explorer') continue
    const parent = node.parent_node_id ? nodes.find((row) => row.id === node.parent_node_id) : null
    if (!parent) continue
    const stats = node.explorer_stats?.[0]
    const reply = childrenOf(nodes, node.id).find((child) => child.is_mine)
    rows.push({
      at_fen: parent.fen,
      they_play: node.san,
      your_response: reply?.san,
      idea: stats
        ? `${node.san} is a common reply in this position.`
        : `${node.san} leaves the named line.`,
      source: 'explorer',
    })
  }
  return rows.slice(0, 12)
}

function milestonesFrom(nodes: BuiltNode[], card: KnowledgeCard): MiddlegameMilestone[] {
  const mine = nodes.filter((node) => node.source === 'repertoire' && node.ply >= 12)
  const picks = mine.filter((_, index) => index % 2 === 0).slice(0, 4)
  const jobs = card.after_the_book?.your_jobs ?? []
  return picks.map((node, index) => ({
    fen: node.fen,
    ply: node.ply,
    title: `After ${node.san}`,
    jobs: jobs.slice(index, index + 2).length
      ? jobs.slice(index, index + 2)
      : ['Finish development, then play the break that is actually legal.'],
    model_games: node.commentary?.evidence.model_games,
  }))
}

export async function processCourseChunk(
  opening: BuiltOpening,
  state: GenerationState,
  deps: GenerationDeps,
): Promise<GenerationState> {
  const side = opening.side
  let { stage, cursor, nodes, card, done, total } = state

  if (stage === 'ready' || stage === 'paused' || stage === 'error') return state
  if (stage === 'queued' || stage === 'starter') {
    stage = 'explorer'
    cursor = { stage: 'explorer', nodeIndex: 0 }
  }

  if (stage === 'explorer') {
    const queue = nodes.filter((node) => node.source === 'repertoire' && node.ply < COURSE_MAX_PLY)
    total = Math.max(total, queue.length)
    const slice = queue.slice(cursor.nodeIndex, cursor.nodeIndex + COURSE_CHUNK)
    for (const node of slice) {
      const data = await deps.fetchSlice(node.fen)
      const replies = [...data.club, ...data.masters]
        .sort((a, b) => b.pct - a.pct)
        .slice(0, COURSE_REPLY_CAP)
      const expansion = expandNodeFromExplorer(node, replies, side, childrenOf(nodes, node.id))
      const merged = [...(node.explorer_stats ?? []), ...expansion.stats]
      node.explorer_stats = merged
      if (data.games.length && node.commentary) {
        node.commentary = {
          ...node.commentary,
          evidence: { ...node.commentary.evidence, model_games: data.games.slice(0, 3) },
        }
      }
      nodes = [...nodes, ...expansion.newNodes.map((row) => ({ ...row, opening_id: node.opening_id }))]
      done += 1
    }
    const nextIndex = cursor.nodeIndex + slice.length
    if (nextIndex >= queue.length) {
      return {
        stage: 'engine',
        cursor: { stage: 'engine', nodeIndex: 0 },
        nodes,
        card,
        done,
        total,
      }
    }
    return {
      stage: 'explorer',
      cursor: { stage: 'explorer', nodeIndex: nextIndex },
      nodes,
      card,
      done,
      total,
    }
  }

  if (stage === 'engine') {
    const mine = nodes.filter((node) => node.is_mine && node.source === 'repertoire')
    total = Math.max(total, mine.length)
    if (!deps.evaluate) {
      return {
        stage: 'commentary',
        cursor: { stage: 'commentary', nodeIndex: 0 },
        nodes,
        card,
        done,
        total,
      }
    }
    const slice = mine.slice(cursor.nodeIndex, cursor.nodeIndex + COURSE_CHUNK)
    for (const node of slice) {
      try {
        const lines = await deps.evaluate(fenBefore(node, nodes))
        if (node.commentary) {
          node.commentary = attachEngineToCommentary(
            node.commentary,
            lines.best,
            lines.reply,
          )
        }
      } catch {
        // Engine is optional evidence.
      }
      done += 1
    }
    const nextIndex = cursor.nodeIndex + slice.length
    if (nextIndex >= mine.length) {
      return {
        stage: 'commentary',
        cursor: { stage: 'commentary', nodeIndex: 0 },
        nodes,
        card,
        done,
        total,
      }
    }
    return {
      stage: 'engine',
      cursor: { stage: 'engine', nodeIndex: nextIndex },
      nodes,
      card,
      done,
      total,
    }
  }

  if (stage === 'commentary') {
    const trainable = nodes.filter((node) => node.source === 'repertoire')
    const slice = trainable.slice(cursor.nodeIndex, cursor.nodeIndex + COURSE_CHUNK)
    const commentaries = { ...(card.commentaries ?? {}) }
    for (const node of slice) {
      if (node.commentary?.provenance === 'imported') {
        commentaries[commentaryKey(node.ply, node.san)] = node.commentary
        continue
      }
      const before = new Chess(fenBefore(node, nodes))
      const logic = explainPlayedMove(before, node.san, node.ply)
      let commentary = commentaryFromEvidence(before, node.san, node.ply, logic)
      if (commentary && node.commentary?.evidence.engine_best_san) {
        commentary = attachEngineToCommentary(
          commentary,
          node.commentary.evidence.engine_best_san,
          node.commentary.evidence.engine_reply_san ?? null,
        )
      }
      if (commentary && node.commentary?.evidence.model_games) {
        commentary = {
          ...commentary,
          evidence: { ...commentary.evidence, model_games: node.commentary.evidence.model_games },
        }
      }
      if (commentary && validateMoveCommentary('commentary', commentary).length === 0) {
        node.commentary = commentary
        if (node.is_mine && !node.reason_text) node.reason_text = commentary.why
        commentaries[commentaryKey(node.ply, node.san)] = commentary
      }
    }
    card = {
      ...card,
      commentaries,
      generator_version: COMMENTARY_GENERATOR_VERSION,
      provenance: card.provenance === 'imported' ? 'imported' : 'generated',
    }
    const nextIndex = cursor.nodeIndex + slice.length
    if (nextIndex >= trainable.length) {
      return {
        stage: 'milestones',
        cursor: { stage: 'milestones', nodeIndex: 0 },
        nodes,
        card,
        done,
        total,
      }
    }
    return {
      stage: 'commentary',
      cursor: { stage: 'commentary', nodeIndex: nextIndex },
      nodes,
      card,
      done,
      total,
    }
  }

  const milestones = milestonesFrom(nodes, card)
  const deviations = deviationsFromNodes(nodes, side)
  card = {
    ...card,
    milestones,
    deviations,
    low_confidence: false,
    generator_version: COMMENTARY_GENERATOR_VERSION,
    provenance: card.provenance === 'imported' ? 'imported' : 'generated',
  }
  return {
    stage: 'ready',
    cursor: { stage: 'ready', nodeIndex: 0 },
    nodes,
    card,
    done: total,
    total,
  }
}

export function initialGenerationState(opening: BuiltOpening): GenerationState {
  return {
    stage: 'starter',
    cursor: { stage: 'starter', nodeIndex: 0 },
    nodes: opening.nodes,
    card: opening.knowledge_card,
    done: 0,
    total: opening.nodes.filter((node) => node.source === 'repertoire').length,
  }
}
