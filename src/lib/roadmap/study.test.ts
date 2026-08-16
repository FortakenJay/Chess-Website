import { Chess } from 'chess.js'
import { describe, expect, it } from 'vitest'
import { ROADMAP_TRACKS } from './topics'
import { isLegalStudyFen, studyDrillSearch, studyFor } from './study'

describe('roadmap study positions', () => {
  it('gives every strategy and endgame node a legal playable position', () => {
    const ids = ROADMAP_TRACKS.filter((track) => track.id === 'strategy' || track.id === 'endgames').flatMap(
      (track) => track.nodes.map((node) => node.id),
    )
    for (const id of ids) {
      const study = studyFor(id)
      expect(study, id).toBeTruthy()
      const fens = [study!.fen, ...(study!.extraFens ?? [])]
      for (const fen of fens) {
        expect(isLegalStudyFen(fen), `${id} ${fen}`).toBe(true)
        expect(new Chess(fen).moves().length, id).toBeGreaterThan(0)
      }
      expect(study!.quiz.choices[study!.quiz.answer]).toBeTruthy()
    }
  })

  it('packs extra positions into one drill search', () => {
    const lucena = studyFor('lucena')!
    expect(studyDrillSearch(lucena).fens?.split(';')).toHaveLength(2)
    expect(studyDrillSearch(studyFor('open-center')!)).toMatchObject({ fen: expect.any(String) })
  })
})
