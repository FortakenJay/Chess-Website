import { CENTER_LESSONS, classifyOpeningFamily, familyForOpening } from './families'
import { matchesOpeningQuery } from './matchPlayed'
import { SEED_CARDS } from './seed'
import { structureById, structureFromOpening, type StructureId } from './structures'
import { formatMoveOrder, parseMoveOrderSans } from './tree'
import type {
  AfterTheBook,
  KnowledgeCard,
  LessonQuiz,
  LessonVariation,
  MoveOrderLogic,
  TrainedSide,
} from './types'
import { validateKnowledgeCard } from './validate'

export const MAX_TEACHING_PLY = 16

export function numberedMove(ply: number, san: string): string {
  const n = Math.ceil(ply / 2)
  return ply % 2 === 1 ? `${n}.${san}` : `${n}...${san}`
}

export function destinationSquare(san: string): string | null {
  const clean = san.replace(/[+#]+$/g, '').replace(/=[QRBN]/, '')
  if (clean === 'O-O' || clean === 'O-O-O') return null
  const match = /[a-h][1-8]$/.exec(clean)
  return match?.[0] ?? null
}

export function heuristicMoveLogic(ply: number, san: string): MoveOrderLogic {
  const move = numberedMove(ply, san)
  const dest = destinationSquare(san)
  if (san === 'O-O' || san === 'O-O-O') {
    return {
      move,
      tags: ['king_safety'],
      why:
        san === 'O-O'
          ? 'Castles short so the king leaves the center before files open.'
          : 'Castles long so the king leaves the e-file and a rook can use the d-file.',
    }
  }
  if (san.includes('x') && dest) {
    return {
      move,
      tags: ['tempo_gain'],
      why: `Takes on ${dest} and forces a recapture or a concession.`,
    }
  }
  if (/^[NBRQK]/.test(san) && dest) {
    const piece =
      san[0] === 'N'
        ? 'knight'
        : san[0] === 'B'
          ? 'bishop'
          : san[0] === 'R'
            ? 'rook'
            : san[0] === 'Q'
              ? 'queen'
              : 'king'
    return {
      move,
      tags: ['develop'],
      why: `Develops the ${piece} toward ${dest}.`,
    }
  }
  if (dest) {
    return {
      move,
      tags: ['control_square'],
      why: `Takes ${dest} and asks the opponent to contest the center.`,
    }
  }
  return {
    move,
    tags: ['develop'],
    why: 'Puts a piece into the game and prepares the next developing move.',
  }
}

export function authoredCardFor(
  name: string,
  eco: string | null,
  side: TrainedSide,
): KnowledgeCard | null {
  const ecoCode = eco?.trim().toUpperCase() ?? ''
  const byEco = SEED_CARDS.find((card) => card.side === side && card.eco?.toUpperCase() === ecoCode)
  if (byEco) return byEco
  const named = SEED_CARDS.filter((card) => card.side === side && matchesOpeningQuery(card, name))
  if (named.length === 1) return named[0]!
  return named.find((card) => card.name.toLowerCase() === name.trim().toLowerCase()) ?? null
}

function defaultBreaks(sans: string[], side: TrainedSide): KnowledgeCard['breaks'] {
  const first = sans[0] ?? 'e4'
  const isE4 = first === 'e4'
  if (side === 'w') {
    return {
      mine: [
        {
          move: isE4 ? 'd4' : 'e4',
          why: `The second central pawn strike once development is ready, asking them to take or push past ${isE4 ? 'e4' : 'd4'}.`,
        },
      ],
      theirs: [
        {
          move: isE4 ? '...d5' : '...c5',
          why: `Challenges your extra center pawn on ${isE4 ? 'e4' : 'd4'}.`,
        },
      ],
    }
  }
  return {
    mine: [
      {
        move: isE4 ? '...d5' : '...c5',
        why: 'The thematic strike against White’s extra center once your pieces are ready.',
      },
    ],
    theirs: [
      {
        move: isE4 ? 'd4' : 'e4',
        why: `White’s second pawn break, opening files toward ${isE4 ? 'e5' : 'd5'} before you finish development.`,
      },
    ],
  }
}

function quizChoices(correct: string, distractors: string[], salt: string): LessonQuiz['choices'] {
  const unique = [correct, ...distractors.filter((row) => row && row !== correct)].slice(0, 4)
  while (unique.length < 4) unique.push(`Wait and see what they play next (${unique.length})`)
  let hash = 0
  for (const ch of salt) hash = (hash * 31 + ch.charCodeAt(0)) | 0
  const rotate = Math.abs(hash) % unique.length
  return [...unique.slice(rotate), ...unique.slice(0, rotate)]
}

function makeQuizzes(card: Omit<KnowledgeCard, 'quizzes'>): LessonQuiz[] {
  const myBreak = card.breaks.mine[0]?.move ?? 'the thematic break'
  const theirBreak = card.breaks.theirs[0]?.move ?? 'their break'
  const job = card.after_the_book?.your_jobs[0] ?? 'Finish development and play the breaks.'
  const argument = card.one_line_argument
  const q1Choices = quizChoices(argument, [card.their_argument, 'Grab every center pawn at once.', 'Castle long and mate on the h-file.'], card.name)
  const q2Choices = quizChoices(myBreak, [theirBreak, 'h4-h5', 'g4'], `${card.name}-break`)
  const q3Choices = quizChoices(job, ['Keep reciting moves until they blunder.', 'Hunt the nearest pawn with the queen.', 'Trade every piece into a king ending.'], `${card.name}-job`)
  return [
    {
      prompt: 'What is your argument in this opening?',
      choices: q1Choices,
      answer: q1Choices.indexOf(argument),
      why: 'The opening is a trade-off, not a list of moves. If you cannot say the deal, you are still in the book.',
    },
    {
      prompt: 'What is your thematic break once the book ends?',
      choices: q2Choices,
      answer: q2Choices.indexOf(myBreak),
      why: `Play ${myBreak} when the precondition is real. Their answer is ${theirBreak}.`,
    },
    {
      prompt: 'When theory ends, what is the first middlegame job?',
      choices: q3Choices,
      answer: q3Choices.indexOf(job),
      why: job,
    },
  ]
}

function afterTheBookFor(args: {
  sans: string[]
  side: TrainedSide
  structureId: StructureId | null
  centerBody: string
}): AfterTheBook {
  const tail = args.sans.slice(-2).join(' ')
  const structure = args.structureId ? structureById(args.structureId) : null
  const yours = args.side === 'w' ? structure?.lesson.whitePlan : structure?.lesson.blackPlan
  const theirs = args.side === 'w' ? structure?.lesson.blackPlan : structure?.lesson.whitePlan
  return {
    when: `After ${tail}, the named line is over. The rest is a middlegame: finish development, then play the breaks.`,
    your_jobs: yours
      ? [yours, structure!.lesson.breaks, 'Do not keep reciting moves — ask which break is ready.']
      : [
          'Castle if the king is still in the center.',
          'Complete the last minor piece, then play the thematic pawn break.',
          args.centerBody,
        ],
    their_jobs: theirs
      ? [theirs, 'If they skip their break, your extra space or file is the plan.']
      : ['Hit your extra center or file before you get comfortable.', 'Trade if the resulting ending favors their structure.'],
    typical_structures: structure ? [structure.name] : ['The center type you just built'],
    if_they_deviate:
      'Stop. Name the square they just occupied, then ask which of your breaks that move allowed or prevented.',
  }
}

export function lessonFromOpening(input: {
  name: string
  eco: string | null
  moves: string
  side: TrainedSide
  variations?: LessonVariation[]
}): KnowledgeCard {
  const authored = authoredCardFor(input.name, input.eco, input.side)
  if (authored) return authored

  const sans = parseMoveOrderSans(input.moves).slice(0, MAX_TEACHING_PLY)
  const family = familyForOpening({ eco: input.eco, name: input.name })
  const familyId = classifyOpeningFamily(input.eco, input.name)
  const structureId = structureFromOpening(input.name, input.eco)
  const structure = structureId ? structureById(structureId) : null
  const centerType =
    familyId === 'closed_game'
      ? 'tense'
      : familyId === 'semi_closed'
        ? 'closed'
        : familyId === 'semi_open'
          ? 'semi_open'
          : familyId === 'flank'
            ? 'fluid'
            : 'open'
  const centerLesson =
    CENTER_LESSONS.find((row) =>
      centerType.includes('closed')
        ? row.id === 'closed'
        : centerType.includes('tense')
          ? row.id === 'tense'
          : centerType.includes('semi')
            ? row.id === 'fixed'
            : row.id === 'open',
    ) ?? CENTER_LESSONS[0]!

  const oneLine = structure
    ? input.side === 'w'
      ? structure.lesson.whitePlan
      : structure.lesson.blackPlan
    : family
      ? `Play the ${family.name} so you get a ${centerLesson.name.toLowerCase()}, then the breaks once development is done.`
      : `Occupy the center, castle, then play the thematic pawn break.`

  const theirLine = structure
    ? input.side === 'w'
      ? structure.lesson.blackPlan
      : structure.lesson.whitePlan
    : 'Equalize first, then hit the center or the file you were given.'

  const cardWithoutQuizzes: Omit<KnowledgeCard, 'quizzes'> = {
    name: input.name,
    side: input.side,
    eco: input.eco ?? undefined,
    move_order: formatMoveOrder(sans),
    one_line_argument: oneLine,
    their_argument: theirLine,
    center: {
      type: centerType,
      structure_family: structureId ?? familyId ?? 'unknown',
    },
    space_and_targets: {
      who_has_space: input.side === 'w' ? 'white' : 'black',
      my_targets: structure ? [structure.lesson.weaknesses] : ['the extra center squares'],
      their_targets: structure ? [structure.lesson.attackDirection] : ['your uncastled king'],
    },
    breaks: defaultBreaks(sans, input.side),
    problem_pieces: {
      mine: 'Bc1 until the center opens',
      theirs: 'Bc8 until the center opens',
    },
    move_order_logic: sans.map((san, index) => heuristicMoveLogic(index + 1, san)),
    expected_deviations: [],
    traps: [],
    typical_endgame: structure?.lesson.endgame ?? 'The ending follows the same breaks as the middlegame.',
    theory_load: Math.min(5, Math.max(1, Math.ceil(sans.length / 4))),
    style_fit: family?.name ?? 'typical club continuation',
    variations: input.variations,
    after_the_book: afterTheBookFor({
      sans,
      side: input.side,
      structureId,
      centerBody: centerLesson.body,
    }),
    low_confidence: true,
    uncertain_fields: ['move_order_logic', 'traps'],
  }

  const card: KnowledgeCard = {
    ...cardWithoutQuizzes,
    quizzes: makeQuizzes(cardWithoutQuizzes),
  }
  const issues = validateKnowledgeCard(card)
  if (issues.length) {
    throw new Error(issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'))
  }
  return card
}
