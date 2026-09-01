import type { EngineLine } from '@/lib/analysis/types'
import { formatEval } from '@/lib/analysis/formatEval'

/** Chess.com-like suggestion arrows: opaque green principal, fading alts. */
export const SUGGESTION_ARROW_COLORS = [
  'rgba(129, 182, 76, 0.92)',
  'rgba(232, 197, 71, 0.78)',
  'rgba(149, 183, 118, 0.55)',
  'rgba(107, 110, 118, 0.5)',
  'rgba(107, 110, 118, 0.35)',
] as const

export type SuggestionArrow = {
  startSquare: string
  endSquare: string
  color: string
}

export function suggestionArrows(lines: EngineLine[], max = 3): SuggestionArrow[] {
  const arrows: SuggestionArrow[] = []
  const used = new Set<string>()
  for (const line of lines.slice(0, max)) {
    const uci = line.bestMove
    if (!uci || uci.length < 4) continue
    const startSquare = uci.slice(0, 2)
    const endSquare = uci.slice(2, 4)
    const key = `${startSquare}${endSquare}`
    if (used.has(key)) continue
    used.add(key)
    arrows.push({
      startSquare,
      endSquare,
      color: SUGGESTION_ARROW_COLORS[arrows.length] ?? SUGGESTION_ARROW_COLORS[4]!,
    })
  }
  return arrows
}

export function formatPv(line: EngineLine, maxMoves = 8) {
  const sans = line.pvSan.length ? line.pvSan : line.pvUci
  return sans.slice(0, maxMoves).join(' ')
}

/** Evidence-only copy: evals and SAN, no invented plans. */
export function whyTopMove(lines: EngineLine[]): string {
  const top = lines[0]
  if (!top) return 'Engine has no line yet.'
  const move = top.pvSan[0] ?? top.bestMove
  const score = formatEval(top.cp, top.mate)
  const second = lines[1]
  if (top.mate != null && top.mate !== 0) {
    return `${move} is principal — mate in ${Math.abs(top.mate)}.`
  }
  if (!second) return `${move} is the only scored line (${score}).`
  const alt = second.pvSan[0] ?? second.bestMove
  const altScore = formatEval(second.cp, second.mate)
  const gap = Math.abs(top.cp - second.cp)
  if (second.mate == null && gap <= 15) {
    return `${move} is principal at ${score}. ${alt} is engine-equal (${altScore}).`
  }
  return `${move} is principal at ${score}. Next is ${alt} at ${altScore}.`
}
