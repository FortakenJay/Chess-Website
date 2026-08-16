import { Chess } from 'chess.js'
import { CENTER_LESSONS, classifyOpeningFamily, familyForOpening } from './families'
import {
  breaksFromBoard,
  explainPlayedMove,
  heuristicMoveLogic,
  undevelopedBishops,
} from './explainMove'
import { matchesOpeningQuery } from './matchPlayed'
import { SEED_CARDS } from './seed'
import { matchPawnStructure, structureById, type StructureId } from './structures'
import { formatMoveOrder, parseMoveOrderSans } from './tree'
import { commentariesFromMainline } from './commentaryTemplates'
import { validateKnowledgeCard } from './validate'
import {
  COMMENTARY_GENERATOR_VERSION,
  type AfterTheBook,
  type KnowledgeCard,
  type LessonQuiz,
  type LessonVariation,
  type TrainedSide,
} from './types'

export { destinationSquare, heuristicMoveLogic, numberedMove } from './explainMove'

export const MAX_TEACHING_PLY = 20

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

function defaultBreaks(board: Chess, side: TrainedSide): KnowledgeCard['breaks'] {
  return breaksFromBoard(board, side)
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
  breakNotes: string[]
}): AfterTheBook {
  const tail = args.sans.slice(-2).join(' ')
  const structure = args.structureId ? structureById(args.structureId) : null
  const yours = args.side === 'w' ? structure?.lesson.whitePlan : structure?.lesson.blackPlan
  const theirs = args.side === 'w' ? structure?.lesson.blackPlan : structure?.lesson.whitePlan
  const extra = args.breakNotes
  return {
    when: `After ${tail}, the named line is over. The rest is a middlegame: finish development, then play the breaks that are actually legal.`,
    your_jobs: yours
      ? [yours, structure!.lesson.breaks, ...extra, 'Do not keep reciting moves — ask which break is ready.']
      : [
          'Castle if the king is still in the center.',
          'Complete the last minor piece, then play the thematic pawn break.',
          args.centerBody,
          ...extra,
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
  const board = new Chess()
  const moveLogic = sans.map((san, index) => {
    const logic = explainPlayedMove(board, san, index + 1)
    const played = board.move(san)
    if (!played) return heuristicMoveLogic(index + 1, san)
    return logic
  })
  const family = familyForOpening({ eco: input.eco, name: input.name })
  const familyId = classifyOpeningFamily(input.eco, input.name)
  const structureId = matchPawnStructure(board.fen())
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
    : familyId === 'semi_open'
      ? 'Fight for the extra center (d4 vs ...d5) and the half-open c-file. Do not copy a later kingside attack onto a position where your own knight still blocks f2–f4.'
      : family
        ? `Play the ${family.name} so you get a ${centerLesson.name.toLowerCase()}, then the breaks once development is done.`
        : `Occupy the center, castle, then play the thematic pawn break.`

  const theirLine = structure
    ? input.side === 'w'
      ? structure.lesson.blackPlan
      : structure.lesson.whitePlan
    : familyId === 'semi_open'
      ? 'Equalize with ...d5 or pressure e4 on the c-file. Do not wait to be squeezed on a kingside attack that is not legal yet.'
      : 'Equalize first, then hit the center or the file you were given.'

  const breaks = defaultBreaks(board, input.side)
  const bishops = undevelopedBishops(board, input.side)
  const breakNotes = [...breaks.mine, ...breaks.theirs]
    .map((item) => item.precondition)
    .filter((row): row is string => Boolean(row))

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
      my_targets: structure
        ? [structure.lesson.weaknesses]
        : ['the extra center squares', 'the files that will open after the first pawn trade'],
      their_targets: structure
        ? [structure.lesson.attackDirection]
        : ['your uncastled king', 'the pawn that is no longer defended after a break'],
    },
    breaks,
    problem_pieces: bishops,
    move_order_logic: moveLogic,
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
      breakNotes,
    }),
    low_confidence: true,
    uncertain_fields: ['move_order_logic', 'traps'],
  }

    const card: KnowledgeCard = {
    ...cardWithoutQuizzes,
    quizzes: makeQuizzes(cardWithoutQuizzes),
    commentaries: commentariesFromMainline(sans),
    generator_version: COMMENTARY_GENERATOR_VERSION,
    provenance: 'generated',
  }
  const issues = validateKnowledgeCard(card)
  if (issues.length) {
    throw new Error(issues.map((issue) => `${issue.path}: ${issue.message}`).join('\n'))
  }
  return card
}
