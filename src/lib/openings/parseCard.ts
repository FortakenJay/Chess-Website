import type { KnowledgeCard } from './types'

export function parseKnowledgeCard(value: unknown): KnowledgeCard | null {
  if (!value || typeof value !== 'object') return null
  const card = value as KnowledgeCard
  if (typeof card.name !== 'string' || typeof card.move_order !== 'string') return null
  if (typeof card.one_line_argument !== 'string') return null
  if (card.side !== 'w' && card.side !== 'b') return null
  if (!card.breaks || !card.move_order_logic) return null
  return card
}

export function hasMiddlegameLesson(card: KnowledgeCard | null): boolean {
  return Boolean(card?.after_the_book?.your_jobs.length || card?.quizzes?.length)
}
