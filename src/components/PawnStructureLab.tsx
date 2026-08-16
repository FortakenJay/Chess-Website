import { useEffect, useMemo, useState } from 'react'
import { MiniBoard } from '@/components/MiniBoard'
import { Button, Panel } from '@/components/ui'
import { usePlayerData } from '@/lib/queries'
import {
  PAWN_STRUCTURES,
  drillsFor,
  isStructureId,
  structureById,
  structureDisplayFen,
  structureLeaks,
  type StructureBreakDrill,
  type StructureId,
} from '@/lib/openings/structures'

type LabMode = 'lesson' | 'drill'

const LESSON_SECTIONS = [
  ['attackDirection', 'Attack direction'],
  ['weaknesses', 'Static weaknesses'],
  ['pieces', 'Which pieces are good'],
  ['breaks', 'Pawn breaks and timing'],
  ['endgame', 'Where the endgame goes'],
] as const

function scoreLabel(wins: number, draws: number, games: number) {
  if (!games) return '—'
  const points = wins + draws * 0.5
  return `${Math.round((points / games) * 100)}%`
}

function StructureDrill({
  drills,
  onExit,
}: {
  drills: StructureBreakDrill[]
  onExit: () => void
}) {
  const [index, setIndex] = useState(0)
  const [breakPick, setBreakPick] = useState<string | null>(null)
  const [momentPick, setMomentPick] = useState<boolean | null>(null)
  const [score, setScore] = useState({ breakHits: 0, momentHits: 0, total: 0 })
  const drill = drills[index]
  if (!drill) {
    return (
      <Panel>
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent">Break drill</p>
        <h2 className="mt-3 font-display text-3xl uppercase leading-none text-ink">Session done</h2>
        <p className="mt-4 text-sm text-muted">
          Break {score.breakHits}/{score.total}. Moment {score.momentHits}/{score.total}. Two
          answers per position — the break, then whether it is time.
        </p>
        <Button className="mt-5 w-full sm:w-auto" onClick={onExit}>
          Back to the structure
        </Button>
      </Panel>
    )
  }

  const breakDone = breakPick != null
  const momentDone = momentPick != null
  const breakCorrect = breakPick === drill.correctBreak
  const momentCorrect = momentPick === drill.momentReady

  function gradeMoment(ready: boolean) {
    if (momentPick != null) return
    setMomentPick(ready)
    setScore((current) => ({
      breakHits: current.breakHits + (breakPick === drill.correctBreak ? 1 : 0),
      momentHits: current.momentHits + (ready === drill.momentReady ? 1 : 0),
      total: current.total + 1,
    }))
  }

  function next() {
    setIndex((value) => value + 1)
    setBreakPick(null)
    setMomentPick(null)
  }

  return (
    <div className="pb-4">
      <button
        type="button"
        className="inline-flex min-h-11 items-center font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:text-ink"
        onClick={onExit}
      >
        Back to the lesson
      </button>
      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <MiniBoard fen={drill.fen} />
        <Panel>
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
            {index + 1} / {drills.length} · Break, then timing
          </p>
          <h2 className="mt-3 font-display text-2xl uppercase leading-none text-ink sm:text-3xl">
            {drill.prompt}
          </h2>

          <div className="mt-5 flex flex-col gap-2">
            {drill.breakChoices.map((choice) => {
              const picked = breakPick === choice
              const correct = choice === drill.correctBreak
              return (
                <button
                  key={choice}
                  type="button"
                  disabled={breakDone}
                  onClick={() => setBreakPick(choice)}
                  className={`min-h-11 border px-3 text-left text-sm ${
                    breakDone && correct
                      ? 'border-fine text-ink'
                      : breakDone && picked
                        ? 'border-blunder text-blunder-text'
                        : 'border-line text-ink hover:bg-surface-2'
                  }`}
                >
                  {choice}
                </button>
              )
            })}
          </div>

          {breakDone ? (
            <div className="mt-6">
              <p className="text-sm text-ink">Is it the right moment?</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {[
                  { value: true, label: 'Ready now' },
                  { value: false, label: 'Not yet' },
                ].map((option) => {
                  const picked = momentPick === option.value
                  const correct = option.value === drill.momentReady
                  return (
                    <button
                      key={option.label}
                      type="button"
                      disabled={momentDone}
                      onClick={() => gradeMoment(option.value)}
                      className={`min-h-11 border px-3 text-sm ${
                        momentDone && correct
                          ? 'border-fine text-ink'
                          : momentDone && picked
                            ? 'border-blunder text-blunder-text'
                            : 'border-line text-ink hover:bg-surface-2'
                      }`}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}

          {momentDone ? (
            <div className="mt-5">
              <p className="text-sm text-muted">{drill.momentWhy}</p>
              <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                Break {breakCorrect ? 'right' : 'wrong'} · Moment {momentCorrect ? 'right' : 'wrong'}
              </p>
              <Button className="mt-4 w-full sm:w-auto" onClick={next}>
                {index + 1 >= drills.length ? 'Finish' : 'Next position'}
              </Button>
            </div>
          ) : null}
        </Panel>
      </div>
    </div>
  )
}

export function PawnStructureLab({
  username,
  initialId,
}: {
  username: string
  initialId?: string
}) {
  const start = initialId && isStructureId(initialId) ? initialId : 'carlsbad'
  const player = usePlayerData(username)
  const [selectedId, setSelectedId] = useState<StructureId>(start)
  const [mode, setMode] = useState<LabMode>('lesson')
  useEffect(() => {
    if (initialId && isStructureId(initialId)) setSelectedId(initialId)
  }, [initialId])
  const structure = structureById(selectedId)
  const fen = structureDisplayFen(structure)
  const highlights = [...structure.must.w, ...structure.must.b]
  const leaks = useMemo(
    () => structureLeaks(player.data?.games ?? [], player.data?.positions ?? []),
    [player.data],
  )
  const selectedLeak = leaks.find((row) => row.id === selectedId)
  const drills = drillsFor(selectedId)

  if (mode === 'drill') {
    return <StructureDrill drills={drills} onExit={() => setMode('lesson')} />
  }

  return (
    <div className="pb-4">
      <div className="border border-line border-l-4 border-l-accent bg-surface p-5 sm:p-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent">
          Pawn structures
        </p>
        <h2 className="mt-3 max-w-[16ch] font-display text-4xl uppercase leading-[0.92] text-ink sm:text-5xl">
          Plans live in the pawns.
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
          Strip the pieces and the skeleton is a hashable key. Named structures come with plans for
          both sides, a legal break, and a transposition if that break lands.
        </p>
      </div>

      {leaks.length > 0 ? (
        <section className="mt-5">
          <div className="border-b border-line pb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">Your leaks</p>
            <h2 className="mt-1 font-display text-2xl uppercase leading-none text-ink">
              Error rate by structure
            </h2>
          </div>
          <ul className="mt-4 divide-y divide-line border border-line">
            {leaks.slice(0, 6).map((row) => (
              <li key={row.id}>
                <button
                  type="button"
                  className="flex min-h-14 w-full flex-col gap-1 px-4 py-3 text-left hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
                  onClick={() => setSelectedId(row.id)}
                >
                  <span className="font-medium text-ink">{row.name}</span>
                  <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
                    {row.games ? `${scoreLabel(row.wins, row.draws, row.games)} of ${row.games}` : '—'}{' '}
                    · {row.leaks} leak{row.leaks === 1 ? '' : 's'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <div className="mt-5 flex gap-0 overflow-x-auto border-b border-line [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {PAWN_STRUCTURES.map((row) => (
          <button
            key={row.id}
            type="button"
            className={`inline-flex min-h-11 shrink-0 items-center border-b-2 px-3 font-mono text-[11px] uppercase tracking-[0.06em] ${
              row.id === selectedId
                ? 'border-accent bg-surface-2 text-ink'
                : 'border-transparent text-muted hover:border-line hover:text-ink'
            }`}
            onClick={() => setSelectedId(row.id)}
          >
            {row.name}
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div>
          <MiniBoard fen={fen} highlights={highlights} pawnsOnly />
          <p className="mt-2 font-mono text-[10px] leading-4 text-muted">
            Pieces stripped. Matching uses the pawn-only skeleton, so a- and h-pawn noise still
            counts as the same structure.
          </p>
        </div>
        <Panel>
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent">Plan library</p>
          <h3 className="mt-2 font-display text-3xl uppercase leading-none text-ink">{structure.name}</h3>
          {selectedLeak ? (
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
              {selectedLeak.games
                ? `${scoreLabel(selectedLeak.wins, selectedLeak.draws, selectedLeak.games)} in ${selectedLeak.games} games`
                : 'No tagged games yet'}
              {' · '}
              {selectedLeak.leaks} leak position{selectedLeak.leaks === 1 ? '' : 's'}
            </p>
          ) : null}
          <dl className="mt-4 grid gap-4">
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">White</dt>
              <dd className="mt-2 text-sm leading-6 text-muted">{structure.lesson.whitePlan}</dd>
            </div>
            <div>
              <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">Black</dt>
              <dd className="mt-2 text-sm leading-6 text-muted">{structure.lesson.blackPlan}</dd>
            </div>
          </dl>
          <Button className="mt-5 w-full sm:w-auto" onClick={() => setMode('drill')}>
            Drill the breaks
          </Button>
        </Panel>
      </div>

      <div className="mt-5 grid gap-3">
        {LESSON_SECTIONS.map(([key, title]) => (
          <section key={key} className="border border-line bg-surface px-4 py-4 sm:px-5">
            <h3 className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-muted">{structure.lesson[key]}</p>
          </section>
        ))}
      </div>

      {structure.edges.length > 0 ? (
        <section className="mt-5">
          <div className="border-b border-line pb-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              Transpositions
            </p>
            <h2 className="mt-1 font-display text-2xl uppercase leading-none text-ink">
              This structure + a break
            </h2>
          </div>
          <ul className="mt-4 divide-y divide-line border border-line">
            {structure.edges.map((edge) => {
              const target = structureById(edge.to)
              return (
                <li key={`${edge.via}-${edge.to}`}>
                  <button
                    type="button"
                    className="flex min-h-14 w-full flex-col gap-1 px-4 py-3 text-left hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
                    onClick={() => setSelectedId(edge.to)}
                  >
                    <span className="text-sm text-ink">
                      {structure.name} + {edge.via}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                      → {target.name}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
