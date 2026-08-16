import type { KnowledgeCard } from '../types'

/** Hand-written. Explanations only. No evals, no frequencies. */
export const QGA_CLASSICAL: KnowledgeCard = {
  name: "Queen's Gambit Accepted, Classical",
  side: 'w',
  eco: 'D27',
  move_order: '1.d4 d5 2.c4 dxc4 3.Nf3 Nf6 4.e3 e6 5.Bxc4 c5 6.O-O a6',
  one_line_argument:
    'Deflect the d5 pawn, then own the center with d4 and e4 while Black is a tempo short of full development.',
  their_argument:
    'Give up e4 control in exchange for ...c5 in one move and an active light-squared bishop.',
  center: { type: 'tense_to_open', structure_family: 'iqp_prone' },
  space_and_targets: {
    who_has_space: 'white',
    my_targets: ['b5/c4 queenside pawns if Black overextends'],
    their_targets: ['d4 pawn'],
  },
  breaks: {
    mine: [
      {
        move: 'e3-e4',
        precondition: 'd4 defended, ...c5 pressure neutralized',
      },
    ],
    theirs: [
      { move: '...c5', why: 'only way to fight d4; Black cannot skip it' },
      { move: '...b5', why: 'gains a tempo on Bc4 and frees b7 for the bishop' },
    ],
  },
  problem_pieces: {
    mine: 'Bc1, shut in by e3',
    theirs: 'Bc8 if ...b5 never arrives',
  },
  move_order_logic: [
    {
      move: '1.d4',
      tags: ['control_square'],
      why: 'Occupies d4 and asks Black to meet it with ...d5 or give the center away.',
    },
    {
      move: '2.c4',
      tags: ['target_create'],
      why: 'Hits d5 so the pawn can be deflected off the center, opening a path to e4 later.',
    },
    {
      move: '3.Nf3',
      tags: ['prophylaxis'],
      why: 'Stops ...e5 before recapturing on c4.',
    },
    {
      move: '4.e3',
      tags: ['break_prep'],
      why: 'Prepares Bxc4 and the later e4 break once d4 is stable.',
    },
    {
      move: '5.Bxc4',
      tags: ['tempo_avoid'],
      why: 'Recaptures in one move; Bd3 first would spend a tempo and let Black hit the bishop later.',
    },
    {
      move: '6.O-O',
      tags: ['king_safety'],
      why: 'Tucks the king on g1 before ...c5 opens the center.',
    },
  ],
  expected_deviations: [],
  traps: [
    {
      line: '3.e3 b5? 4.a4 c6 5.axb5 cxb5?? 6.Qf3',
      motif: 'long diagonal / a8 rook',
    },
  ],
  typical_endgame: 'IQP-flavored minor piece and rook endings',
  theory_load: 2,
  style_fit: 'space and initiative, low tactical chaos',
  after_the_book: {
    when: 'After O-O and ...a6 the named Classical line is over. The rest is a queen-pawn middlegame: extra center versus ...c5 and ...b5.',
    your_jobs: [
      'Play a4 before ...b5 becomes comfortable, or meet ...b5 with a4 anyway.',
      'Put a rook on d1 and ask whether d4-d5 or e3-e4 is ready.',
      'If ...cxd4 happens, treat d4 as an IQP: attack with pieces, do not trade into a king ending.',
      'Finish Bc1 (b2 or g5) before starting a pawn storm.',
    ],
    their_jobs: [
      'Hit the center with ...c5, then ...b5 and ...Bb7.',
      'Trade pieces if they can freeze an isolated d-pawn.',
      'Do not grab c4 and then fall asleep on the queenside.',
    ],
    typical_structures: ['Tense d4/c5 center', 'Isolated queen pawn if ...cxd4'],
    if_they_deviate:
      'If they hold ...c5, you still complete development and look at e4. If they grab on c4 and play ...b5 too soon, a4 is the question, not more book moves.',
  },
  quizzes: [
    {
      prompt: 'When the Classical QGA book ends, what is the job?',
      choices: [
        'Treat it as an IQP or tense-center middlegame, not more opening theory',
        'Castle long and pawn-storm',
        'Force a Carlsbad minority attack',
        'Sacrifice on f7',
      ],
      answer: 0,
      why: 'The opening gave you a center. The middlegame is a4, Rd1, and either e4 or an IQP attack.',
    },
    {
      prompt: 'Black’s thematic queenside reaction is ...b5. What do you ask first?',
      choices: [
        'Whether a4 is ready',
        'Whether you can castle long',
        'Whether Nf3-g5 hits f7',
        'Whether to take on c5 immediately',
      ],
      answer: 0,
      why: 'a4 either prevents ...b5 or makes the pawn hanging. That is the Classical QGA middlegame question.',
    },
  ],
}
