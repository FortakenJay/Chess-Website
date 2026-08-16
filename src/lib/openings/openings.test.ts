import { describe, expect, it } from 'vitest'
import { Chess } from 'chess.js'
import { buildFromCard } from './buildFromCard'
import { parseAlternatives, parseExplorerStats } from './commentary'
import { commentaryFromEvidence } from './commentaryTemplates'
import { pickDistractors, reasonChoices } from './distractors'
import { importPgn } from './importPgn'
import { applyReview, emptyProgress, effectiveEase } from './schedule'
import { SEED_CARDS } from './seed'
import { matchesOpeningQuery, openingPlayedCount } from './matchPlayed'
import { buildSession, openingTrainingStats, trainableNodes } from './session'
import { parseMoveOrderSans } from './tree'
import { validateGeneratedClaims, validateKnowledgeCard } from './validate'
import type { KnowledgeCard } from './types'
import type { Json } from '@/lib/supabase/database.types'
import { rankOpeningHits } from './searchCatalog'
import { destinationSquare, heuristicMoveLogic, lessonFromOpening } from './lessonFromOpening'
import { openingFromDownloadHit } from './downloadLine'
import { expandSearchQuery, humanOpeningLabel } from './nicknames'

describe('seed cards', () => {
  it('accepts all hand-written cards', () => {
    for (const card of SEED_CARDS) {
      expect(validateKnowledgeCard(card), card.name).toEqual([])
    }
  })

  it('builds a repertoire tree with tagged mine moves', () => {
    const built = buildFromCard(SEED_CARDS[0]!)
    const mine = built.nodes.filter((node) => node.is_mine)
    expect(mine).toHaveLength(6)
    expect(mine.every((node) => node.reason_tags.length >= 1)).toBe(true)
    expect(mine[2]!.san).toBe('Nf3')
    expect(mine[2]!.reason_tags).toContain('prophylaxis')
  })
})

describe('validateKnowledgeCard', () => {
  const base = (): KnowledgeCard => structuredClone(SEED_CARDS[0]!)

  it('rejects eval numbers in explanation fields', () => {
    const card = base()
    card.one_line_argument = 'White is +1.2 after the break.'
    expect(validateKnowledgeCard(card).some((issue) => issue.message.includes('eval'))).toBe(true)
  })

  it('rejects prophylaxis without a named square or move', () => {
    const card = base()
    card.move_order_logic[2] = {
      move: '3.Nf3',
      tags: ['prophylaxis'],
      why: 'Improves the position',
    }
    const issues = validateKnowledgeCard(card)
    expect(issues.some((issue) => issue.path.includes('move_order_logic[2]'))).toBe(true)
  })

  it('rejects problem pieces that are only prose', () => {
    const card = base()
    card.problem_pieces.mine = 'the queen bishop'
    expect(validateKnowledgeCard(card).some((issue) => issue.path === 'problem_pieces.mine')).toBe(
      true,
    )
  })
})

describe('importPgn', () => {
  it('reads tagged comments onto the move that reached that fen', () => {
    const pgn = `[Event "Test"]
[Opening "Italian"]
[ECO "C50"]

1. e4 {control_square: occupies e4 and asks for ...e5} e5 2. Nf3 {tempo_gain: hits e5} Nc6 *`
    const [line] = importPgn(pgn, {
      side: 'w',
      idFactory: (() => {
        let n = 0
        return () => `id-${++n}`
      })(),
    })
    expect(line?.name).toBe('Italian')
    expect(line?.nodes).toHaveLength(4)
    expect(line?.nodes[0]).toMatchObject({
      san: 'e4',
      is_mine: true,
      reason_tags: ['control_square'],
    })
    expect(line?.nodes[1]?.is_mine).toBe(false)
    expect(line?.nodes[2]?.reason_tags).toContain('tempo_gain')
  })
})

describe('parseMoveOrderSans', () => {
  it('strips numbers from a one-line move order', () => {
    expect(parseMoveOrderSans('1.d4 d5 2.c4 dxc4 3.Nf3')).toEqual(['d4', 'd5', 'c4', 'dxc4', 'Nf3'])
  })
})

