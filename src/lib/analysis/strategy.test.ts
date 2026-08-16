import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { averageAccuracy } from './classify'
import {
  accuracyFromBucket,
  applyEndgameResult,
  classifyEndgameEntry,
  classifyPositionStructure,
  classifyStrategyThemes,
  mergeStrategyStats,
  parseStrategyStats,
  recordStrategyMove,
  winPct,
} from './strategy'
import { emptyAccuracyBucket, emptyEndgameConversion, emptyStrategyStats } from './types'

function fenAfter(sans: string[]) {
  const board = new Chess()
  for (const san of sans) board.move(san)
  return board.fen()
}

describe('position structure', () => {
  it('treats the starting position as semi-closed', () => {
    expect(classifyPositionStructure(new Chess().fen())).toBe('semi_closed')
  })

  it('classifies the French Advance as closed', () => {
    expect(classifyPositionStructure(fenAfter(['e4', 'e6', 'd4', 'd5', 'e5']))).toBe('closed')
  })

  it('classifies a wide-open center as open', () => {
    expect(
      classifyPositionStructure('rnbqkbnr/pp3ppp/8/8/8/8/PP3PPP/RNBQKBNR w KQkq - 0 6'),
    ).toBe('open')
  })
})

describe('strategy themes', () => {
  it('tags developing a knight off the back rank as active piece play', () => {
    const themes = classifyStrategyThemes({
      fenBefore: new Chess().fen(),
      bestUci: 'g1f3',
      side: 'white',
    })
    expect(themes).toContain('activePiece')
  })

  it('tags a queen raid into the king zone as attacking', () => {
    const themes = classifyStrategyThemes({
      fenBefore: fenAfter(['e4', 'e5', 'Qh5', 'Nc6']),
      bestUci: 'h5f7',
      side: 'white',
    })
    expect(themes).toContain('attacking')
  })

  it('tags being in check as defending', () => {
    const board = new Chess()
    board.load('rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2')
    board.move('Qh4')
    const themes = classifyStrategyThemes({
      fenBefore: board.fen(),
      bestUci: 'e1e2',
      side: 'white',
    })
    expect(themes).toContain('defending')
  })

  it('tags a non-tactical pawn push as pawn structure', () => {
    const themes = classifyStrategyThemes({
      fenBefore: fenAfter(['e4', 'e6', 'd4', 'd5']),
      bestUci: 'e4e5',
      side: 'white',
    })
    expect(themes).toContain('pawnStructure')
  })

  it('tags a safe advance into the opponent half as space', () => {
    const themes = classifyStrategyThemes({
      fenBefore: fenAfter(['e4', 'e6', 'd4', 'd5']),
      bestUci: 'e4e5',
      side: 'white',
    })
    expect(themes).toContain('space')
  })
})

describe('accuracy aggregation', () => {
  it('matches RMS game accuracy', () => {
    const stats = emptyStrategyStats()
    recordStrategyMove(stats, 'open', ['attacking'], 90)
    recordStrategyMove(stats, 'open', ['attacking'], 70)
    expect(accuracyFromBucket(stats.all.attacking)).toBe(averageAccuracy([90, 70]))
    expect(accuracyFromBucket(stats.open.attacking)).toBe(averageAccuracy([90, 70]))
    expect(accuracyFromBucket(stats.closed.attacking)).toBeNull()
    expect(stats.all.overall.moves).toBe(2)
  })

  it('merges buckets across games', () => {
    const a = emptyStrategyStats()
    const b = emptyStrategyStats()
    recordStrategyMove(a, 'closed', ['defending'], 80)
    recordStrategyMove(b, 'closed', ['defending'], 60)
    mergeStrategyStats(a, b)
    expect(a.all.defending.moves).toBe(2)
    expect(accuracyFromBucket(a.closed.defending)).toBe(averageAccuracy([80, 60]))
  })

  it('reads legacy missing JSON as empty buckets', () => {
    const parsed = parseStrategyStats(null)
    expect(parsed.all.overall).toEqual(emptyAccuracyBucket())
  })
})

describe('endgame entry buckets', () => {
  it('splits better, equal, and worse from expected points', () => {
    expect(classifyEndgameEntry(0.8)).toBe('better')
    expect(classifyEndgameEntry(0.5)).toBe('equal')
    expect(classifyEndgameEntry(0.2)).toBe('worse')
  })

  it('records wins against the entry bucket', () => {
    const conversion = emptyEndgameConversion()
    applyEndgameResult(conversion, 'better', 0.82, 'win')
    applyEndgameResult(conversion, 'equal', 0.5, 'draw')
    applyEndgameResult(conversion, 'worse', 0.2, 'loss')
    expect(winPct(conversion.better)).toBe(100)
    expect(winPct(conversion.equal)).toBe(0)
    expect(conversion.worse.losses).toBe(1)
    expect(conversion.better.expectedScore).toBeCloseTo(0.82)
  })
})
