import { isReasonTag, TAGS_NEEDING_TARGET, type ReasonTag } from './tags'
import type { KnowledgeCard, MoveOrderLogic, PawnBreak } from './types'

const EVAL_RE = /[+-]\d+\.\d+|\b[+-]\d+\b|\b\d{1,3}%|\b(?:eval|acpl|centipawn)s?\b/i
const PIECE_SQUARE_RE = /[KQRBN][a-h][1-8]/
const TARGET_RE = /[a-h][1-8]|\.\.\.\S+|O-O-O|O-O/

export type ValidationIssue = { path: string; message: string }

export function validateKnowledgeCard(card: KnowledgeCard): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (!card.breaks?.mine?.length) {
    issues.push({ path: 'breaks.mine', message: 'Need at least one of your breaks (or a maneuvering plan).' })
  }
  if (!card.breaks?.theirs?.length) {
    issues.push({ path: 'breaks.theirs', message: 'Need at least one of their breaks (or a maneuvering plan).' })
  }
  for (const [path, list] of [
    ['breaks.mine', card.breaks?.mine ?? []],
    ['breaks.theirs', card.breaks?.theirs ?? []],
  ] as const) {
    list.forEach((item, i) => issues.push(...validateBreak(`${path}[${i}]`, item)))
  }

  if (!card.move_order_logic?.length) {
    issues.push({ path: 'move_order_logic', message: 'Need at least one annotated move.' })
  }
  card.move_order_logic?.forEach((entry, i) => {
    issues.push(...validateMoveLogic(`move_order_logic[${i}]`, entry))
  })

  if (!PIECE_SQUARE_RE.test(card.problem_pieces?.mine ?? '')) {
    issues.push({
      path: 'problem_pieces.mine',
      message: 'Name a piece on a square (e.g. Bc1), not a description.',
    })
  }
  if (!PIECE_SQUARE_RE.test(card.problem_pieces?.theirs ?? '')) {
    issues.push({
      path: 'problem_pieces.theirs',
      message: 'Name a piece on a square (e.g. Bc8), not a description.',
    })
  }

  if ((card.expected_deviations ?? []).length > 0) {
    issues.push({
      path: 'expected_deviations',
      message: 'Leave empty. Explorer sync fills deviations, not the card author.',
    })
  }

  walkStrings(card, '', (path, value) => {
    if (path.startsWith('expected_deviations')) return
    if (EVAL_RE.test(value)) {
      issues.push({
        path,
        message: 'No evals, win percentages, or engine numbers in explanation fields.',
      })
    }
  })

  if (!card.one_line_argument?.trim() || !card.their_argument?.trim()) {
    issues.push({
      path: 'one_line_argument',
      message: 'State the trade-off: what you give up and what you get.',
    })
  }

  card.quizzes?.forEach((quiz, i) => {
    const path = `quizzes[${i}]`
    if (!quiz.prompt?.trim()) issues.push({ path: `${path}.prompt`, message: 'Need a question.' })
    if (!quiz.choices || quiz.choices.length < 2) {
      issues.push({ path: `${path}.choices`, message: 'Need at least two choices.' })
    }
    if (quiz.answer < 0 || quiz.answer >= (quiz.choices?.length ?? 0)) {
      issues.push({ path: `${path}.answer`, message: 'Answer index is out of range.' })
    }
    if (!quiz.why?.trim()) issues.push({ path: `${path}.why`, message: 'Explain the answer.' })
  })

  if (card.after_the_book) {
    if (!card.after_the_book.when?.trim()) {
      issues.push({ path: 'after_the_book.when', message: 'Say when the book ends.' })
    }
    if (!card.after_the_book.your_jobs?.length) {
      issues.push({ path: 'after_the_book.your_jobs', message: 'Name at least one middlegame job.' })
    }
  }

  return issues
}

function validateBreak(path: string, item: PawnBreak): ValidationIssue[] {
  const plan = `${item.move} ${item.precondition ?? ''} ${item.why ?? ''}`
  const isNone = /^none\b/i.test(item.move)
  if (isNone) {
    if (!item.why && !item.precondition) {
      return [{ path, message: 'If there is no pawn break, say what the maneuvering plan is.' }]
    }
    return []
  }
  if (!item.move.trim()) return [{ path: `${path}.move`, message: 'Name the pawn break.' }]
  if (!item.precondition && !item.why) {
    return [{ path, message: 'Each break needs a precondition or a reason.' }]
  }
  if (!TARGET_RE.test(plan) && !/[a-h][2-7]/.test(item.move)) {
    return [{ path, message: 'Name the pawn or square in the break.' }]
  }
  return []
}

export function validateMoveLogic(path: string, entry: MoveOrderLogic): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!entry.tags?.length) {
    issues.push({ path: `${path}.tags`, message: 'Need at least one reason tag from the enum.' })
  }
  for (const tag of entry.tags ?? []) {
    if (!isReasonTag(tag)) {
      issues.push({ path: `${path}.tags`, message: `Unknown tag "${tag}".` })
    }
  }
  const why = entry.why?.trim() ?? ''
  if (!why) issues.push({ path: `${path}.why`, message: 'Need a one-sentence reason.' })
  const needsTarget = (entry.tags ?? []).some((tag) =>
    TAGS_NEEDING_TARGET.includes(tag as ReasonTag),
  )
  if (needsTarget && why && !TARGET_RE.test(why)) {
    issues.push({
      path: `${path}.why`,
      message: 'prophylaxis / break_prep / break_stop / control_square must name a move or square.',
    })
  }
  const vague = /^(improves the position|develops with tempo|good development|natural move)\.?$/i
  if (vague.test(why)) {
    issues.push({ path: `${path}.why`, message: 'Reason is too vague.' })
  }
  return issues
}

export function validateReasonText(tags: ReasonTag[], text: string | null): ValidationIssue[] {
  if (!tags.length) return []
  return validateMoveLogic('node', { move: '', tags, why: text ?? '' })
}

function walkStrings(value: unknown, path: string, visit: (path: string, value: string) => void) {
  if (typeof value === 'string') {
    visit(path, value)
    return
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => walkStrings(item, `${path}[${i}]`, visit))
    return
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      walkStrings(child, path ? `${path}.${key}` : key, visit)
    }
  }
}
