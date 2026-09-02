import { describe, expect, it } from 'vitest'
import { trainingLoop, worstOpeningLeak } from './trainingLoop'

describe('worstOpeningLeak', () => {
  it('ranks high-volume losing branches and ignores tiny samples', () => {
    const london = Array.from({ length: 10 }, () => ({
      opening_name: 'London System',
      opening_eco: 'D02',
      result: 'loss' as const,
      color: 'white',
    }))
    london[0] = { ...london[0]!, result: 'win' }
    const italian = Array.from({ length: 3 }, () => ({
      opening_name: 'Italian Game',
      opening_eco: 'C50',
      result: 'loss' as const,
      color: 'white',
    }))
    const leak = worstOpeningLeak([...london, ...italian])
    expect(leak?.name).toBe('London System')
    expect(leak?.games).toBe(10)
    expect(leak?.winPct).toBe(10)
  })
})

describe('trainingLoop', () => {
  it('walks drill → repertoire → puzzles → convert → review', () => {
    const games = Array.from({ length: 8 }, () => ({
      opening_name: 'Sicilian Defense',
      opening_eco: 'B20',
      result: 'loss' as const,
      color: 'black',
    }))
    const steps = trainingLoop({
      headline: {
        phase: 'opening',
        errorPct: 22,
        sample: 40,
        topMotif: 'hanging_piece',
        motifShare: 40,
      },
      games,
      positions: [{ phase: 'endgame' }, { phase: 'endgame' }, { phase: 'middlegame' }],
    })
    expect(steps.map((step) => step.id)).toEqual(['drill', 'opening', 'puzzles', 'endgame', 'review'])
    expect(steps[0]?.primary).toMatchObject({
      to: '/drill/$username',
      search: { phase: 'opening', motif: 'hanging_piece', order: 'worst' },
    })
    expect(steps[1]?.title).toContain('Sicilian')
    expect(steps[1]?.secondary?.search).toEqual({ tab: 'learn' })
    expect(steps[3]?.primary.search).toEqual({ phase: 'endgame', order: 'worst' })
    expect(steps[4]?.primary.to).toBe('/review/$username')
  })

  it('offers Learn + foundations when no opening has a WR leak', () => {
    const steps = trainingLoop({
      headline: null,
      games: [
        { opening_name: 'Italian Game', opening_eco: 'C50', result: 'win', color: 'white' },
      ],
      positions: [],
    })
    expect(steps.map((step) => step.id)).toEqual(['drill', 'opening', 'puzzles', 'endgame', 'review'])
    expect(steps[0]?.primary.search).toEqual({ order: 'worst' })
    expect(steps[1]?.primary.search).toEqual({ tab: 'learn' })
    expect(steps[1]?.secondary?.search).toEqual({ tab: 'foundations' })
  })
})
