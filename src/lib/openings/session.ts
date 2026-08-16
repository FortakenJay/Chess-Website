import { effectiveEase, emptyProgress } from './schedule'
import type { BuiltNode, NodeProgress } from './types'

export type DrillItem = {
  node: BuiltNode
  parentFen: string
  includeReason: boolean
}

export type TrainingMode = 'scheduled' | 'weakest' | 'foundations'

export type OpeningTrainingStats = {
  total: number
  attempted: number
  due: number
  recallPct: number | null
  understandingPct: number | null
  weakestSkill: 'recall' | 'understanding' | 'balanced' | 'new'
  weakestEase: number
  lapses: number
}

const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

export function parentFen(nodes: BuiltNode[], node: BuiltNode): string {
  if (!node.parent_node_id) return START_FEN
  return nodes.find((row) => row.id === node.parent_node_id)?.fen ?? START_FEN
}

export function trainableNodes(nodes: BuiltNode[]): BuiltNode[] {
  return nodes.filter(
    (node) => node.is_mine && node.source === 'repertoire' && node.san && node.reason_tags.length > 0,
  )
}

function dueScore(progress: NodeProgress | undefined, now: Date): number {
  if (!progress) return Number.NEGATIVE_INFINITY
  return new Date(progress.due_at).getTime() - now.getTime()
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function openingTrainingStats(
  nodes: BuiltNode[],
  progressByNode: Map<string, NodeProgress>,
  openingId: string,
  now = new Date(),
): OpeningTrainingStats {
  const pool = trainableNodes(nodes).filter((node) => node.opening_id === openingId)
  const progress = pool
    .map((node) => progressByNode.get(node.id))
    .filter((row): row is NodeProgress => Boolean(row))
  const recallRows = progress.filter((row) => row.last_recall_pass != null)
  const understandingRows = progress.filter((row) => row.last_understanding_pass != null)
  const recallEase = average(progress.map((row) => row.recall_ease))
  const understandingEase = average(progress.map((row) => row.understanding_ease))

  let weakestSkill: OpeningTrainingStats['weakestSkill'] = 'new'
  if (progress.length > 0) {
    if (recallEase + 0.05 < understandingEase) weakestSkill = 'recall'
    else if (understandingEase + 0.05 < recallEase) weakestSkill = 'understanding'
    else weakestSkill = 'balanced'
  }

  return {
    total: pool.length,
    attempted: progress.length,
    due: pool.filter((node) => {
      const row = progressByNode.get(node.id)
      return !row || new Date(row.due_at).getTime() <= now.getTime()
    }).length,
    recallPct:
      recallRows.length > 0
        ? Math.round((recallRows.filter((row) => row.last_recall_pass).length / recallRows.length) * 100)
        : null,
    understandingPct:
      understandingRows.length > 0
        ? Math.round(
            (understandingRows.filter((row) => row.last_understanding_pass).length /
              understandingRows.length) *
              100,
          )
        : null,
    weakestSkill,
    weakestEase:
      progress.length > 0 ? Math.min(recallEase, understandingEase) : Number.POSITIVE_INFINITY,
    lapses: progress.reduce((sum, row) => sum + row.lapses, 0),
  }
}

/** 8 recall items; MCQ on the first 5 that have tags (paired after the move). */
export function buildSession(
  nodes: BuiltNode[],
  progressByNode: Map<string, NodeProgress>,
  options: {
    recall?: number
    reason?: number
    now?: Date
    openingId?: string
    mode?: TrainingMode
  } = {},
): DrillItem[] {
  const recallN = options.recall ?? 8
  const reasonN = options.reason ?? 5
  const now = options.now ?? new Date()
  const mode = options.mode ?? 'scheduled'
  const pool = trainableNodes(nodes)
    .filter((node) => !options.openingId || node.opening_id === options.openingId)
    .sort((a, b) => {
      if (mode === 'foundations') {
        const ply = a.ply - b.ply
        if (ply !== 0) return ply
        return (b.frequency_weight ?? 1) - (a.frequency_weight ?? 1)
      }

      const aProgress = progressByNode.get(a.id)
      const bProgress = progressByNode.get(b.id)
      if (mode === 'weakest' && Boolean(aProgress) !== Boolean(bProgress)) {
        return aProgress ? -1 : 1
      }

      const due = dueScore(aProgress, now) - dueScore(bProgress, now)
      if (Number.isFinite(due) && due !== 0) return due

      if (mode === 'weakest' && aProgress && bProgress) {
        const ease =
          effectiveEase(aProgress.recall_ease, aProgress.understanding_ease) -
          effectiveEase(bProgress.recall_ease, bProgress.understanding_ease)
        if (ease !== 0) return ease
        if (aProgress.lapses !== bProgress.lapses) return bProgress.lapses - aProgress.lapses
      }

      return (b.frequency_weight ?? 1) - (a.frequency_weight ?? 1)
    })

  const picked = pool.slice(0, recallN)
  return picked.map((node, index) => ({
    node,
    parentFen: parentFen(nodes, node),
    includeReason: index < reasonN && node.reason_tags.length > 0,
  }))
}

export function progressFor(nodeId: string, map: Map<string, NodeProgress>): NodeProgress {
  return map.get(nodeId) ?? emptyProgress(nodeId)
}
