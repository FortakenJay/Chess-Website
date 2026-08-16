import type { KnowledgeCard } from '../types'

/** Hand-written. Explanations only. No evals, no frequencies. */
export const ITALIAN_PIANO: KnowledgeCard = {
  name: 'Italian Game, Giuoco Piano',
  side: 'w',
  eco: 'C50',
  move_order: '1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d3 d6 6.O-O O-O',
  one_line_argument:
    'Hold e4 with a slow d3, then play d4 only after Nf6 is under watch, aiming at f7.',
  their_argument:
    'Copy development with ...Bc5 and wait for ...d5, or hit Bc4 with ...Na5.',
  center: { type: 'tense', structure_family: 'italian_closed' },
  space_and_targets: {
    who_has_space: 'equal',
    my_targets: ['f7', 'the a2-g8 diagonal'],
    their_targets: ['f2', 'Nb1-d2 if White delays d4 too long'],
  },
  breaks: {
    mine: [
      {
        move: 'd3-d4',
        precondition: 'c3 played, e4 defended, and ...Bg4 not pinning Nf3 uncomfortably',
      },
    ],
    theirs: [
      { move: '...d5', why: 'the standard central strike once ...Nf6 and ...O-O are done' },
      { move: '...Na5', why: 'removes Bc4, White’s best piece against f7' },
    ],
  },
  problem_pieces: {
    mine: 'Bc1 until d3-d4 or Be3 opens it',
    theirs: 'Bc8 if ...d6 keeps it behind the pawn chain',
  },
  move_order_logic: [
    {
      move: '1.e4',
      tags: ['control_square'],
      why: 'Takes e4 and opens the queen and bishop, asking Black to occupy e5.',
    },
    {
      move: '2.Nf3',
      tags: ['tempo_gain'],
      why: 'Develops and hits e5, forcing Black to defend it.',
    },
    {
      move: '3.Bc4',
      tags: ['control_square'],
      why: 'Aims at f7, the weakest point in Black’s camp before castling.',
    },
    {
      move: '4.c3',
      tags: ['break_prep'],
      why: 'Prepares d2-d4 and keeps a knight off d4.',
    },
    {
      move: '5.d3',
      tags: ['break_stop'],
      why: 'Defends e4 so ...Nf6 cannot rip the center before White is ready for d4.',
    },
    {
      move: '6.O-O',
      tags: ['king_safety'],
      why: 'Tucks the king on g1 before the d4 break opens the middle.',
    },
  ],
  expected_deviations: [],
  traps: [
    {
      line: '4.d4 exd4 5.cxd4 Bb4+ if White grabbed the center too early without Nf3-d2 ideas',
      motif: 'check on b4 / hanging e4',
    },
  ],
  typical_endgame: 'Italian bishop vs knight with a locked e4/e5 chain',
  theory_load: 2,
  style_fit: 'slow build, piece play around f7 and d4',
  after_the_book: {
    when: 'After both sides castle, the Giuoco Piano is a tense Italian middlegame. The book did not tell you when to play d4 — that is the whole remaining job.',
    your_jobs: [
      'Play d4 only when e4 is safe and ...Bg4 is not pinning Nf3 uncomfortably.',
      'Reroute Nb1-d2-f1-g3 (or a3/Ba2) before forcing the center open.',
      'Use a4 to stop ...b5 and to give Bc4 a retreat on a2.',
      'Keep aiming at f7. If you release the tension too early, Black equalizes with ...d5.',
    ],
    their_jobs: [
      'Hit Bc4 with ...Na5, or break with ...d5 once ...Nf6 and ...O-O are done.',
      'Pin Nf3 with ...Bg4 if White rushes d4.',
      'Expand with ...a6 and ...b5 only after the king is safe.',
    ],
    typical_structures: ['Tense e4/e5 Italian', 'Open Italian if d4 and ...exd4 happen'],
    if_they_deviate:
      'If they play ...Na5, retreat the bishop and ask whether d4 is stronger now that f7 is less of a target. Do not keep reciting c3-d3-O-O.',
  },
  quizzes: [
    {
      prompt: 'The quiet Italian book ends at both sides castled. What is the next question?',
      choices: [
        'Is d4 ready, or does Nf3 still need cover?',
        'Can you sacrifice on f7 immediately?',
        'Should you castle long?',
        'Do you play f4 like a Vienna Gambit?',
      ],
      answer: 0,
      why: 'd3 held e4. The middlegame is choosing the moment for d4, not inventing a new opening.',
    },
    {
      prompt: 'Black’s two standard ways to punish a sleepy Italian are…',
      choices: [
        '...d5 and ...Na5',
        '...f5 and ...g5',
        '...c6 and ...d5 on move three',
        '...Qh4 and ...Bc5',
      ],
      answer: 0,
      why: '...d5 is the central strike. ...Na5 removes the bishop that eyes f7. Both are the Piano’s real problems.',
    },
  ],
}