describe('distractors', () => {
  it('never includes the true tag', () => {
    const wrong = pickDistractors('prophylaxis', ['develop', 'tempo_gain', 'prophylaxis'], 'n1')
    expect(wrong).toHaveLength(3)
    expect(wrong).not.toContain('prophylaxis')
    const choices = reasonChoices('prophylaxis', ['develop', 'tempo_gain'], 'n1')
    expect(choices).toHaveLength(4)
    expect(new Set(choices).size).toBe(4)
    expect(choices).toContain('prophylaxis')
  })
})

describe('schedule', () => {
  it('uses min(recall, understanding) so a weak side keeps the node due', () => {
    const start = emptyProgress('n1', new Date('2026-08-15T00:00:00Z'))
    const afterRecall = applyReview(
      start,
      { recall: true },
      new Date('2026-08-15T00:00:00Z'),
    )
    expect(afterRecall.recall_ease).toBeGreaterThan(start.recall_ease)
    expect(effectiveEase(afterRecall.recall_ease, afterRecall.understanding_ease)).toBe(
      afterRecall.understanding_ease,
    )

    const afterFail = applyReview(
      afterRecall,
      { understanding: false },
      new Date('2026-08-15T00:00:00Z'),
    )
    expect(afterFail.due_at.startsWith('2026-08-15')).toBe(true)
    expect(afterFail.streak).toBe(0)
  })
})

describe('session', () => {
  it('picks 8 recall items and flags 5 for reason MCQ', () => {
    const nodes = SEED_CARDS.flatMap((card) => buildFromCard(card).nodes)
    const trainable = trainableNodes(nodes)
    expect(trainable.length).toBeGreaterThanOrEqual(8)
    const session = buildSession(nodes, new Map())
    expect(session).toHaveLength(8)
    expect(session.filter((item) => item.includeReason)).toHaveLength(5)
    expect(session.every((item) => item.node.is_mine)).toBe(true)
  })

  it('filters to the selected opening and can start from foundational moves', () => {
    const nodes = buildFromCard(SEED_CARDS[0]!).nodes.map((node) => ({
      ...node,
      opening_id: 'opening-a',
    }))
    const session = buildSession(nodes, new Map(), {
      openingId: 'opening-a',
      mode: 'foundations',
    })
    expect(session.length).toBeGreaterThan(0)
    expect(session.every((item) => item.node.opening_id === 'opening-a')).toBe(true)
    expect(session.map((item) => item.node.ply)).toEqual(
      session.map((item) => item.node.ply).sort((a, b) => a - b),
    )
  })

  it('prioritizes attempted weak positions in weak-spot mode', () => {
    const nodes = buildFromCard(SEED_CARDS[0]!).nodes
      .filter((node) => node.is_mine)
      .slice(0, 3)
      .map((node) => ({ ...node, opening_id: 'opening-a' }))
    const now = new Date('2026-08-15T00:00:00Z')
    const stronger = emptyProgress(nodes[0]!.id, now)
    const weaker = {
      ...emptyProgress(nodes[1]!.id, now),
      recall_ease: 1.3,
      understanding_ease: 1.5,
      lapses: 3,
    }
    const progress = new Map([
      [stronger.node_id, stronger],
      [weaker.node_id, weaker],
    ])
    const session = buildSession(nodes, progress, {
      openingId: 'opening-a',
      mode: 'weakest',
      now,
    })
    expect(session[0]?.node.id).toBe(weaker.node_id)
    expect(session[2]?.node.id).toBe(nodes[2]?.id)
  })

  it('summarizes recall and understanding gaps by opening', () => {
    const nodes = buildFromCard(SEED_CARDS[0]!).nodes
      .filter((node) => node.is_mine)
      .slice(0, 2)
      .map((node) => ({ ...node, opening_id: 'opening-a' }))
    const progress = new Map([
      [
        nodes[0]!.id,
        {
          ...emptyProgress(nodes[0]!.id),
          recall_ease: 1.5,
          understanding_ease: 2.5,
          last_recall_pass: false,
          last_understanding_pass: true,
          lapses: 2,
        },
      ],
    ])
    const stats = openingTrainingStats(nodes, progress, 'opening-a')
    expect(stats).toMatchObject({
      total: 2,
      attempted: 1,
      recallPct: 0,
      understandingPct: 100,
      weakestSkill: 'recall',
      lapses: 2,
    })
  })
})

