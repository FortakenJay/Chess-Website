import { useEffect, useMemo, useState } from 'react'
import { getPlayerRatings } from '@/lib/chesscom.functions'
import type { ChessComRatings } from '@/lib/chesscom'
import { usePlayerData } from '@/lib/queries'
import { expandPuzzleCatalog, loadPracticePuzzles } from '@/lib/puzzles/load'
import type {
  PracticePuzzle,
  PuzzleFilters,
  PuzzleFocus,
  PuzzleRatingBand,
} from '@/lib/puzzles/types'
import { filtersFromFocus, ratingWindowForElo } from '@/lib/puzzles/weakness'

function withEloWindow(filters: PuzzleFilters, elo: number | null): PuzzleFilters {
  if (elo == null || filters.ratingBand === 'any') {
    return {
      ...filters,
      ratingMin: filters.ratingBand === 'any' ? '' : filters.ratingMin,
      ratingMax: filters.ratingBand === 'any' ? '' : filters.ratingMax,
    }
  }
  const window = ratingWindowForElo(elo, filters.ratingBand)
  return {
    ...filters,
    ratingMin: window.min ?? '',
    ratingMax: window.max ?? '',
  }
}

export function usePuzzlePractice(name: string) {
  const player = usePlayerData(name)
  const [ratings, setRatings] = useState<ChessComRatings | null>(null)
  const [userFilters, setUserFilters] = useState<PuzzleFilters | null>(null)
  const [puzzles, setPuzzles] = useState<PracticePuzzle[]>([])
  const [applied, setApplied] = useState<PuzzleFilters | null>(null)
  const [relaxed, setRelaxed] = useState(false)
  const [catalogTotal, setCatalogTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [expanding, setExpanding] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)
  const [expandNote, setExpandNote] = useState<string | null>(null)

  const elo = ratings?.primary ?? null
  const games = player.data?.games
  const ready = !player.isLoading

  const filters = useMemo(() => {
    const base = userFilters ?? filtersFromFocus('suited_elo', games ?? [], elo)
    return withEloWindow(base, elo)
  }, [elo, games, userFilters])

  useEffect(() => {
    let cancelled = false
    void getPlayerRatings({ data: { username: name } })
      .then((data) => {
        if (!cancelled) setRatings(data)
      })
      .catch(() => {
        if (!cancelled) setRatings(null)
      })
    return () => {
      cancelled = true
    }
  }, [name])

  useEffect(() => {
    if (!ready) return

    let cancelled = false
    setLoading(true)
    setError(null)

    void (async () => {
      try {
        const result = await loadPracticePuzzles(filters, {
          force: reloadToken > 0,
          elo,
        })
        if (cancelled) return
        setPuzzles(result.puzzles)
        setApplied(result.applied)
        setRelaxed(result.relaxed)
        setCatalogTotal(result.catalogTotal)
      } catch (err) {
        if (cancelled) return
        setError(
          err instanceof Error
            ? err.message
            : 'Something went wrong while loading puzzles.',
        )
        setPuzzles([])
        setRelaxed(false)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [elo, filters, ready, reloadToken])

  function applyFocus(focus: PuzzleFocus) {
    setUserFilters(filtersFromFocus(focus, games ?? [], elo, { ...filters, focus }))
    setRelaxed(false)
    setReloadToken(0)
  }

  function applyBand(band: PuzzleRatingBand) {
    setUserFilters(
      withEloWindow(
        {
          ...filters,
          ratingBand: band,
        },
        elo,
      ),
    )
    setRelaxed(false)
    setReloadToken(0)
  }

  function updateFilter<K extends keyof PuzzleFilters>(key: K, value: PuzzleFilters[K]) {
    setUserFilters({ ...filters, [key]: value })
    setRelaxed(false)
    setReloadToken(0)
  }

  function clearFilters() {
    setUserFilters(null)
    setRelaxed(false)
    setReloadToken(0)
  }

  async function growCatalog() {
    setExpanding(true)
    setExpandNote(null)
    setError(null)
    try {
      const result = await expandPuzzleCatalog(2)
      setCatalogTotal(result.catalogTotal)
      setExpandNote(
        result.saved > 0
          ? `Added up to ${result.saved} puzzles (${result.lichessOk} Lichess · ${result.chesscomOk} Chess.com). Catalog now ${result.catalogTotal}.`
          : 'Batch download returned nothing (rate limits or server timeout). For the full dump use npm run puzzles:import-full.',
      )
      setReloadToken((n) => n + 1)
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Could not expand the puzzle catalog.',
      )
    } finally {
      setExpanding(false)
    }
  }

  return {
    ratings,
    elo,
    filters,
    puzzles,
    applied: applied ?? filters,
    relaxed,
    catalogTotal,
    loading,
    expanding,
    error,
    reloadToken,
    expandNote,
    ready,
    applyFocus,
    applyBand,
    updateFilter,
    clearFilters,
    growCatalog,
    bumpReload: () => setReloadToken((n) => n + 1),
  }
}
