import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { MiniBoard } from '@/components/MiniBoard'
import { Button, ButtonLink } from '@/components/ui'
import { usePlayerData } from '@/lib/queries'
import {
  exposureLabel,
  nodeIsComplete,
  readRoadmapMarks,
  roadmapExposure,
  toggleCompleted,
  writeRoadmapMarks,
  type NodeExposure,
  type RoadmapMarks,
} from '@/lib/roadmap/progress'
import { studyDrillSearch, studyFor, type RoadmapStudy } from '@/lib/roadmap/study'
import {
  ROADMAP_TRACKS,
  allRoadmapNodes,
  roadmapNodeById,
  type RoadmapHref,
  type RoadmapNode,
} from '@/lib/roadmap/topics'

function PracticeLink({
  username,
  href,
  children,
  variant,
}: {
  username: string
  href: RoadmapHref
  children: string
  variant?: 'primary' | 'secondary'
}) {
  const params = { username }
  if ('search' in href && href.search) {
    return (
      <ButtonLink className="w-full" variant={variant} to={href.to} params={params} search={href.search}>
        {children}
      </ButtonLink>
    )
  }
  return (
    <ButtonLink className="w-full" variant={variant} to={href.to} params={params}>
      {children}
    </ButtonLink>
  )
}

function TopicQuiz({ study }: { study: RoadmapStudy }) {
  const [pick, setPick] = useState<number | null>(null)
  return (
    <div className="mt-5">
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">Check yourself</p>
      <p className="mt-3 text-sm leading-6 text-ink">{study.quiz.prompt}</p>
      <div className="mt-3 flex flex-col gap-2">
        {study.quiz.choices.map((choice, index) => {
          const selected = pick === index
          const correct = index === study.quiz.answer
          return (
            <button
              key={choice}
              type="button"
              onClick={() => setPick(index)}
              className={`min-h-11 border px-3 py-2 text-left text-sm ${
                pick == null
                  ? 'border-line bg-surface text-ink hover:border-muted hover:bg-surface-2'
                  : selected && correct
                    ? 'border-accent bg-accent-low text-ink'
                    : selected
                      ? 'border-blunder text-blunder-text'
                      : correct
                        ? 'border-accent text-ink'
                        : 'border-line text-muted'
              }`}
            >
              {choice}
            </button>
          )
        })}
      </div>
      {pick != null ? <p className="mt-3 text-sm leading-6 text-muted">{study.quiz.why}</p> : null}
    </div>
  )
}

