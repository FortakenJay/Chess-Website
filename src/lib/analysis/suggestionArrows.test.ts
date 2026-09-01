import { describe, expect, it } from 'vitest'
import { suggestionArrows, whyTopMove } from './suggestionArrows'
import type { EngineLine } from './types'

function line(partial: Partial<EngineLine> & Pick<EngineLine, 'bestMove'>): EngineLine {
  return {
    multipv: 1,
    cp: 40,
    mate: null,
    pvUci: [partial.bestMove],
    pvSan: ['e4'],
    ...partial,
  }
}

describe('suggestion arrows', () => {
  it('paints the principal line green and skips duplicate UCIs', () => {
    const arrows = suggestionArrows([
      line({ bestMove: 'e2e4', pvSan: ['e4'] }),
      line({ multipv: 2, bestMove: 'e2e4', pvSan: ['e4'], cp: 35 }),
      line({ multipv: 3, bestMove: 'd2d4', pvSan: ['d4'], cp: 20 }),
    ])
    expect(arrows).toHaveLength(2)
    expect(arrows[0]).toMatchObject({ startSquare: 'e2', endSquare: 'e4' })
    expect(arrows[0]?.color).toContain('129, 182, 76')
    expect(arrows[1]).toMatchObject({ startSquare: 'd2', endSquare: 'd4' })
  })
})

describe('whyTopMove', () => {
  it('names evals and SAN only', () => {
    const copy = whyTopMove([
      line({ bestMove: 'e2e4', pvSan: ['e4'], cp: 40 }),
      line({ multipv: 2, bestMove: 'd2d4', pvSan: ['d4'], cp: 10 }),
    ])
    expect(copy).toContain('e4')
    expect(copy).toContain('d4')
    expect(copy.toLowerCase()).not.toContain('plan')
  })

  it('marks engine-equal seconds inside 15cp', () => {
    const copy = whyTopMove([
      line({ bestMove: 'h2h4', pvSan: ['h4'], cp: 12 }),
      line({ multipv: 2, bestMove: 'h2h3', pvSan: ['h3'], cp: 8 }),
    ])
    expect(copy).toContain('engine-equal')
  })
})
