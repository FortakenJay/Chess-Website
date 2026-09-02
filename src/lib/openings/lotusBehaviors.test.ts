import { describe, expect, it } from 'vitest'
import { pickExplorerContinuation, type ExplorerResponse } from './explorer'
import { pickHumanMove } from './humanPick'
import { learnInsteadQuery, openingScoreStats } from './openingScore'
import { repertoireMissPlies, repertoireMovesFromNodes } from './repertoireMiss'
import type { AnalyzedPly } from '@/lib/analysis/types'

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

function ply(overrides: Partial<AnalyzedPly> & Pick<AnalyzedPly, 'san' | 'isUserMove'>): AnalyzedPly {
  return {
    ply: 0,
    moveNumber: 1,
    from: 'e2',
    to: 'e4',
    color: 'white',
    fenBefore: START,
    fenAfter: START,
    evalCp: 0,
    mate: null,
    loss: null,
    accuracy: null,
    epLost: null,
    quality: 'good',
    classification: null,
    bestSan: null,
    bestUci: null,
    ...overrides,
  }
}

function explorer(moves: Array<{ san: string; white: number; draws: number; black: number }>): ExplorerResponse {
  return {
    white: moves.reduce((sum, move) => sum + move.white, 0),
    draws: moves.reduce((sum, move) => sum + move.draws, 0),
    black: moves.reduce((sum, move) => sum + move.black, 0),
    moves: moves.map((move) => ({
      uci: move.san,
      san: move.san,
      white: move.white,
      draws: move.draws,
      black: move.black,
    })),
  }
}

describe('pickHumanMove', () => {
  it('picks the higher amateur WR among frequency-clustered moves', () => {
    const pick = pickHumanMove([
      { san: 'h3', plays: 80, pct: 22, winPct: 41 },
      { san: 'h4', plays: 78, pct: 21, winPct: 54 },
      { san: 'a3', plays: 10, pct: 3, winPct: 70 },
    ])
    expect(pick?.san).toBe('h4')
  })

  it('falls back to frequency when WR is missing', () => {
    const pick = pickHumanMove([
      { san: 'Nf3', plays: 200, pct: 40, winPct: null },
      { san: 'Nc3', plays: 180, pct: 38, winPct: null },
    ])
    expect(pick?.san).toBe('Nf3')
  })
})

describe('pickExplorerContinuation', () => {
  const data = explorer([
    { san: 'e4', white: 40, draws: 6, black: 50 },
    { san: 'd4', white: 55, draws: 4, black: 35 },
  ])

  it('tie-breaks our moves on amateur WR', () => {
    expect(pickExplorerContinuation(data, 'w', 'w')?.san).toBe('d4')
  })

  it('keeps opponent replies frequency-first', () => {
    expect(pickExplorerContinuation(data, 'w', 'b')?.san).toBe('e4')
  })
})

describe('openingScoreStats', () => {
  it('weights high-volume losing branches', () => {
    const games = Array.from({ length: 10 }, () => ({
      opening_name: 'London System',
      opening_eco: 'D02',
      result: 'loss' as const,
      color: 'white',
    }))
    games[0] = { ...games[0]!, result: 'win' }
    const stats = openingScoreStats({ name: 'London System', eco: 'D02' }, games, 'w')
    expect(stats.games).toBe(10)
    expect(stats.winPct).toBe(10)
    expect(stats.leakWeight).toBe(10 * 40)
  })

  it('suggests a different named system in the same family', () => {
    expect(learnInsteadQuery({ name: 'London System', eco: 'D02' })).toBe("Queen's Gambit Declined")
  })
})

describe('repertoireMissPlies', () => {
  it('marks a user ply that left a taught reply, not unknown FENs', () => {
    const nodes = repertoireMovesFromNodes([
      {
        id: 'n1',
        parent_node_id: null,
        fen: 'rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq - 0 1',
        san: 'd4',
        is_mine: true,
        source: 'repertoire',
      },
    ])
    const missed = repertoireMissPlies(
      [
        ply({ ply: 0, san: 'e4', isUserMove: true }),
        ply({
          ply: 1,
          san: 'e5',
          isUserMove: false,
          fenBefore: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
        }),
      ],
      nodes,
    )
    expect(missed.has(0)).toBe(true)
    expect(missed.has(1)).toBe(false)

    const unknown = repertoireMissPlies(
      [
        ply({
          ply: 10,
          san: 'Qh5',
          isUserMove: true,
          fenBefore: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
        }),
      ],
      nodes,
    )
    expect(unknown.size).toBe(0)
  })
})
