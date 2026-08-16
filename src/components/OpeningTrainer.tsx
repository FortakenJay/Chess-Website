import { useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { PlaySplit } from '@/components/FittedBoardFrame'
import { OpeningChooser } from '@/components/OpeningChooser'
import { OpeningLesson } from '@/components/OpeningLesson'
import { PawnStructureLab } from '@/components/PawnStructureLab'
import {
  Button,
  ButtonLink,
  EmptyState,
  ErrorText,
  Panel,
  SegmentedControl,
} from '@/components/ui'
import { productBoardStyles } from '@/lib/boardTheme'
import { legalMoveStyles, nextSelectedSquare } from '@/lib/legalMoves'
import { REASON_TAG_LABEL } from '@/lib/openings/tags'
import { humanOpeningLabel } from '@/lib/openings/nicknames'
import { useSessionTitle } from '@/lib/useDocumentTitle'
import type { useOpeningTrainer } from '@/lib/openings/useOpeningTrainer'

type TrainerModule = 'openings' | 'structures'

function TrainerStudio({
  username,
  trainer,
  onStart,
  tab,
  structure,
}: {
  username: string
  trainer: ReturnType<typeof useOpeningTrainer>
  onStart: (openingId: string, mode: 'weakest' | 'foundations') => void
  tab?: 'openings' | 'structures'
  structure?: string
}) {
  const [module, setModule] = useState<TrainerModule>(tab === 'structures' ? 'structures' : 'openings')
  useSessionTitle({
    page: 'Trainer',
    library: username,
    enabled: module === 'openings',
  })
  return (
    <div>
      <SegmentedControl
        label="Trainer module"
        value={module}
        onChange={setModule}
        className="mt-0 sm:mt-0"
        options={[
          { value: 'openings', label: 'Openings' },
          { value: 'structures', label: 'Structures' },
        ]}
      />
      {module === 'openings' ? (
        <div className="mt-5">
          <OpeningChooser
            known={trainer.knownOpenings}
            catalog={trainer.openingOptions}
            downloading={trainer.downloading}
            downloadingKey={trainer.downloadingKey}
            downloadError={trainer.downloadError}
            onStart={onStart}
            onDownload={(hit, side) => void trainer.downloadOpening(hit, side)}
            onImportPgn={(pgn, side) => void trainer.importOpeningPgn(pgn, side)}
            onImportStudy={(url, side) => void trainer.importLichessStudy(url, side)}
          />
        </div>
      ) : (
        <div className="mt-5">
          <PawnStructureLab username={username} initialId={structure} />
        </div>
      )}
    </div>
  )
}

export function OpeningTrainer({
  trainer,
  username,
  tab,
  structure,
}: {
  trainer: ReturnType<typeof useOpeningTrainer>
  username: string
  tab?: 'openings' | 'structures'
  structure?: string
}) {
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null)
  const [playedFen, setPlayedFen] = useState<string | null>(null)
  const [recallPass, setRecallPass] = useState<boolean | null>(null)
  const [reasonPick, setReasonPick] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const nick = humanOpeningLabel(trainer.openingName).title
  const training =
    trainer.phase === 'lesson' ||
    trainer.phase === 'recall' ||
    trainer.phase === 'reason' ||
    trainer.phase === 'done'
  useSessionTitle({
    library: username,
    enabled: training,
    activity: trainer.phase === 'select' || trainer.phase === 'loading' ? undefined : nick,
    page:
      trainer.phase === 'lesson'
        ? 'Lesson'
        : trainer.phase === 'recall' && trainer.total
          ? `${trainer.index + 1}/${trainer.total}`
          : trainer.phase === 'reason'
            ? 'Why'
            : trainer.phase === 'done' && trainer.total
              ? 'Done'
              : 'Trainer',
  })

  const item = trainer.item
  const fen = playedFen ?? item?.parentFen ?? ''
  const orientation = fen.split(' ')[1] === 'b' ? 'black' : 'white'
  const locked = recallPass != null || trainer.phase !== 'recall' || busy

  function resetItemState() {
    setSelectedSquare(null)
    setPlayedFen(null)
    setRecallPass(null)
    setReasonPick(null)
  }

  function playMove(from: string, to: string | null) {
    if (!item || locked || !to) return false
    const board = new Chess(item.parentFen)
    const attempt = board.move({ from, to, promotion: 'q' })
    if (!attempt) return false
    const pass = attempt.san === item.node.san
    const shown = new Chess(item.parentFen)
    shown.move(item.node.san)
    setSelectedSquare(null)
    setPlayedFen(shown.fen())
    setRecallPass(pass)
    setBusy(true)
    void trainer.gradeRecall(pass).finally(() => setBusy(false))
    return true
  }

  function onSquareClick(square: string) {
    if (locked || !item) return
    const next = nextSelectedSquare(item.parentFen, selectedSquare, square)
    if (next.action === 'select') {
      setSelectedSquare(next.square)
      return
    }
    playMove(next.from, next.to)
  }

  function onReason(tag: string) {
    if (!item || reasonPick || trainer.phase !== 'reason' || busy) return
    const pass = tag === trainer.trueTag
    setReasonPick(tag)
    setBusy(true)
    void trainer.gradeReason(pass).finally(() => {
      setBusy(false)
    })
  }

  function continueNext() {
    resetItemState()
    if (trainer.phase === 'reason') return
    trainer.advance()
  }

  if (trainer.phase === 'loading') {
    return <p className="font-mono text-sm text-muted">Loading repertoire…</p>
  }
  if (trainer.error) return <ErrorText>{trainer.error}</ErrorText>
  if (trainer.phase === 'select') {
    return (
      <TrainerStudio
        username={username}
        trainer={trainer}
        tab={tab}
        structure={structure}
        onStart={(openingId, mode) => {
          resetItemState()
          if (mode === 'foundations') trainer.startLesson(openingId, mode)
          else trainer.startSession(openingId, mode)
        }}
      />
    )
  }
  if (trainer.phase === 'lesson' && trainer.knowledgeCard) {
    return (
      <OpeningLesson
        card={trainer.knowledgeCard}
        generation={trainer.generation}
        onPauseGeneration={trainer.pauseGeneration}
        onResumeGeneration={trainer.resumeGeneration}
        onBack={() => {
          resetItemState()
          trainer.chooseOpening()
        }}
        onTrain={() => {
          resetItemState()
          trainer.beginDrill()
        }}
      />
    )
  }
  if (trainer.phase === 'done' || !item) {
    return (
      <EmptyState>
        <p className="text-ink">
          {trainer.total ? 'Session complete' : 'No annotated lines yet'}
        </p>
        <p className="mt-2">
          {trainer.total
            ? `Recall ${trainer.score.recall}/${trainer.score.recallTotal}. Understanding ${trainer.score.reason}/${trainer.score.reasonTotal}. Scheduling uses the weaker of the two.`
            : 'Search an opening to download a line, or seed the hand-written cards (npm run openings:seed).'}
        </p>
        {trainer.total && trainer.knowledgeCard?.after_the_book ? (
          <div className="mt-4 border border-line bg-canvas px-4 py-4 text-left">
            <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
              The book is over
            </p>
            <p className="mt-2 text-sm leading-6 text-ink">
              {trainer.knowledgeCard.after_the_book.when}
            </p>
            <ul className="mt-3 list-disc space-y-2 pl-4 text-sm leading-6 text-muted">
              {trainer.knowledgeCard.after_the_book.your_jobs.slice(0, 3).map((job) => (
                <li key={job}>{job}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          {trainer.total ? (
            <>
              <Button onClick={trainer.repeatSession}>Drill this opening again</Button>
              {trainer.knowledgeCard ? (
                <Button variant="secondary" onClick={trainer.reviewLesson}>
                  Review the middlegame plan
                </Button>
              ) : null}
              {trainer.structureLabId ? (
                <ButtonLink
                  variant="secondary"
                  to="/trainer/$username"
                  params={{ username }}
                  search={{ tab: 'structures', structure: trainer.structureLabId }}
                >
                  Open the structure lab
                </ButtonLink>
              ) : null}
              <Button variant="secondary" onClick={trainer.chooseOpening}>
                Choose another opening
              </Button>
            </>
          ) : (
            <Button onClick={() => void trainer.reload()}>Reload openings</Button>
          )}
        </div>
      </EmptyState>
    )
  }

  const squareStyles =
    locked || trainer.phase !== 'recall' ? {} : legalMoveStyles(item.parentFen, selectedSquare)

  return (
    <PlaySplit
      boardLabel={<>{orientation === 'black' ? 'Black' : 'White'} to move</>}
      board={
        <Chessboard
          options={{
            position: fen,
            boardOrientation: orientation,
            allowDragging: !locked,
            onPieceDrag: ({ square }) => {
              if (square && !locked) setSelectedSquare(square)
            },
            onPieceDrop: ({ sourceSquare, targetSquare }) => playMove(sourceSquare, targetSquare),
            onSquareClick: ({ square }) => onSquareClick(square),
            squareStyles,
            ...productBoardStyles,
            boardStyle: { width: '100%', height: '100%' },
          }}
        />
      }
      panel={
        <>
        <Panel padding="md">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
            {trainer.index + 1} / {trainer.total}
          </p>
          <h2 className="mt-2 text-lg font-medium tracking-tight">{trainer.openingName}</h2>
          <p className="mt-1 font-mono text-xs text-muted">
            Recall {trainer.score.recall}/{trainer.score.recallTotal} · Understanding{' '}
            {trainer.score.reason}/{trainer.score.reasonTotal}
          </p>
          <Button
            variant="ghost"
            className="mt-3 w-full"
            onClick={() => {
              resetItemState()
              trainer.chooseOpening()
            }}
          >
            Change opening
          </Button>
        </Panel>

        <Panel padding="md">
          {trainer.phase === 'recall' && recallPass == null ? (
            <p className="text-sm text-ink">Play your repertoire move.</p>
          ) : null}

          {recallPass != null ? (
            <div>
              <p className={recallPass ? 'text-sm text-ink' : 'text-sm text-blunder-text'}>
                {recallPass ? 'That is the repertoire move.' : `The repertoire move is ${item.node.san}.`}
              </p>
              {trainer.phase === 'recall' ? (
                <Button className="mt-4 w-full sm:w-auto" onClick={continueNext} disabled={busy}>
                  Continue
                </Button>
              ) : null}
            </div>
          ) : null}

          {trainer.phase === 'reason' ? (
            <div>
              <p className="text-sm text-ink">Why is {item.node.san} the move?</p>
              <div className="mt-3 flex flex-col gap-2">
                {trainer.choices.map((tag) => {
                  const picked = reasonPick === tag
                  const correct = trainer.trueTag === tag
                  const show = reasonPick != null
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={reasonPick != null || busy}
                      onClick={() => onReason(tag)}
                      className={`min-h-11 border px-3 text-left text-sm ${
                        show && correct
                          ? 'border-fine text-ink'
                          : show && picked
                            ? 'border-blunder text-blunder-text'
                            : 'border-line text-ink hover:bg-surface-2'
                      }`}
                    >
                      {REASON_TAG_LABEL[tag]}
                    </button>
                  )
                })}
              </div>
              {reasonPick != null ? (
                <div className="mt-4">
                  <p className="text-sm text-muted">{item.node.reason_text}</p>
                  <Button
                    className="mt-4 w-full sm:w-auto"
                    onClick={() => {
                      resetItemState()
                      trainer.advance()
                    }}
                  >
                    Next
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </Panel>
        </>
      }
    />
  )
}