describe('openingPlayedCount', () => {
  it('does not treat a generic Italian as the Fried Liver', () => {
    const fried = { name: 'Italian Game, Fried Liver Attack', eco: 'C57' }
    const piano = { name: 'Italian Game, Giuoco Piano', eco: 'C50' }
    const games = [
      { opening_name: 'Italian Game: Giuoco Piano', opening_eco: 'C50' },
      { opening_name: 'Italian Game', opening_eco: 'C50' },
    ]
    expect(openingPlayedCount(fried, games)).toBe(0)
    expect(openingPlayedCount(piano, games)).toBe(2)
  })

  it('matches a typed opening name without listing the whole catalog', () => {
    const fried = { name: 'Italian Game, Fried Liver Attack', eco: 'C57' }
    const piano = { name: 'Italian Game, Giuoco Piano', eco: 'C50' }
    expect(matchesOpeningQuery(fried, 'fried liver')).toBe(true)
    expect(matchesOpeningQuery(fried, 'C57')).toBe(true)
    expect(matchesOpeningQuery(piano, 'fried')).toBe(false)
  })

  it('counts a Fried Liver game by name or ECO', () => {
    const fried = { name: 'Italian Game, Fried Liver Attack', eco: 'C57' }
    expect(
      openingPlayedCount(fried, [
        {
          opening_name: 'Italian Game: Two Knights Defense, Fried Liver Attack',
          opening_eco: 'C57',
        },
      ]),
    ).toBe(1)
  })
})

