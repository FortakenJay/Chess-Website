import { describe, expect, it } from 'vitest'
import {
  attemptMatchesEngine,
  evalFromLines,
  equalEngineMoves,
} from './drillEval'
import type { EngineLine } from '@/lib/analysis/types'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function line(multipv: number, bestMove: string, cp: number, san: string): EngineLine {
  return {
    multipv,
    bestMove,
    cp,
    mate: null,
    pvUci: [bestMove],
    pvSan: [san],
  }
}

describe('drillEval', () => {
  it('locks near-equal MultiPV moves as acceptable answers', () => {
    const lines = [
      line(1, 'h2h4', 12, 'h4'),
      line(2, 'h2h3', 8, 'h3'),
      line(3, 'a2a4', 80, 'a4'),
    ]
    const evaluation = evalFromLines(START, lines)
    expect(evaluation?.best.san).toBe('h4')
    expect(equalEngineMoves(START, lines).map((move) => move.san)).toEqual(['h4', 'h3'])
    expect(attemptMatchesEngine(evaluation!, 'h3', 'h2h3')).toBe(true)
    expect(attemptMatchesEngine(evaluation!, 'a4', 'a2a4')).toBe(false)
  })

  it('does not treat a worse mate as equal', () => {
    const lines: EngineLine[] = [
      { multipv: 1, bestMove: 'e2e4', cp: 100000, mate: 2, pvUci: ['e2e4'], pvSan: ['e4'] },
      { multipv: 2, bestMove: 'd2d4', cp: 20, mate: null, pvUci: ['d2d4'], pvSan: ['d4'] },
    ]
    const evaluation = evalFromLines(START, lines)
    expect(attemptMatchesEngine(evaluation!, 'd4', 'd2d4')).toBe(false)
    expect(attemptMatchesEngine(evaluation!, 'e4', 'e2e4')).toBe(true)
  })
})