function TopicSheet({
  username,
  node,
  complete,
  exposure,
  onClose,
  onToggle,
}: {
  username: string
  node: RoadmapNode
  complete: boolean
  exposure?: NodeExposure
  onClose: () => void
  onToggle: () => void
}) {
  const library = exposureLabel(exposure)
  const study = studyFor(node.id)
  return (
    <div className="fixed inset-0 z-40" role="presentation">
      <button
        type="button"
        aria-label="Close topic"
        className="absolute inset-0 bg-canvas/70"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="roadmap-topic-title"
        className="absolute inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto border-t border-line bg-surface pb-[max(1.25rem,var(--safe-bottom))] sm:inset-x-auto sm:right-0 sm:top-0 sm:bottom-0 sm:max-h-none sm:w-[min(32rem,100vw)] sm:border-l sm:border-t-0"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2">
          <button
            type="button"
            className="inline-flex min-h-11 items-center font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:text-ink"
            onClick={onClose}
          >
            Close
          </button>
          <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">
            {complete ? 'Done' : 'Not done'}
          </span>
        </div>
        <div className="px-4 py-5 sm:px-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent">
            {node.moves ?? 'Pattern'}
          </p>
          <h2
            id="roadmap-topic-title"
            className="mt-2 font-display text-4xl uppercase leading-[0.92] text-ink"
          >
            {node.title}
          </h2>
          <p className="mt-4 text-sm leading-6 text-muted">{node.why}</p>
          {library ? (
            <p className="mt-3 text-sm text-muted">
              {library}
              {exposure?.games && !complete
                ? ' — playing it is not the same as knowing the plans.'
                : null}
            </p>
          ) : study ? null : (
            <p className="mt-3 text-sm text-muted">No games or drills tagged to this yet.</p>
          )}

          {study ? (
            <div className="mt-5">
              <MiniBoard fen={study.fen} pawnsOnly={study.pawnsOnly} />
              <p className="mt-3 text-sm leading-6 text-muted">{study.task}</p>
            </div>
          ) : null}

          {node.white || node.black ? (
            <dl className="mt-5 grid gap-4">
              {node.white ? (
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                    White
                  </dt>
                  <dd className="mt-2 text-sm leading-6 text-muted">{node.white}</dd>
                </div>
              ) : null}
              {node.black ? (
                <div>
                  <dt className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                    Black
                  </dt>
                  <dd className="mt-2 text-sm leading-6 text-muted">{node.black}</dd>
                </div>
              ) : null}
            </dl>
          ) : null}

          {node.know.length > 0 ? (
            <div className="mt-5">
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                Know these
              </p>
              <ul className="mt-3 divide-y divide-line border border-line">
                {node.know.map((point) => (
                  <li key={point} className="px-4 py-3 text-sm leading-6 text-muted">
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {study ? <TopicQuiz key={node.id} study={study} /> : null}

          <div className="mt-5 flex flex-col gap-2">
            {study ? (
              <PracticeLink
                username={username}
                href={{ to: '/drill/$username', search: studyDrillSearch(study) }}
                variant="primary"
              >
                Play this position
              </PracticeLink>
            ) : null}
            {node.items.map((item) => (
              <PracticeLink key={item.label} username={username} href={item.href}>
                {item.label}
              </PracticeLink>
            ))}
            <Button variant={complete ? 'ghost' : study ? 'secondary' : 'primary'} className="w-full" onClick={onToggle}>
              {complete ? 'Mark as not done' : 'Mark as done'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export function ChessRoadmap({
  username,
  selectedId,
}: {
  username: string
  selectedId?: string
}) {
  const navigate = useNavigate()
  const player = usePlayerData(username)
  const [marks, setMarks] = useState<RoadmapMarks>(() => readRoadmapMarks(username))
  const exposure = useMemo(
    () =>
      roadmapExposure(
        player.data?.games ?? [],
        player.data?.positions ?? [],
        player.data?.attempts ?? [],
      ),
    [player.data],
  )

  useEffect(() => {
    setMarks(readRoadmapMarks(username))
  }, [username])

  const nodes = allRoadmapNodes()
  const doneCount = nodes.filter((node) => nodeIsComplete(node.id, marks)).length
  const startId = nodes.find((node) => !nodeIsComplete(node.id, marks))?.id ?? null
  const selected = selectedId ? roadmapNodeById(selectedId) : null

  function closeSheet() {
    void navigate({
      to: '/roadmap/$username',
      params: { username },
      search: { node: undefined },
    })
  }

  function toggle(id: string) {
    const next = toggleCompleted(marks, id)
    setMarks(next)
    writeRoadmapMarks(username, next)
  }

  return (
    <div className="pb-8">
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 border-b border-line pb-4 font-mono text-[11px] uppercase tracking-[0.08em] text-muted sm:mt-6">
        <span className="text-ink">
          {doneCount}/{nodes.length} marked
        </span>
        {ROADMAP_TRACKS.map((track) => {
          const total = track.nodes.length
          const done = track.nodes.filter((node) => nodeIsComplete(node.id, marks)).length
          return (
            <span key={track.id}>
              {track.name} {done}/{total}
            </span>
          )
        })}
      </div>

      <div className="mt-5 flex flex-col gap-8 md:flex-row md:items-start md:gap-0 md:overflow-x-auto">
        {ROADMAP_TRACKS.map((track, index) => (
          <section
            key={track.id}
            className="min-w-0 md:w-[14rem] md:shrink-0 md:px-3 md:first:pl-0 md:last:pr-0"
          >
            <div className="border-b border-line pb-3">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                {String(index + 1).padStart(2, '0')} · {track.kicker}
              </p>
              <h2 className="mt-1 font-display text-2xl uppercase leading-none text-ink">
                {track.name}
              </h2>
            </div>
            <ul className="mt-3 flex flex-col gap-2">
              {track.nodes.map((node) => {
                const complete = nodeIsComplete(node.id, marks)
                const current = selectedId === node.id
                const start = node.id === startId
                const seen = exposureLabel(exposure.get(node.id))
                return (
                  <li key={node.id}>
                    <Link
                      to="/roadmap/$username"
                      params={{ username }}
                      search={{ node: node.id }}
                      className={`flex min-h-14 w-full flex-col justify-center border px-3 py-2 text-left ${
                        complete
                          ? 'border-accent bg-accent-low text-ink'
                          : current
                            ? 'border-accent bg-surface-2 text-ink'
                            : 'border-line bg-surface text-ink hover:border-muted hover:bg-surface-2'
                      }`}
                    >
                      <span className="font-medium leading-5">{node.title}</span>
                      {node.moves ? (
                        <span className="mt-1 font-mono text-[10px] leading-4 text-muted">{node.moves}</span>
                      ) : null}
                      <span className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                        {complete ? 'Done' : start ? 'Start here' : (seen ?? 'Not started')}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        ))}
      </div>

      {selected ? (
        <TopicSheet
          username={username}
          node={selected}
          complete={nodeIsComplete(selected.id, marks)}
          exposure={exposure.get(selected.id)}
          onClose={closeSheet}
          onToggle={() => toggle(selected.id)}
        />
      ) : null}
    </div>
  )
}
