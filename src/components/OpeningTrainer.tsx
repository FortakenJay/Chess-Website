import { useState } from 'react'
import { Chess } from 'chess.js'
import { Chessboard } from 'react-chessboard'
import { PlaySplit } from '@/components/FittedBoardFrame'
import { EndgameConvert } from '@/components/EndgameConvert'
import { OpeningChooser } from '@/components/OpeningChooser'
import { OpeningLesson } from '@/components/OpeningLesson'
import { PawnStructureLab } from '@/components/PawnStructureLab'
import {
  ActionRow,
  Button,
  ButtonLink,
  Callout,
  EmptyState,
  ErrorText,
  Kicker,
  Panel,
  SegmentedControl,
} from '@/components/ui'
import { productBoardStyles } from '@/lib/boardTheme'
import { legalMoveStyles, nextSelectedSquare } from '@/lib/legalMoves'
import type { SessionStartMode } from '@/lib/openings/session'
import { REASON_TAG_LABEL } from '@/lib/openings/tags'
import { humanOpeningLabel } from '@/lib/openings/nicknames'
import { usePlayerData } from '@/lib/queries'
import { ROADMAP_TRACKS, roadmapNodeById } from '@/lib/roadmap/topics'
import { convertibleStudy } from '@/lib/roadmap/study'
import { useSessionTitle } from '@/lib/useDocumentTitle'
import type { useOpeningTrainer } from '@/lib/openings/useOpeningTrainer'

export type TrainerTab = 'theory' | 'learn' | 'foundations' | 'endgames' | 'structures'

const TRAINER_TABS: Array<{ value: TrainerTab; label: string }> = [
  { value: 'theory', label: 'Theory' },
  { value: 'learn', label: 'Learn' },
  { value: 'foundations', label: 'Foundations' },
  { value: 'endgames', label: 'Endgames' },
  { value: 'structures', label: 'Structures' },
]

export function parseTrainerTab(tab?: string): TrainerTab {
  if (tab === 'learn' || tab === 'foundations' || tab === 'endgames' || tab === 'structures') return tab
  return 'theory'
}

function FoundationsPanel({ username }: { username: string }) {
  const tracks = ROADMAP_TRACKS.filter((track) => track.id !== 'endgames')
  return (
    <div className="pb-4">
      <Callout>
        <Kicker tone="accent">Foundations</Kicker>
        <h2 className="mt-3 max-w-[16ch] font-display text-4xl uppercase leading-[0.92] text-ink sm:text-5xl">
          Principles before lines
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
          Tactics, named openings, and structures. Playing a game does not mark a node done — you
          do. This is the same roadmap, not a second curriculum.
        </p>
        <ButtonLink className="mt-6 w-full sm:w-auto" to="/roadmap/$username" params={{ username }}>
          Open the roadmap
        </ButtonLink>
      </Callout>
      <ul className="mt-5 divide-y divide-line border border-line">
        {tracks.map((track) => (
          <li key={track.id} className="px-4 py-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              {track.kicker}
            </p>
            <p className="mt-1 font-medium text-ink">{track.name}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
              {track.nodes.length} topics
            </p>
          </li>
        ))}
      </ul>
    </div>
  )
}