describe('opening encyclopedia search', () => {
  it('ranks an ECO root named Vienna above a longer alias miss', () => {
    const hits = rankOpeningHits(
      [
        { name: 'Italian Game', eco: 'C50', moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4', isEcoRoot: true },
        { name: 'Vienna Game', eco: 'C25', moves: '1. e4 e5 2. Nc3', isEcoRoot: true },
        {
          name: 'Vienna Game, Vienna Gambit',
          eco: 'C29',
          moves: '1. e4 e5 2. Nc3 Nf6 3. f4 d5',
          isEcoRoot: false,
        },
      ],
      'Vienna',
    )
    expect(hits[0]?.name).toMatch(/Vienna/)
    expect(hits.some((hit) => hit.name.includes('Italian'))).toBe(false)
  })

  it('does not crash when an encyclopedia row has no ECO code', () => {
    const hits = rankOpeningHits(
      [
        {
          name: 'Vienna Game',
          eco: undefined as unknown as string,
          moves: '1. e4 e5 2. Nc3',
        },
      ],
      'Vienna',
    )
    expect(hits.some((hit) => hit.name.includes('Vienna'))).toBe(true)
  })

  it('puts the Dragon main line ahead of Yugoslav and Accelerated branches', () => {
    const hits = rankOpeningHits(
      [
        {
          name: 'Sicilian Defense: Accelerated Dragon, Maróczy Bind',
          eco: 'B36',
          moves: '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4 g6 5. c4',
          isEcoRoot: true,
        },
        {
          name: 'Sicilian Defense: Dragon Variation, Yugoslav Attack',
          eco: 'B76',
          moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 7. f3 O-O',
          isEcoRoot: true,
        },
        {
          name: 'Sicilian Defense: Dragon Variation',
          eco: 'B70',
          moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6',
          isEcoRoot: true,
        },
        {
          name: 'English Opening: King\'s English Variation, Two Knights Variation, Reversed Dragon',
          eco: 'A22',
          moves: '1. c4 e5 2. Nc3 Nf6 3. g3',
          isEcoRoot: false,
        },
      ],
      'sicilian dragon',
    )
    expect(hits[0]?.name).toBe('Sicilian Defense: Dragon Variation')
    expect(hits[0]?.eco).toBe('B70')
    expect(hits.some((hit) => hit.name.includes('Reversed Dragon'))).toBe(false)
  })

  it('treats club nicknames as the main line people mean', () => {
    expect(expandSearchQuery('dragon')).toBe('sicilian dragon')
    expect(expandSearchQuery('spanish')).toBe('ruy lopez')
    expect(expandSearchQuery('drgon')).toBe('sicilian dragon')
    expect(humanOpeningLabel('Sicilian Defense: Dragon Variation', 'B70').title).toBe('Dragon')
    const hits = rankOpeningHits(
      [
        {
          name: 'Sicilian Defense: Dragon Variation, Yugoslav Attack',
          eco: 'B76',
          moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 7. f3 O-O',
          isEcoRoot: true,
        },
        {
          name: 'Sicilian Defense: Dragon Variation',
          eco: 'B70',
          moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6',
          isEcoRoot: true,
        },
      ],
      'dragon',
    )
    expect(hits[0]?.eco).toBe('B70')
  })
})

describe('openingFromDownloadHit', () => {
  it('builds a trainable Dragon line without a server round-trip', () => {
    const built = openingFromDownloadHit({
      name: 'Sicilian Defense: Dragon Variation',
      eco: 'B70',
      moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6',
      side: 'b',
    })
    expect(built.name).toBe('Sicilian Defense: Dragon Variation')
    expect(built.nodes.some((node) => node.is_mine && node.reason_tags.length > 0)).toBe(true)
  })
})

describe('lessonFromOpening', () => {
  it('returns the authored Vienna card instead of inventing a short ECO stub', () => {
    const card = lessonFromOpening({
      name: 'Vienna Game',
      eco: 'C25',
      moves: '1. e4 e5 2. Nc3',
      side: 'w',
    })
    expect(card.name).toBe('Vienna Game, Vienna Gambit')
    expect(card.after_the_book?.your_jobs.length).toBeGreaterThan(0)
    expect(card.quizzes?.length).toBeGreaterThan(0)
    expect(validateKnowledgeCard(card)).toEqual([])
  })

  it('builds a valid teaching card from a named line that is not in the seed', () => {
    const card = lessonFromOpening({
      name: 'Scotch Game',
      eco: 'C45',
      moves: '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4',
      side: 'w',
    })
    expect(card.low_confidence).toBe(true)
    expect(card.after_the_book?.your_jobs.length).toBeGreaterThan(0)
    expect(validateKnowledgeCard(card)).toEqual([])
    expect(
      buildFromCard(card)
        .nodes.filter((node) => node.is_mine)
        .every((node) => node.reason_tags.length >= 1),
    ).toBe(true)
  })

  it('names a square when tagging control_square from a pawn move', () => {
    const logic = heuristicMoveLogic(1, 'e4')
    expect(logic.tags).toContain('control_square')
    expect(destinationSquare('e4')).toBe('e4')
    expect(logic.why).toContain('e4')
  })

  it('does not teach f4-f5 as current in the Old Sicilian while Nf3 blocks f2', () => {
    const card = lessonFromOpening({
      name: 'Sicilian Defense: Old Sicilian',
      eco: 'B30',
      moves: '1. e4 c5 2. Nf3 Nc6',
      side: 'w',
    })
    expect(card.low_confidence).toBe(true)
    expect(card.center.structure_family).not.toBe('sicilian_scheveningen')
    const nf3 = card.move_order_logic.find((row) => row.move.includes('Nf3'))
    expect(nf3?.why).toMatch(/f3|f2/i)
    const f4 = card.breaks.mine.find((row) => /f4/.test(row.move))
    expect(f4?.precondition).toMatch(/f3|blocks/i)
    expect(validateKnowledgeCard(card)).toEqual([])
  })

  it('mentions that Nxd4 frees the f-pawn', () => {
    const card = lessonFromOpening({
      name: 'Sicilian Defense',
      eco: 'B32',
      moves: '1. e4 c5 2. Nf3 Nc6 3. d4 cxd4 4. Nxd4',
      side: 'w',
    })
    const recapture = card.move_order_logic.find((row) => row.move.includes('Nxd4'))
    expect(recapture?.why).toMatch(/f4|f3/i)
    expect(validateKnowledgeCard(card)).toEqual([])
  })

  it('stores evidence-backed commentary keyed by ply and SAN', () => {
    const card = lessonFromOpening({
      name: 'Scotch Game',
      eco: 'C45',
      moves: '1. e4 e5 2. Nf3 Nc6 3. d4 exd4 4. Nxd4',
      side: 'w',
    })
    const nf3 = card.commentaries?.['3:Nf3']
    expect(nf3?.problem).toMatch(/knight/i)
    expect(nf3?.drawback).toMatch(/f2–f4|illegal/i)
    expect(nf3?.confidence).toBe('evidence')
    expect(validateKnowledgeCard(card)).toEqual([])
  })
})

describe('importPgn tree', () => {
  it('keeps RAV variations as sibling nodes', () => {
    const pgn = `[Event "Test"]
[Opening "Open Game"]

1. e4 e5 (1... c5 2. Nf3) 2. Nf3 *`
    const [line] = importPgn(pgn, {
      side: 'w',
      idFactory: (() => {
        let n = 0
        return () => `id-${++n}`
      })(),
    })
    const sans = line?.nodes.map((node) => node.san) ?? []
    expect(sans).toContain('c5')
    expect(sans.filter((san) => san === 'Nf3').length).toBeGreaterThanOrEqual(2)
    const e4 = line?.nodes.find((node) => node.san === 'e4')
    const c5 = line?.nodes.find((node) => node.san === 'c5')
    expect(c5?.parent_node_id).toBe(e4?.id)
    expect(c5?.ply).toBe(2)
  })

  it('marks imported comments as user-supplied', () => {
    const pgn = `[Event "Study"]
[Opening "Italian"]

1. e4 {Hits the center} e5 *`
    const [line] = importPgn(pgn, { side: 'w' })
    expect(line?.nodes[0]?.commentary?.provenance).toBe('imported')
    expect(line?.nodes[0]?.commentary?.confidence).toBe('imported')
  })
})

describe('generated commentary claims', () => {
  it('rejects a comment that treats f2-f4 as legal while Nf3 blocks it', () => {
    const board = new Chess()
    board.move('e4')
    board.move('c5')
    const commentary = commentaryFromEvidence(board, 'Nf3', 3)!
    expect(commentary.evidence.blocked_breaks.some((row) => /f2/.test(row))).toBe(true)
    expect(validateGeneratedClaims(commentary)).toEqual([])
    const forged: typeof commentary = {
      ...commentary,
      problem: 'f2–f4 cramps e6 so it sags.',
      accomplishes: 'f2–f4 cramps e6 so it sags.',
      why: 'f2–f4 cramps e6 so it sags.',
      drawback: 'f2–f4 cramps e6 so it sags.',
      enables: undefined,
      if_omitted: undefined,
    }
    expect(validateGeneratedClaims(forged).length).toBeGreaterThan(0)
  })

  it('hydrates explorer stats and alternatives from JSON', () => {
    const alts = parseAlternatives([
      { san: 'Nc3', tag: 'develop', why_worse: 'Does not hit e5' },
    ] as unknown as Json)
    expect(alts[0]?.san).toBe('Nc3')
    const stats = parseExplorerStats([
      { rating_band: '1600-1800', san: 'd6', plays: 100, pct: 12.5, win_pct: 48, corpus: 'club' },
    ] as unknown as Json)
    expect(stats?.[0]?.san).toBe('d6')
    expect(stats?.[0]?.corpus).toBe('club')
  })
})
