import type { EngineLine } from '@/lib/analysis/types'

/** Engine-close window for Lotus-style amateur WR tie-break (~0.3 pawns). */
export const HUMAN_EQUAL_CP = 30
export const HUMAN_MIN_PLAYS = 20
export const HUMAN_FREQ_CLUSTER = 3

export type HumanPickCandidate = {
  san: string
  plays: number
  pct: number
  winPct: number | null
  /** Side-to-move relative centipawns when MultiPV is available. */
  stmCp?: number
}

export function stmCp(line: EngineLine, stm: 'w' | 'b') {
  return stm === 'w' ? line.cp : -line.cp
}

export function engineCloseSans(lines: EngineLine[], stm: 'w' | 'b', windowCp = HUMAN_EQUAL_CP) {
  if (lines.length === 0) return []
  let best = stmCp(lines[0]!, stm)
  for (const line of lines) {
    const score = stmCp(line, stm)
    if (score > best) best = score
  }
  const sans: string[] = []
  for (const line of lines) {
    if (best - stmCp(line, stm) > windowCp) continue
    const san = line.pvSan[0]
    if (san && !sans.includes(san)) sans.push(san)
  }
  return sans
}

/**
 * Among engine-close (or frequency-clustered) moves, pick the amateur win rate.
 * Does not invent WR — missing winPct falls back to frequency. Never writes prose.
 */
export function pickHumanMove(candidates: HumanPickCandidate[]): HumanPickCandidate | null {
  if (candidates.length === 0) return null
  const withCp = candidates.filter((row) => row.stmCp != null)
  let pool = candidates
  if (withCp.length > 0) {
    let best = withCp[0]!.stmCp!
    for (const row of withCp) {
      if (row.stmCp! > best) best = row.stmCp!
    }
    pool = withCp.filter((row) => best - row.stmCp! <= HUMAN_EQUAL_CP)
  } else {
    let bestPct = candidates[0]!.pct
    for (const row of candidates) {
      if (row.pct > bestPct) bestPct = row.pct
    }
    pool = candidates.filter((row) => bestPct - row.pct <= HUMAN_FREQ_CLUSTER)
  }

  const scored = pool.filter(
    (row) => row.winPct != null && row.plays >= HUMAN_MIN_PLAYS,
  )
  if (scored.length > 0) {
    let best = scored[0]!
    for (const row of scored) {
      if ((row.winPct ?? 0) > (best.winPct ?? 0)) best = row
      else if (row.winPct === best.winPct && row.plays > best.plays) best = row
    }
    return best
  }

  let freq = pool[0]!
  for (const row of pool) {
    if (row.pct > freq.pct || (row.pct === freq.pct && row.plays > freq.plays)) freq = row
  }
  return freq
}

export function rankByHumanPick(candidates: HumanPickCandidate[]) {
  const remaining = [...candidates]
  const ordered: HumanPickCandidate[] = []
  while (remaining.length) {
    const pick = pickHumanMove(remaining)
    if (!pick) break
    ordered.push(pick)
    const index = remaining.findIndex((row) => row.san === pick.san)
    if (index >= 0) remaining.splice(index, 1)
  }
  return ordered
}
