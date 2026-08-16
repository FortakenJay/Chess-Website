import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button, FilterTile, fieldControlClass, fieldLabelClass } from '@/components/ui'
import {
  CENTER_LESSONS,
  COLOR_LESSONS,
  OPENING_FAMILIES,
  familyForOpening,
  openingSearchQuery,
  type OpeningFamily,
  type TrainedColor,
} from '@/lib/openings/families'
import { searchOpeningCatalog } from '@/lib/openings/functions'
import { matchesOpeningQuery } from '@/lib/openings/matchPlayed'
import {
  expandSearchQuery,
  FEATURED_OPENING_CHIPS,
  humanOpeningLabel,
} from '@/lib/openings/nicknames'
import { openingHitKey, type OpeningSearchHit } from '@/lib/openings/searchCatalog'
import type { OpeningTrainingOption } from '@/lib/openings/useOpeningTrainer'

const WEAKNESS_COPY = {
  recall: 'Move recall is behind understanding.',
  understanding: 'The ideas are behind the move memory.',
  balanced: 'Recall and understanding need equal attention.',
  new: 'No training history yet.',
} as const

const CENTER_LABEL: Record<string, string> = {
  open: 'Open center',
  semi_open: 'Semi-open center',
  closed: 'Closed center',
  fixed: 'Fixed center',
  tense: 'Tense center',
  fluid: 'Fluid center',
}

function SkillMeter({
  label,
  value,
  weak,
}: {
  label: string
  value: number | null
  weak: boolean
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-3 font-mono text-[11px] uppercase tracking-[0.06em]">
        <span className={weak ? 'text-bone' : 'text-muted'}>{label}</span>
        <span className="tabular text-ink">{value == null ? 'New' : `${value}%`}</span>
      </div>
      <div className="mt-2 h-1.5 bg-surface-2" aria-hidden>
        <div
          className={weak ? 'h-full bg-bone' : 'h-full bg-accent'}
          style={{ width: `${value ?? 0}%` }}
        />
      </div>
    </div>
  )
}

