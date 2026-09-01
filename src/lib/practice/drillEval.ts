import { Chess, type Square } from 'chess.js'
import { evaluateLines } from '@/lib/analyzeClient'
import type { AnalysisBudget, EngineLine } from '@/lib/analysis/types'

/** Interactive drill search. Not used for persisted library analysis. */
export const DRILL_ANALYSIS_BUDGET: AnalysisBudget = {
  kind: 'depth',
  value: 16,
  multipv: 3,
}

/** How many upcoming positions to warm while the player thinks. */
export const DRILL_PREFETCH_AHEAD = 3

/** Treat MultiPV moves inside this white-relative CP window as engine-equal. */
export const DRILL_EQUAL_CP = 15

export type DrillEngineMove = {
  uci: string
  san: string
  cp: number
  mate: number | null
}

export type DrillEngineEval = {
  fen: string
  best: DrillEngineMove
  equals: DrillEngineMove[]
  lines: EngineLine[]
}

function uciToSan(fen: string, uci: string): string {
  if (!uci || uci === '0000' || uci.length < 4) return uci
  try {
    const board = new Chess(fen)
    const played = board.move({
      from: uci.slice(0, 2) as Square,
      to: uci.slice(2, 4) as Square,
      promotion: (uci[4] as 'q' | 'r' | 'b' | 'n' | undefined) ?? undefined,
    })
    return played?.san ?? uci
  } catch {
    return uci
  }
}

function asMove(fen: string, line: EngineLine): DrillEngineMove {
  return {
    uci: line.bestMove,
    san: line.pvSan[0] ?? uciToSan(fen, line.bestMove),
    cp: line.cp,
    mate: line.mate,
  }
}

export function equalEngineMoves(fen: string, lines: EngineLine[]): DrillEngineMove[] {
  const ranked = lines.filter((line) => line.bestMove && line.bestMove !== '0000')
  const principal = ranked[0]
  if (!principal) return []

  return ranked
    .filter((line) => {
      if (principal.mate != null || line.mate != null) {
        return principal.mate != null && line.mate === principal.mate
      }
      return Math.abs(line.cp - principal.cp) <= DRILL_EQUAL_CP
    })
    .map((line) => asMove(fen, line))
}

export function evalFromLines(fen: string, lines: EngineLine[]): DrillEngineEval | null {
  const equals = equalEngineMoves(fen, lines)
  const best = equals[0]
  if (!best) return null
  return { fen, best, equals, lines }
}

export function attemptMatchesEngine(
  evaluation: DrillEngineEval,
  attemptSan: string,
  attemptLan: string,
) {
  return evaluation.equals.some(
    (move) => move.san === attemptSan || move.uci === attemptLan || move.uci.startsWith(attemptLan),
  )
}

const cache = new Map<string, DrillEngineEval>()
const inflight = new Map<string, Promise<DrillEngineEval | null>>()

export function peekDrillEval(fen: string) {
  return cache.get(fen) ?? null
}

export async function loadDrillEval(fen: string): Promise<DrillEngineEval | null> {
  const hit = cache.get(fen)
  if (hit) return hit
  const pending = inflight.get(fen)
  if (pending) return pending

  const job = evaluateLines(fen, DRILL_ANALYSIS_BUDGET, DRILL_ANALYSIS_BUDGET.multipv)
    .then((lines) => {
      const result = evalFromLines(fen, lines)
      if (result) {
        cache.set(fen, result)
        if (cache.size > 80) {
          const oldest = cache.keys().next().value
          if (oldest && oldest !== fen) cache.delete(oldest)
        }
      }
      return result
    })
    .finally(() => {
      inflight.delete(fen)
    })

  inflight.set(fen, job)
  return job
}

export function prefetchDrillEvals(fens: string[]) {
  const unique: string[] = []
  const seen = new Set<string>()
  for (const fen of fens) {
    if (!fen || seen.has(fen) || cache.has(fen) || inflight.has(fen)) continue
    seen.add(fen)
    unique.push(fen)
  }
  for (const fen of unique) void loadDrillEval(fen)
}

export function readyDrillCount(fens: string[]) {
  return fens.filter((fen) => cache.has(fen)).length
}
