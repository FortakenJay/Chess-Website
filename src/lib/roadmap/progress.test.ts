import { describe, expect, it } from 'vitest'
import { emptyMarks, exposureLabel, nodeIsComplete, roadmapExposure, toggleCompleted } from './progress'
import { allRoadmapNodes, ROADMAP_TRACKS } from './topics'

describe('chess roadmap', () => {
  it('has unique node ids and chess track names', () => {
    const ids = allRoadmapNodes().map((node) => node.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ROADMAP_TRACKS.map((track) => track.kicker).join(' ')).not.toMatch(
      /hashing|pointers|sliding|graphs|DP/i,
    )
    expect(allRoadmapNodes().some((node) => node.id === 'italian')).toBe(true)
    expect(allRoadmapNodes().some((node) => node.id === 'sicilian')).toBe(true)
    expect(allRoadmapNodes().some((node) => /open game/i.test(node.title))).toBe(false)
    expect(allRoadmapNodes().find((node) => node.id === 'italian')?.know.length).toBeGreaterThan(0)
    expect(allRoadmapNodes().find((node) => node.id === 'italian')?.moves).toMatch(/Bc4/)
  })

  it('does not mark Italian done just because you played it, and does not count those games as Spanish', () => {
    const marks = emptyMarks()
    expect(nodeIsComplete('italian', marks)).toBe(false)
    const exposure = roadmapExposure(
      Array.from({ length: 12 }, () => ({
        opening_name: 'Italian Game',
        opening_eco: 'C50',
      })),
      [],
      [],
    )
    expect(exposure.get('italian')?.games).toBe(12)
    expect(exposure.get('spanish')?.games).toBe(0)
    expect(nodeIsComplete('italian', marks)).toBe(false)
    expect(exposureLabel(exposure.get('italian'))).toMatch(/12 games/)
  })

  it('counts successful motif drills as exposure, not completion', () => {
    const exposure = roadmapExposure(
      [],
      [
        { id: 'p1', motif: 'fork', phase: 'middlegame', fen_before: '8/8/8/8/8/8/8/8 w - - 0 1' },
        { id: 'p2', motif: 'fork', phase: 'middlegame', fen_before: '8/8/8/8/8/8/8/8 w - - 0 1' },
      ],
      [
        { position_id: 'p1', matched_best: true },
        { position_id: 'p2', matched_best: true },
      ],
    )
    expect(exposure.get('fork')).toMatchObject({ solves: 2, leaks: 2 })
    expect(nodeIsComplete('fork', emptyMarks())).toBe(false)
    expect(exposureLabel(exposure.get('fork'))).toMatch(/drill/i)
  })

  it('lets a manual mark be the only completion signal', () => {
    const marks = toggleCompleted(emptyMarks(), 'lucena')
    expect(nodeIsComplete('lucena', marks)).toBe(true)
    expect(nodeIsComplete('lucena', toggleCompleted(marks, 'lucena'))).toBe(false)
  })
})
