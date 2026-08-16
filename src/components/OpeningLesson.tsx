import { useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { PlaySplit } from '@/components/FittedBoardFrame'
import { MiniBoard } from '@/components/MiniBoard'
import { Button, Panel, segmentItemVariants } from '@/components/ui'
import { productBoardStyles } from '@/lib/boardTheme'
import { cn } from '@/lib/cn'
import { commentaryKey } from '@/lib/openings/evidence'
import { matchLogic, parseMoveOrderSans, positionsAlong } from '@/lib/openings/tree'
import type {
  CommentaryConfidence,
  KnowledgeCard,
  LessonVariation,
  MoveCommentary,
} from '@/lib/openings/types'

type LessonSection = 'idea' | 'line' | 'plans' | 'after' | 'traps' | 'quiz'

const SECTION_LABEL: Record<LessonSection, string> = {
  idea: 'The idea',
  line: 'The line',
  plans: 'Both sides',
  after: 'Middlegame',
  traps: 'Traps',
  quiz: 'Check',
}

const TIER_LABEL: Record<CommentaryConfidence, string> = {
  verified: 'Verified facts',
  evidence: 'Evidence-backed template',
  imported: 'Imported commentary',
  basic: 'Basic',
}

function VariationCard({ variation }: { variation: LessonVariation }) {
  const fen = positionsAlong(parseMoveOrderSans(variation.line)).at(-1)?.fen
  return (
    <article className="border border-line bg-canvas p-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">{variation.name}</p>
      <p className="mt-2 font-mono text-xs leading-5 text-muted">{variation.line}</p>
      <p className="mt-2 text-sm leading-6 text-muted">{variation.idea}</p>
      {fen ? (
        <div className="mt-3 max-w-[12rem]">
          <MiniBoard fen={fen} />
        </div>
      ) : null}
    </article>
  )
}

function cardTier(card: KnowledgeCard, commentary: MoveCommentary | null): CommentaryConfidence {
  if (commentary?.confidence) return commentary.confidence
  if (card.provenance === 'imported') return 'imported'
  if (card.low_confidence) return 'basic'
  return 'verified'
}

function CommentaryBody({ commentary, fallback }: { commentary: MoveCommentary | null; fallback: string }) {
  if (!commentary) {
    return <p className="mt-3 text-sm leading-6 text-ink">{fallback}</p>
  }
  return (
    <div className="mt-3 grid gap-3">
      {commentary.problem ? (
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
            What problem is this move solving?
          </p>
          <p className="mt-1 text-sm leading-6 text-ink">{commentary.problem}</p>
        </div>
      ) : null}
      {commentary.accomplishes ? (
        <p className="text-sm leading-6 text-ink">{commentary.accomplishes}</p>
      ) : (
        <p className="text-sm leading-6 text-ink">{commentary.why || fallback}</p>
      )}
      {commentary.attacks?.length ? (
        <p className="text-sm leading-6 text-muted">Attacks {commentary.attacks.join(', ')}.</p>
      ) : null}
      {commentary.defends?.length ? (
        <p className="text-sm leading-6 text-muted">Defends {commentary.defends.join(', ')}.</p>
      ) : null}
      {commentary.controls?.length ? (
        <p className="text-sm leading-6 text-muted">
          Contests {commentary.controls.join(', ')}.
        </p>
      ) : null}
      {commentary.enables ? (
        <p className="text-sm leading-6 text-muted">{commentary.enables}</p>
      ) : null}
      {commentary.drawback ? (
        <p className="text-sm leading-6 text-muted">{commentary.drawback}</p>
      ) : null}
      {commentary.if_omitted ? (
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">If omitted</p>
          <p className="mt-1 text-sm leading-6 text-muted">{commentary.if_omitted}</p>
        </div>
      ) : null}
      {commentary.evidence.model_games?.length ? (
        <p className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
          Model games:{' '}
          {commentary.evidence.model_games
            .slice(0, 2)
            .map((game) => `${game.white}–${game.black}${game.year ? ` ${game.year}` : ''}`)
            .join(' · ')}
        </p>
      ) : null}
    </div>
  )
}

export function OpeningLesson({
  card,
  generation,
  onTrain,
  onBack,
  onPauseGeneration,
  onResumeGeneration,
}: {
  card: KnowledgeCard
  generation?: {
    label: string
    done: number
    total: number
    paused: boolean
    error: string | null
  } | null
  onTrain: () => void
  onBack: () => void
  onPauseGeneration?: () => void
  onResumeGeneration?: () => void
}) {
  const sans = useMemo(() => parseMoveOrderSans(card.move_order), [card.move_order])
  const positions = useMemo(() => positionsAlong(sans), [sans])
  const sections = useMemo(() => {
    const rows: LessonSection[] = ['idea', 'line', 'plans', 'after']
    if (card.traps.length) rows.push('traps')
    if (card.quizzes?.length) rows.push('quiz')
    return rows
  }, [card.quizzes, card.traps.length])
  const [section, setSection] = useState<LessonSection>('idea')
  const [ply, setPly] = useState(0)
  const [quizIndex, setQuizIndex] = useState(0)
  const [quizPick, setQuizPick] = useState<number | null>(null)
  const [quizHits, setQuizHits] = useState(0)
  const [deviationIndex, setDeviationIndex] = useState(0)

  const current = positions[Math.min(ply, positions.length - 1)] ?? positions[0]!
  const orientation = card.side === 'b' ? 'black' : 'white'
  const logic =
    current.san && current.ply
      ? matchLogic(card.move_order_logic, current.ply, current.san)
      : null
  const commentary =
    current.san && current.ply
      ? (card.commentaries?.[commentaryKey(current.ply, current.san)] ?? null)
      : null
  const why = commentary?.why ?? logic?.why ?? card.one_line_argument
  const tier = cardTier(card, commentary)
  const quiz = card.quizzes?.[quizIndex]
  const quizDone = Boolean(card.quizzes?.length) && quizIndex >= (card.quizzes?.length ?? 0)
  const hereDeviations = (card.deviations ?? []).filter((row) => row.at_fen === current.fen)
  const deviation = hereDeviations[Math.min(deviationIndex, Math.max(0, hereDeviations.length - 1))]
  const milestones = card.milestones ?? []

  const boardFen =
    section === 'line' ? current.fen : (positions.at(-1)?.fen ?? current.fen)

  return (
    <PlaySplit
      panelWidth="copy"
      boardLabel={
        <>
          {card.side === 'b' ? 'Black' : 'White'} · {card.eco ?? 'Opening'}
        </>
      }
      board={
        <Chessboard
          options={{
            position: boardFen,
            boardOrientation: orientation,
            allowDragging: false,
            ...productBoardStyles,
            boardStyle: { width: '100%', height: '100%' },
          }}
        />
      }
      panel={
        <>
        <Panel padding="md">
          <button
            type="button"
            className="inline-flex min-h-11 items-center font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:text-ink"
            onClick={onBack}
          >
            Back to openings
          </button>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Lesson</p>
          <h2 className="mt-2 font-display text-3xl uppercase leading-[0.92] text-ink [overflow-wrap:anywhere]">
            {card.name}
          </h2>
          <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-accent">
            {TIER_LABEL[tier]}
          </p>
          {generation && generation.label !== 'Ready' ? (
            <div className="mt-3 border border-line bg-canvas px-3 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-ink">
                {generation.label}
                {generation.total > 0 ? ` · ${generation.done}/${generation.total}` : ''}
              </p>
              {generation.error ? (
                <p className="mt-1 text-sm text-blunder-text">{generation.error}</p>
              ) : (
                <p className="mt-1 text-sm text-muted">
                  The starter line is playable now. More replies and plans fill in as this runs.
                </p>
              )}
              {generation.paused ? (
                <Button className="mt-3 w-full" variant="secondary" onClick={onResumeGeneration}>
                  Resume
                </Button>
              ) : (
                <Button className="mt-3 w-full" variant="secondary" onClick={onPauseGeneration}>
                  Pause
                </Button>
              )}
            </div>
          ) : null}
        </Panel>

        <div
          className="flex min-w-0 overflow-x-auto border-b border-line [scrollbar-width:thin]"
          role="tablist"
          aria-label="Lesson sections"
        >
          {sections.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={section === id}
              className={cn(
                segmentItemVariants({ active: section === id }),
                'shrink-0 whitespace-nowrap px-3.5 tracking-[0.04em]',
              )}
              onClick={() => setSection(id)}
            >
              {SECTION_LABEL[id]}
            </button>
          ))}
        </div>

        {section === 'idea' ? (
          <Panel padding="md">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
              Your argument
            </p>
            <p className="mt-2 text-sm leading-6 text-ink">{card.one_line_argument}</p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
              Their argument
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">{card.their_argument}</p>
            <p className="mt-4 text-sm leading-6 text-muted">
              {card.center.type.replaceAll('_', ' ')} center
              {card.center.structure_family ? ` · ${card.center.structure_family.replaceAll('_', ' ')}` : ''}.
            </p>
            <Button className="mt-5 w-full" onClick={() => setSection('line')}>
              Walk the line
            </Button>
          </Panel>
        ) : null}

        {section === 'line' ? (
          <Panel padding="md">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
              {current.ply === 0 ? 'Starting position' : `${current.san} · ply ${current.ply}`}
            </p>
            <CommentaryBody commentary={commentary} fallback={why} />
            {logic?.tags.length ? (
              <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                {logic.tags.join(' · ').replaceAll('_', ' ')}
              </p>
            ) : null}
            {hereDeviations.length ? (
              <div className="mt-4 border border-line bg-canvas px-3 py-3">
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                  If they deviate · {Math.min(deviationIndex, hereDeviations.length - 1) + 1}/
                  {hereDeviations.length}
                </p>
                {deviation ? (
                  <>
                    <p className="mt-2 font-mono text-xs text-ink">{deviation.they_play}</p>
                    <p className="mt-1 text-sm leading-6 text-muted">{deviation.idea}</p>
                    {deviation.your_response ? (
                      <p className="mt-1 text-sm text-ink">Answer with {deviation.your_response}.</p>
                    ) : null}
                  </>
                ) : null}
                {hereDeviations.length > 1 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button
                      variant="secondary"
                      className="w-full"
                      disabled={deviationIndex <= 0}
                      onClick={() => setDeviationIndex((value) => Math.max(0, value - 1))}
                    >
                      Prev reply
                    </Button>
                    <Button
                      className="w-full"
                      disabled={deviationIndex >= hereDeviations.length - 1}
                      onClick={() =>
                        setDeviationIndex((value) => Math.min(hereDeviations.length - 1, value + 1))
                      }
                    >
                      Next reply
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="w-full"
                disabled={ply <= 0}
                onClick={() => {
                  setPly((value) => Math.max(0, value - 1))
                  setDeviationIndex(0)
                }}
              >
                Prev
              </Button>
              <Button
                className="w-full"
                disabled={ply >= positions.length - 1}
                onClick={() => {
                  setPly((value) => Math.min(positions.length - 1, value + 1))
                  setDeviationIndex(0)
                }}
              >
                Next
              </Button>
            </div>
            {ply >= positions.length - 1 ? (
              <Button className="mt-3 w-full" onClick={() => setSection('plans')}>
                Both-side plans
              </Button>
            ) : null}
          </Panel>
        ) : null}

        {section === 'plans' ? (
          <Panel padding="md">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">You want</p>
            <ul className="mt-2 list-disc space-y-2 pl-4 text-sm leading-6 text-ink">
              {card.space_and_targets.my_targets.map((target) => (
                <li key={target}>{target}</li>
              ))}
            </ul>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
              They want
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-4 text-sm leading-6 text-muted">
              {card.space_and_targets.their_targets.map((target) => (
                <li key={target}>{target}</li>
              ))}
            </ul>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
              Breaks
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-4 text-sm leading-6 text-ink">
              {card.breaks.mine.map((item) => (
                <li key={`mine-${item.move}`}>
                  <span className="font-mono">{item.move}</span>
                  {item.precondition ? ` — ${item.precondition}` : ''}
                  {item.why ? ` ${item.why}` : ''}
                </li>
              ))}
            </ul>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
              Theirs
            </p>
            <ul className="mt-2 list-disc space-y-2 pl-4 text-sm leading-6 text-muted">
              {card.breaks.theirs.map((item) => (
                <li key={`theirs-${item.move}`}>
                  <span className="font-mono">{item.move}</span>
                  {item.precondition ? ` — ${item.precondition}` : ''}
                  {item.why ? ` ${item.why}` : ''}
                </li>
              ))}
            </ul>
            {card.variations?.length ? (
              <div className="mt-5 grid gap-3">
                {card.variations.map((variation) => (
                  <VariationCard key={variation.name} variation={variation} />
                ))}
              </div>
            ) : null}
            <Button className="mt-5 w-full" onClick={() => setSection('after')}>
              Middlegame jobs
            </Button>
          </Panel>
        ) : null}

        {section === 'after' ? (
          <Panel padding="md">
            <p className="text-sm leading-6 text-ink">{card.after_the_book?.when ?? card.typical_endgame}</p>
            {milestones.length ? (
              <div className="mt-4 grid gap-3">
                {milestones.map((milestone) => (
                  <article key={`${milestone.ply}-${milestone.title}`} className="border border-line bg-canvas p-4">
                    <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                      {milestone.title}
                    </p>
                    <div className="mt-3 max-w-[10rem]">
                      <MiniBoard fen={milestone.fen} />
                    </div>
                    <ul className="mt-3 list-disc space-y-1 pl-4 text-sm leading-6 text-ink">
                      {milestone.jobs.map((job) => (
                        <li key={job}>{job}</li>
                      ))}
                    </ul>
                    {milestone.model_games?.length ? (
                      <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                        {milestone.model_games
                          .slice(0, 2)
                          .map((game) => `${game.white}–${game.black}`)
                          .join(' · ')}
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                  Your middlegame jobs
                </p>
                <ul className="mt-2 list-disc space-y-2 pl-4 text-sm leading-6 text-ink">
                  {(card.after_the_book?.your_jobs ?? []).map((job) => (
                    <li key={job}>{job}</li>
                  ))}
                </ul>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                  Their jobs
                </p>
                <ul className="mt-2 list-disc space-y-2 pl-4 text-sm leading-6 text-muted">
                  {(card.after_the_book?.their_jobs ?? []).map((job) => (
                    <li key={job}>{job}</li>
                  ))}
                </ul>
              </>
            )}
            {card.after_the_book?.if_they_deviate ? (
              <p className="mt-4 text-sm leading-6 text-muted">{card.after_the_book.if_they_deviate}</p>
            ) : null}
            {card.quizzes?.length ? (
              <Button className="mt-5 w-full" onClick={() => setSection('quiz')}>
                Check you understood
              </Button>
            ) : (
              <Button className="mt-5 w-full" onClick={onTrain}>
                Train the moves
              </Button>
            )}
          </Panel>
        ) : null}

        {section === 'traps' ? (
          <Panel padding="md">
            <ul className="grid gap-3">
              {card.traps.map((trap) => (
                <li key={trap.line} className="border border-line bg-canvas px-5 py-4">
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                    {trap.motif}
                  </p>
                  <p className="mt-2 font-mono text-xs leading-5 text-ink">{trap.line}</p>
                </li>
              ))}
            </ul>
          </Panel>
        ) : null}

        {section === 'quiz' ? (
          <Panel padding="md">
            {quizDone || !quiz ? (
              <div>
                <p className="text-sm text-ink">
                  {quizHits}/{card.quizzes?.length ?? 0} correct. Next, drill the moves — then the
                  middlegame jobs stay the same.
                </p>
                <Button className="mt-5 w-full" onClick={onTrain}>
                  Train the moves
                </Button>
              </div>
            ) : (
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                  {quizIndex + 1} / {card.quizzes?.length}
                </p>
                <p className="mt-3 text-sm text-ink">{quiz.prompt}</p>
                <div className="mt-3 flex flex-col gap-2">
                  {quiz.choices.map((choice, index) => {
                    const picked = quizPick === index
                    const correct = quiz.answer === index
                    const show = quizPick != null
                    return (
                      <button
                        key={choice}
                        type="button"
                        disabled={quizPick != null}
                        onClick={() => {
                          setQuizPick(index)
                          if (index === quiz.answer) setQuizHits((value) => value + 1)
                        }}
                        className={`min-h-11 border px-3 text-left text-sm ${
                          show && correct
                            ? 'border-fine text-ink'
                            : show && picked
                              ? 'border-blunder text-blunder-text'
                              : 'border-line text-ink hover:bg-surface-2'
                        }`}
                      >
                        {choice}
                      </button>
                    )
                  })}
                </div>
                {quizPick != null ? (
                  <div className="mt-4">
                    <p className="text-sm text-muted">{quiz.why}</p>
                    <Button
                      className="mt-4 w-full"
                      onClick={() => {
                        setQuizPick(null)
                        setQuizIndex((value) => value + 1)
                      }}
                    >
                      {quizIndex + 1 >= (card.quizzes?.length ?? 0) ? 'See result' : 'Next'}
                    </Button>
                  </div>
                ) : null}
              </div>
            )}
          </Panel>
        ) : null}

        {section !== 'quiz' || !quizDone ? (
          <Button variant="secondary" className="w-full" onClick={onTrain}>
            Skip to move drill
          </Button>
        ) : null}
        </>
      }
    />
  )
}
