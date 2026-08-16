import type { NodeProgress } from './types'

export const DEFAULT_EASE = 2.5
export const MIN_EASE = 1.3

export function reviewEase(ease: number, pass: boolean): number {
  if (pass) return Math.round((ease + 0.15) * 100) / 100
  return Math.max(MIN_EASE, Math.round((ease - 0.25) * 100) / 100)
}

export function intervalDays(ease: number, streakAfterPass: number): number {
  if (streakAfterPass <= 1) return 1
  if (streakAfterPass === 2) return 3
  let days = 3
  for (let n = 3; n <= streakAfterPass; n++) {
    days = Math.max(4, Math.round(days * ease))
  }
  return days
}

export function effectiveEase(recall: number, understanding: number): number {
  return Math.min(recall, understanding)
}

export function applyReview(
  current: NodeProgress,
  result: { recall?: boolean; understanding?: boolean },
  now = new Date(),
): NodeProgress {
  const recallEase =
    result.recall == null ? current.recall_ease : reviewEase(current.recall_ease, result.recall)
  const understandingEase =
    result.understanding == null
      ? current.understanding_ease
      : reviewEase(current.understanding_ease, result.understanding)

  const failed =
    result.recall === false || result.understanding === false
  const streak = failed ? 0 : current.streak + 1
  const lapses = current.lapses + (failed ? 1 : 0)
  const ease = effectiveEase(recallEase, understandingEase)
  const days = failed ? 0 : intervalDays(ease, streak)
  const due = new Date(now)
  due.setUTCDate(due.getUTCDate() + days)

  return {
    node_id: current.node_id,
    recall_ease: recallEase,
    understanding_ease: understandingEase,
    due_at: due.toISOString(),
    last_recall_pass: result.recall ?? current.last_recall_pass,
    last_understanding_pass: result.understanding ?? current.last_understanding_pass,
    streak,
    lapses,
  }
}

export function emptyProgress(nodeId: string, now = new Date()): NodeProgress {
  return {
    node_id: nodeId,
    recall_ease: DEFAULT_EASE,
    understanding_ease: DEFAULT_EASE,
    due_at: now.toISOString(),
    last_recall_pass: null,
    last_understanding_pass: null,
    streak: 0,
    lapses: 0,
  }
}