function OpeningCard({
  opening,
  recommended,
  onStart,
}: {
  opening: OpeningTrainingOption
  recommended: boolean
  onStart: (openingId: string, mode: 'weakest' | 'foundations') => void
}) {
  const started = opening.stats.attempted > 0
  const family = familyForOpening(opening)
  const center = opening.centerType ? CENTER_LABEL[opening.centerType] : null
  return (
    <article
      className={`flex min-w-0 flex-col border bg-surface p-4 sm:p-5 ${
        recommended ? 'border-accent' : 'border-line'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-accent">
            {opening.eco ?? 'Repertoire'} · {opening.side === 'w' ? 'White' : 'Black'}
            {family ? ` · ${family.name}` : ''}
          </p>
          <h3 className="mt-2 text-pretty font-display text-2xl uppercase leading-none text-ink sm:text-3xl">
            {opening.name}
          </h3>
        </div>
        {recommended ? (
          <span className="shrink-0 border border-accent px-2 py-1 font-mono text-[10px] uppercase text-accent">
            Weakest
          </span>
        ) : null}
      </div>

      <p className="mt-3 text-sm text-muted">{WEAKNESS_COPY[opening.stats.weakestSkill]}</p>
      {center ? <p className="mt-2 text-sm text-muted">{center}.</p> : null}
      <div className="mt-4 grid grid-cols-2 gap-4">
        <SkillMeter
          label="Recall"
          value={opening.stats.recallPct}
          weak={opening.stats.weakestSkill === 'recall'}
        />
        <SkillMeter
          label="Why"
          value={opening.stats.understandingPct}
          weak={opening.stats.weakestSkill === 'understanding'}
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 font-mono text-[10px] uppercase tracking-[0.06em] text-muted">
        <span>
          {opening.stats.attempted}/{opening.stats.total} seen
        </span>
        <span>{opening.stats.due} due</span>
        {opening.gamesPlayed > 0 ? <span>{opening.gamesPlayed} games</span> : null}
        {opening.stats.lapses > 0 ? <span>{opening.stats.lapses} misses</span> : null}
      </div>

      <div className="mt-auto grid gap-2 pt-5 sm:grid-cols-2">
        {started ? (
          <Button className="w-full" onClick={() => onStart(opening.id, 'weakest')}>
            Train weak spots
          </Button>
        ) : null}
        <Button
          variant={started ? 'secondary' : 'primary'}
          className={`w-full ${started ? '' : 'sm:col-span-2'}`}
          onClick={() => onStart(opening.id, 'foundations')}
        >
          Start from zero
        </Button>
      </div>
      {started ? (
        <p className="mt-2 font-mono text-[10px] leading-4 text-muted">
          Starting from zero reviews the earliest positions without erasing progress.
        </p>
      ) : null}
    </article>
  )
}

function OpeningGroup({
  kicker,
  title,
  count,
  children,
}: {
  kicker: string
  title: string
  count: number
  children: ReactNode
}) {
  return (
    <section className="mt-5">
      <div className="flex items-end justify-between gap-4 border-b border-line pb-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{kicker}</p>
          <h2 className="mt-1 font-display text-2xl uppercase leading-none text-ink">{title}</h2>
        </div>
        <span className="font-mono text-xs tabular text-muted">{count}</span>
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  )
}

function LearnOpeningAsk({
  catalog,
  color,
  initialQuery,
  downloading,
  downloadingKey,
  downloadError,
  onBack,
  onStart,
  onDownload,
  onImportPgn,
  onImportStudy,
}: {
  catalog: OpeningTrainingOption[]
  color: TrainedColor
  initialQuery: string
  downloading: boolean
  downloadingKey: string | null
  downloadError: string | null
  onBack: () => void
  onStart: (openingId: string, mode: 'weakest' | 'foundations') => void
  onDownload: (hit: OpeningSearchHit) => void
  onImportPgn?: (pgn: string, side: TrainedColor) => void
  onImportStudy?: (url: string, side: TrainedColor) => void
}) {
  const [query, setQuery] = useState(initialQuery)
  const [remote, setRemote] = useState<OpeningSearchHit[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [pgnText, setPgnText] = useState('')
  const [studyUrl, setStudyUrl] = useState('')
  const expanded = expandSearchQuery(query)
  const matches = catalog.filter(
    (opening) =>
      opening &&
      (matchesOpeningQuery(opening, query) ||
        (expanded !== query.trim() && matchesOpeningQuery(opening, expanded))),
  )
  const sideLabel = color === 'w' ? 'White' : 'Black'
  const remoteOnly = remote.filter(
    (hit) =>
      Boolean(hit?.name) &&
      !catalog.some(
        (opening) =>
          Boolean(opening?.name) &&
          (opening.name.toLowerCase() === hit.name.toLowerCase() ||
            (Boolean(opening.eco) && opening.eco === hit.eco && opening.side === color)),
      ),
  )
  const topMatch = matches[0]
  const topRemote = remoteOnly[0]
  const canTakeTop = Boolean(topMatch || (topRemote && !downloading))

  useEffect(() => {
    const needle = query.trim()
    if (needle.length < 2) {
      setRemote([])
      setSearching(false)
      setSearchError(null)
      return
    }
    let cancelled = false
    setSearching(true)
    const timer = window.setTimeout(() => {
      void searchOpeningCatalog({ data: { query: needle } })
        .then((hits) => {
          if (cancelled) return
          setRemote(hits)
          setSearchError(null)
        })
        .catch((error: unknown) => {
          if (cancelled) return
          setRemote([])
          setSearchError(error instanceof Error ? error.message : 'Could not search the opening book')
        })
        .finally(() => {
          if (!cancelled) setSearching(false)
        })
    }, 350)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query])

  return (
    <div className="pb-4">
      <button
        type="button"
        className="inline-flex min-h-11 items-center font-mono text-[11px] uppercase tracking-[0.08em] text-muted hover:text-ink"
        onClick={onBack}
      >
        Back to {sideLabel} openings
      </button>

      <div className="mt-4 border border-line border-l-4 border-l-accent bg-surface p-5 sm:p-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent">
          Learn a new opening · {sideLabel}
        </p>
        <h2 className="mt-3 max-w-[16ch] font-display text-4xl uppercase leading-[0.92] text-ink sm:text-5xl">
          What opening do you want to learn?
        </h2>
        <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
          Say it the way you would at the club — Dragon, Spanish, fried liver, London. We pick the
          main line people mean, then you can download a sharper branch if you want it.
        </p>

        <form
          className="mt-6 flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (topMatch) {
              onStart(
                topMatch.id,
                topMatch.known && topMatch.stats.attempted > 0 ? 'weakest' : 'foundations',
              )
              return
            }
            if (topRemote && !downloading) onDownload(topRemote)
          }}
        >
          <label htmlFor="learn-opening" className={fieldLabelClass}>
            What do you call it?
          </label>
          <input
            id="learn-opening"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={fieldControlClass}
            placeholder="Dragon, Spanish, fried liver…"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            autoFocus
          />
          <Button type="submit" className="w-full sm:w-auto" disabled={!canTakeTop}>
            {topMatch
              ? `Learn ${humanOpeningLabel(topMatch.name, topMatch.eco).title}`
              : topRemote
                ? `Learn ${humanOpeningLabel(topRemote.name, topRemote.eco).title}`
                : searching
                  ? 'Looking…'
                  : 'Search'}
          </Button>
        </form>
        {downloadError ? <p className="mt-3 text-sm text-blunder-text">{downloadError}</p> : null}
        {searchError ? <p className="mt-3 text-sm text-muted">{searchError}</p> : null}

        <details className="mt-6 border border-line bg-canvas px-4 py-3">
          <summary className="min-h-11 cursor-pointer font-mono text-[11px] uppercase tracking-[0.08em] text-ink">
            Import a PGN or Lichess study
          </summary>
          <p className="mt-3 text-sm leading-6 text-muted">
            Comments and variations stay in your personal repertoire. They are not published to the
            shared catalog.
          </p>
          <label htmlFor="import-pgn" className={`${fieldLabelClass} mt-4`}>
            PGN
          </label>
          <textarea
            id="import-pgn"
            value={pgnText}
            onChange={(event) => setPgnText(event.target.value)}
            className={`${fieldControlClass} min-h-28`}
            placeholder="Paste a repertoire PGN with comments and variations…"
          />
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <label className="inline-flex min-h-11 cursor-pointer items-center border border-line px-3 font-mono text-[11px] uppercase tracking-[0.06em] text-ink hover:border-accent">
              Upload PGN
              <input
                type="file"
                accept=".pgn,text/plain"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0]
                  if (!file) return
                  void file.text().then(setPgnText)
                }}
              />
            </label>
            <Button
              type="button"
              className="w-full sm:w-auto"
              disabled={!pgnText.trim() || downloading}
              onClick={() => onImportPgn?.(pgnText, color)}
            >
              Import PGN
            </Button>
          </div>
          <label htmlFor="import-study" className={`${fieldLabelClass} mt-4`}>
            Lichess study URL
          </label>
          <input
            id="import-study"
            value={studyUrl}
            onChange={(event) => setStudyUrl(event.target.value)}
            className={fieldControlClass}
            placeholder="https://lichess.org/study/…"
          />
          <Button
            type="button"
            className="mt-3 w-full sm:w-auto"
            disabled={!studyUrl.trim() || downloading}
            onClick={() => onImportStudy?.(studyUrl, color)}
          >
            Import study
          </Button>
        </details>
      </div>

      {query.trim().length < 2 ? (
        <div className="mt-5">
          <p className="text-sm text-muted">Tap a nickname, or start typing.</p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {FEATURED_OPENING_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                className="inline-flex min-h-11 shrink-0 items-center border border-line px-3 font-mono text-[11px] uppercase tracking-[0.06em] text-ink hover:border-accent hover:bg-surface-2"
                onClick={() => setQuery(chip)}
              >
                {chip}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          {matches.length > 0 ? (
            <ul className="mt-5 divide-y divide-line border border-line">
              {matches.map((opening) => {
                const label = humanOpeningLabel(opening.name, opening.eco)
                return (
                  <li key={opening.id}>
                    <button
                      type="button"
                      className="flex min-h-14 w-full flex-col gap-1 px-4 py-3 text-left hover:bg-surface-2 sm:flex-row sm:items-center sm:justify-between"
                      onClick={() =>
                        onStart(
                          opening.id,
                          opening.known && opening.stats.attempted > 0 ? 'weakest' : 'foundations',
                        )
                      }
                    >
                      <span className="min-w-0">
                        <span className="block font-medium text-ink">{label.title}</span>
                        <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                          {label.hint !== label.title ? `${label.hint} · ` : ''}
                          {opening.eco ?? 'Repertoire'} · {opening.side === 'w' ? 'White' : 'Black'}
                          {opening.known ? ' · already in your games' : ' · lesson ready'}
                        </span>
                      </span>
                      <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                        Learn this
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          ) : null}

          {searching ? (
            <p className="mt-5 text-sm text-muted">Looking up how people name that…</p>
          ) : remoteOnly.length > 0 ? (
            <section className="mt-5">
              <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
                {matches.length ? 'Other named lines' : 'Closest match'}
              </p>
              <ul className="mt-3 divide-y divide-line border border-line">
                {remoteOnly.map((hit, index) => {
                  const label = humanOpeningLabel(hit.name, hit.eco)
                  const thisOne = downloadingKey === openingHitKey(hit)
                  return (
                    <li key={openingHitKey(hit)}>
                      <button
                        type="button"
                        disabled={downloading}
                        className="flex min-h-14 w-full flex-col gap-1 px-4 py-3 text-left hover:bg-surface-2 disabled:opacity-40 sm:flex-row sm:items-center sm:justify-between"
                        onClick={() => onDownload(hit)}
                      >
                        <span className="min-w-0">
                          <span className="block font-medium text-ink">{label.title}</span>
                          <span className="mt-1 block font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                            {label.hint !== label.title ? `${label.hint} · ` : ''}
                            {hit.eco}
                            {index === 0 ? ' · usually this' : ''}
                            {hit.isEcoRoot ? ' · main line' : ''} · {hit.moves}
                          </span>
                        </span>
                        <span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                          {thisOne ? 'Downloading…' : 'Download and learn'}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </section>
          ) : !searching && matches.length === 0 ? (
            <p className="mt-5 border border-line bg-surface px-4 py-4 text-sm text-muted">
              Nothing named “{query.trim()}”. Try the nickname — Dragon, Najdorf, Spanish — or an
              ECO code like B70.
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

function FamilyCard({
  family,
  onPick,
}: {
  family: OpeningFamily
  onPick: (name: string) => void
}) {
  return (
    <article className="min-w-0 border border-line bg-surface p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">{family.firstMoves}</p>
      <h3 className="mt-2 font-display text-2xl uppercase leading-none text-ink">{family.name}</h3>
      <div className="mt-3 flex flex-wrap gap-2">
        {family.examples.map((example) => (
          <button
            key={example}
            type="button"
            className="inline-flex min-h-11 items-center border border-line px-3 font-mono text-[11px] uppercase tracking-[0.06em] text-ink hover:border-accent hover:bg-surface-2"
            onClick={() => onPick(openingSearchQuery(example))}
          >
            {example}
          </button>
        ))}
      </div>
    </article>
  )
}

export function OpeningChooser({
  known,
  catalog,
  downloading,
  downloadingKey,
  downloadError,
  onStart,
  onDownload,
  onImportPgn,
  onImportStudy,
}: {
  known: OpeningTrainingOption[]
  catalog: OpeningTrainingOption[]
  downloading: boolean
  downloadingKey: string | null
  downloadError: string | null
  onStart: (openingId: string, mode: 'weakest' | 'foundations') => void
  onDownload: (hit: OpeningSearchHit, side: TrainedColor) => void
  onImportPgn?: (pgn: string, side: TrainedColor) => void
  onImportStudy?: (url: string, side: TrainedColor) => void
}) {
  const [color, setColor] = useState<TrainedColor>('w')
  const [asking, setAsking] = useState(false)
  const [askQuery, setAskQuery] = useState('')
  const lesson = COLOR_LESSONS[color]
  const sideKnown = useMemo(
    () => known.filter((opening) => opening.side === color),
    [color, known],
  )
  const sideCatalog = useMemo(
    () => catalog.filter((opening) => opening.side === color),
    [catalog, color],
  )
  const recommendedId = sideKnown.find((opening) => opening.stats.attempted > 0)?.id ?? null

  function askFor(name = '') {
    setAskQuery(name)
    setAsking(true)
  }

  if (asking) {
    return (
      <LearnOpeningAsk
        catalog={sideCatalog}
        color={color}
        initialQuery={askQuery}
        downloading={downloading}
        downloadingKey={downloadingKey}
        downloadError={downloadError}
        onBack={() => setAsking(false)}
        onStart={onStart}
        onDownload={(hit) => onDownload(hit, color)}
        onImportPgn={onImportPgn}
        onImportStudy={onImportStudy}
      />
    )
  }

  return (
    <div className="pb-4">
      <div className="grid grid-cols-2 gap-2">
        <FilterTile
          label="White"
          hint="You choose the terrain"
          active={color === 'w'}
          onClick={() => setColor('w')}
        />
        <FilterTile
          label="Black"
          hint="You choose the fight"
          active={color === 'b'}
          onClick={() => setColor('b')}
        />
      </div>

      <div className="mt-5 border border-line border-l-4 border-l-accent bg-surface p-5 sm:p-7">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-accent">
          {color === 'w' ? 'As White' : 'As Black'}
        </p>
        <h2 className="mt-3 max-w-[16ch] font-display text-4xl uppercase leading-[0.92] text-ink sm:text-5xl">
          {lesson.headline}
        </h2>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">{lesson.body}</p>
        <ul className="mt-5 grid gap-3 md:grid-cols-2">
          {lesson.points.map((point) => (
            <li key={point.title} className="border border-line bg-canvas px-4 py-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                {point.title}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">{point.body}</p>
            </li>
          ))}
        </ul>
        <Button className="mt-6 w-full sm:w-auto" onClick={() => askFor()}>
          Learn a new opening
        </Button>
      </div>

      <section className="mt-5">
        <div className="border-b border-line pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">Families</p>
          <h2 className="mt-1 font-display text-2xl uppercase leading-none text-ink">
            Pick a name to search
          </h2>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {OPENING_FAMILIES.map((family) => (
            <FamilyCard key={family.id} family={family} onPick={askFor} />
          ))}
        </div>
      </section>

      <section className="mt-5">
        <div className="border-b border-line pb-3">
          <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">The center</p>
          <h2 className="mt-1 font-display text-2xl uppercase leading-none text-ink">
            What the pawns are doing
          </h2>
        </div>
        <ul className="mt-4 divide-y divide-line border border-line">
          {CENTER_LESSONS.map((center) => (
            <li key={center.id} className="px-4 py-4">
              <p className="font-medium text-ink">{center.name}</p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
                {center.example}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">{center.body}</p>
            </li>
          ))}
        </ul>
      </section>

      {sideKnown.length > 0 ? (
        <OpeningGroup
          kicker={`From your games · ${color === 'w' ? 'White' : 'Black'}`}
          title="Openings you play"
          count={sideKnown.length}
        >
          {sideKnown.map((opening) => (
            <OpeningCard
              key={opening.id}
              opening={opening}
              recommended={opening.id === recommendedId}
              onStart={onStart}
            />
          ))}
        </OpeningGroup>
      ) : (
        <p className="mt-5 text-sm text-muted">
          No annotated {color === 'w' ? 'White' : 'Black'} lines from your games yet. Name an
          opening above to download a line or start a lesson.
        </p>
      )}
    </div>
  )
}
