import { describe, expect, it } from 'vitest'
import {
  classifyExpectedPoints,
  evaluateBrilliantGates,
  expectedPoints,
  expectedPointsLost,
  isGreatMove,
  isMiss,
  persistentSacrificeValue,
} from './moveClassifier'
import type { EngineEval, EngineLine } from './types'

function evaluation(cp: number, mate: number | null = null): EngineEval {
  return { cp, mate, mateForStm: mate, bestMove: '0000' }
}

function line(multipv: number, cp: number, bestMove: string): EngineLine {
  return {
    multipv,
    cp,
    mate: null,
    bestMove,
    pvUci: [bestMove],
    pvSan: [],
  }
}

describe('expected-points base classification', () => {
  it('uses the published logistic curve for +800 to +600', () => {
    const lost = expectedPointsLost(evaluation(800), evaluation(600), 'white')
    expect(lost).toBeCloseTo(0.04898, 4)
    expect(classifyExpectedPoints(lost)).toBe('good')
  })

  it('classifies +100 to -100 from the same mover POV', () => {
    const lost = expectedPointsLost(evaluation(100), evaluation(-100), 'white')
    expect(lost).toBeCloseTo(0.18205, 4)
    expect(classifyExpectedPoints(lost)).toBe('mistake')
  })

  it('treats mate-for-mover as ep 1 regardless of mate distance', () => {
    expect(expectedPoints(evaluation(99_700, 3), 'white')).toBe(1)
    expect(expectedPoints(evaluation(99_500, 5), 'white')).toBe(1)
    expect(
      classifyExpectedPoints(
        expectedPointsLost(evaluation(99_700, 3), evaluation(99_500, 5), 'white'),
      ),
    ).toBe('best')
  })

  it('normalizes black evaluations to the same mover POV', () => {
    const lost = expectedPointsLost(evaluation(-100), evaluation(100), 'black')
    expect(lost).toBeCloseTo(0.18205, 4)
  })
})

describe('brilliant gates', () => {
  it("accepts Légal's queen sacrifice into forced mate", () => {
    const fen = 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 2 5'
    const result = evaluateBrilliantGates({
      fenBefore: fen,
      playedUci: 'f3e5',
      mover: 'white',
      rating: 1400,
      evalBeforeCp: 20,
      evalAfterCp: 30,
      bestCp: 30,
      candidates: [
        line(1, 30, 'f3e5'),
        line(2, 5, 'c3d5'),
        line(3, -40, 'd2d3'),
        line(4, -80, 'h2h3'),
      ],
      // Shorter than eight plies is accepted because the PV ends in checkmate.
      pvAfter: ['g4d1', 'c4f7', 'e8e7', 'c3d5'],
    })
    expect(result).toMatchObject({ brilliant: true, failedGate: null })
    expect(result.sacrificeValue).toBeGreaterThanOrEqual(800)
  })

  it('rejects a rook trade restored by immediate recapture', () => {
    const fen = '3q2k1/8/8/3r4/3R4/8/8/3Q2K1 w - - 0 1'
    expect(
      persistentSacrificeValue({
        fenBefore: fen,
        playedUci: 'd4d5',
        mover: 'white',
        pvAfter: ['d8d5', 'd1d5'],
      }),
    ).toBe(0)
  })

  it('rejects a best sacrifice played from +600 at Gate 2', () => {
    const result = evaluateBrilliantGates({
      fenBefore: 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 2 5',
      playedUci: 'f3e5',
      mover: 'white',
      rating: 1400,
      evalBeforeCp: 600,
      evalAfterCp: 620,
      bestCp: 620,
      candidates: [
        line(1, 620, 'f3e5'),
        line(2, 580, 'c3d5'),
        line(3, 500, 'd2d3'),
        line(4, 450, 'h2h3'),
      ],
      pvAfter: ['g4d1', 'c4f7', 'e8e7', 'c3d5'],
    })
    expect(result).toMatchObject({ brilliant: false, failedGate: 2 })
  })

  it('rejects many-roads-win positions at Gate 5', () => {
    const result = evaluateBrilliantGates({
      fenBefore: 'r2qkbnr/ppp2ppp/2np4/4p3/2B1P1b1/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 2 5',
      playedUci: 'f3e5',
      mover: 'white',
      rating: 1400,
      evalBeforeCp: 20,
      evalAfterCp: 30,
      bestCp: 30,
      candidates: [
        line(1, 30, 'f3e5'),
        line(2, 25, 'c3d5'),
        line(3, 20, 'd2d3'),
        line(4, -80, 'h2h3'),
      ],
      pvAfter: ['g4d1', 'c4f7', 'e8e7', 'c3d5'],
    })
    expect(result).toMatchObject({ brilliant: false, failedGate: 5 })
  })
})

describe('Great and Miss overrides', () => {
  it('marks the only move that keeps expected points above the losing threshold as Great', () => {
    expect(
      isGreatMove({
        epBefore: 0.5,
        epAfter: 0.5,
        mover: 'white',
        candidates: [
          line(1, 0, 'e2e4'),
          line(2, -200, 'd2d4'),
          line(3, -300, 'g1f3'),
          line(4, -400, 'c2c4'),
        ],
      }),
    ).toBe(true)
  })

  it('marks a squandered winning chance after an opponent mistake as Miss', () => {
    expect(
      isMiss({
        previousOpponentEpLost: 0.12,
        epBefore: 0.72,
        epAfter: 0.6,
      }),
    ).toBe(true)
  })
})