function EndgamesPanel({
  username,
  studyId,
  onStudyChange,
}: {
  username: string
  studyId?: string
  onStudyChange?: (study?: string) => void
}) {
  const player = usePlayerData(username)
  const leaked = (player.data?.positions ?? []).filter((row) => row.phase === 'endgame')
  const track = ROADMAP_TRACKS.find((row) => row.id === 'endgames')
  const converting = studyId ? convertibleStudy(studyId) : null
  const convertingTitle = studyId ? (roadmapNodeById(studyId)?.title ?? converting?.task) : null

  if (converting) {
    return (
      <EndgameConvert
        fen={converting.fen}
        title={convertingTitle ?? converting.task}
        onExit={() => onStudyChange?.(undefined)}
      />
    )
  }

  return (
    <div className="pb-4">
      <Callout>
        <Kicker tone="accent">Endgames</Kicker>
        <h2 className="mt-3 max-w-[16ch] font-display text-4xl uppercase leading-[0.92] text-ink sm:text-5xl">
          Convert what you leak
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
          Your flagged endings first. Then convert the technique positions against a club-strength
          engine (depth 10 — not library analysis). Playing a game still does not mark a node done.
        </p>
        <ActionRow className="mt-6">
          <ButtonLink
            to="/drill/$username"
            params={{ username }}
            search={{ phase: 'endgame', order: 'worst' }}
          >
            Drill these ({leaked.length})
          </ButtonLink>
          <ButtonLink
            variant="secondary"
            to="/results/$username/endgames"
            params={{ username }}
          >
            Results
          </ButtonLink>
        </ActionRow>
      </Callout>
      {track ? (
        <ul className="mt-5 divide-y divide-line border border-line">
          {track.nodes.map((node) => {
            const playable = convertibleStudy(node.id)
            return (
              <li key={node.id} className="px-4 py-3">
                <p className="font-medium text-ink">{node.title}</p>
                <p className="mt-1 text-sm leading-5 text-muted">{node.why}</p>
                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                  {playable ? (
                    <Button className="w-full sm:w-auto" onClick={() => onStudyChange?.(node.id)}>
                      Convert vs engine
                    </Button>
                  ) : null}
                  <ButtonLink
                    variant={playable ? 'secondary' : 'primary'}
                    className="w-full sm:w-auto"
                    to="/roadmap/$username"
                    params={{ username }}
                    search={{ node: node.id }}
                  >
                    Open the topic
                  </ButtonLink>
                </div>
              </li>
            )
          })}
        </ul>
      ) : null}
    </div>
  )
}

function TrainerStudio({
  username,
  trainer,
  onStart,
  tab,
  structure,
  study,
  onTabChange,
  onStudyChange,
}: {
  username: string
  trainer: ReturnType<typeof useOpeningTrainer>
  onStart: (openingId: string, mode: SessionStartMode) => void
  tab?: string
  structure?: string
  study?: string
  onTabChange?: (tab: TrainerTab) => void
  onStudyChange?: (study?: string) => void
}) {
  const module = parseTrainerTab(tab)
  const converting = module === 'endgames' && Boolean(study)
  useSessionTitle({
    page:
      converting
        ? 'Convert'
        : module === 'learn'
          ? 'Learn'
          : module === 'foundations'
            ? 'Foundations'
            : module === 'endgames'
              ? 'Endgames'
              : module === 'structures'
                ? 'Structures'
                : 'Theory',
    library: username,
    enabled: true,
  })
  return (
    <div className={converting ? 'lg:min-h-0 lg:h-full lg:overflow-hidden' : undefined}>
      {converting ? null : (
        <SegmentedControl
          label="Trainer module"
          value={module}
          onChange={(next) => onTabChange?.(next)}
          className="mt-0 sm:mt-0"
          options={TRAINER_TABS}
        />
      )}
      <div className={converting ? 'h-full min-h-0' : 'mt-5'}>
        {module === 'theory' || module === 'learn' ? (
          <OpeningChooser
            track={module}
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
        ) : null}
        {module === 'foundations' ? <FoundationsPanel username={username} /> : null}
        {module === 'endgames' ? (
          <EndgamesPanel username={username} studyId={study} onStudyChange={onStudyChange} />
        ) : null}
        {module === 'structures' ? <PawnStructureLab username={username} initialId={structure} /> : null}
      </div>
    </div>
  )
}

export function OpeningTrainer({
  trainer,
  username,
  tab,
  structure,
  study,
  onTabChange,
  onStudyChange,
}: {
  trainer: ReturnType<typeof useOpeningTrainer>
  username: string
  tab?: string
  structure?: string
  study?: string
  onTabChange?: (tab: TrainerTab) => void
  onStudyChange?: (study?: string) => void
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
        study={study}
        onTabChange={onTabChange}
        onStudyChange={onStudyChange}
        onStart={(openingId, mode) => {
          resetItemState()
          if (mode === 'foundations' || mode === 'master') trainer.startLesson(openingId, mode)
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
        trainLabel={trainer.selectedMode === 'master' ? 'Master from memory' : 'Train the moves'}
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
