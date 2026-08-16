import { useMemo, useState } from 'react'
import { Chessboard } from 'react-chessboard'
import { FittedBoardFrame } from '@/components/FittedBoardFrame'
import { MiniBoard } from '@/components/MiniBoard'
import { Button, Panel, segmentItemVariants } from '@/components/ui'
import { productBoardStyles } from '@/lib/boardTheme'
import { cn } from '@/lib/cn'
import { matchLogic, parseMoveOrderSans, positionsAlong } from '@/lib/openings/tree'
import type { KnowledgeCard, LessonVariation } from '@/lib/openings/types'

type LessonSection = 'idea' | 'line' | 'plans' | 'after' | 'traps' | 'quiz'

const SECTION_LABEL: Record<LessonSection, string> = {
  idea: 'The idea',
  line: 'The line',
  plans: 'Both sides',
  after: 'After the book',
  traps: 'Traps',
  quiz: 'Check',
}

function VariationCard({ variation }: { variation: LessonVariation }) {
  const fen = positionsAlong(parseMoveOrderSans(variation.line)).at(-1)?.fen
  return (
    <article className="border border-line bg-canvas p-4">
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

export function OpeningLesson({
  card,
  onTrain,
  onBack,
}: {
  card: KnowledgeCard
  onTrain: () => void
  onBack: () => void
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

  const current = positions[Math.min(ply, positions.length - 1)] ?? positions[0]!
  const orientation = card.side === 'b' ? 'black' : 'white'
  const why =
    current.san && current.ply
      ? matchLogic(card.move_order_logic, current.ply, current.san)?.why
      : card.one_line_argument
  const quiz = card.quizzes?.[quizIndex]
  const quizDone = Boolean(card.quizzes?.length) && quizIndex >= (card.quizzes?.length ?? 0)

  const boardFen =
    section === 'line' ? current.fen : (positions.at(-1)?.fen ?? current.fen)

  return (
    <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,24rem)]">
      <div className="flex min-h-0 min-w-0 flex-col border border-line bg-surface">
        <div className="shrink-0 border-b border-line px-3 py-2 font-mono text-sm">
          {card.side === 'b' ? 'Black' : 'White'} · {card.eco ?? 'Opening'}
        </div>
        <FittedBoardFrame>
          <Chessboard
            options={{
              position: boardFen,
              boardOrientation: orientation,
              allowDragging: false,
              ...productBoardStyles,
              boardStyle: { width: '100%', height: '100%' },
            }}
          />
        </FittedBoardFrame>
      </div>

      <aside className="flex min-h-0 flex-col gap-3 overflow-y-auto pb-4">
        <Panel>
          <button
            type="button"
            className="inline-flex min-h-11 items-center font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:text-ink"
            onClick={onBack}
          >
            Back to openings
          </button>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Lesson</p>
          <h2 className="mt-2 font-display text-3xl uppercase leading-none text-ink">{card.name}</h2>
          {card.low_confidence ? (
            <p className="mt-3 text-sm leading-6 text-muted">
              Move reasons come from the moves themselves. The middlegame jobs come from the
              structure family — not a coach’s notes.
            </p>
          ) : null}
        </Panel>

        <div
          className="flex overflow-x-auto border-b border-line"
          role="tablist"
          aria-label="Lesson sections"
        >
          {sections.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={section === id}
              className={cn(segmentItemVariants({ active: section === id }), 'shrink-0')}
              onClick={() => setSection(id)}
            >
              {SECTION_LABEL[id]}
            </button>
          ))}
        </div>

        {section === 'idea' ? (
          <Panel>
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
          <Panel>
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
              {current.ply === 0 ? 'Starting position' : `${current.san} · ply ${current.ply}`}
            </p>
            <p className="mt-3 text-sm leading-6 text-ink">{why}</p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                className="w-full"
                disabled={ply <= 0}
                onClick={() => setPly((value) => Math.max(0, value - 1))}
              >
                Prev
              </Button>
              <Button
                className="w-full"
                disabled={ply >= positions.length - 1}
                onClick={() => setPly((value) => Math.min(positions.length - 1, value + 1))}
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
          <Panel>
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
            <p className="mt-2 text-sm leading-6 text-ink">
              Yours:{' '}
              {card.breaks.mine.map((item) => item.move).join(', ')}
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Theirs:{' '}
              {card.breaks.theirs.map((item) => item.move).join(', ')}
            </p>
            {card.variations?.length ? (
              <div className="mt-5 grid gap-3">
                {card.variations.map((variation) => (
                  <VariationCard key={variation.name} variation={variation} />
                ))}
              </div>
            ) : null}
            <Button className="mt-5 w-full" onClick={() => setSection('after')}>
              When theory ends
            </Button>
          </Panel>
        ) : null}

        {section === 'after' ? (
          <Panel>
            <p className="text-sm leading-6 text-ink">{card.after_the_book?.when ?? card.typical_endgame}</p>
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
          <Panel>
            <ul className="grid gap-3">
              {card.traps.map((trap) => (
                <li key={trap.line} className="border border-line bg-canvas px-4 py-3">
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
          <Panel>
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
      </aside>
    </div>
  )
}
