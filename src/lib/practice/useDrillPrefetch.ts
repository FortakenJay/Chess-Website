import { useEffect, useState } from 'react'
import {
  DRILL_PREFETCH_AHEAD,
  loadDrillEval,
  peekDrillEval,
  prefetchDrillEvals,
  readyDrillCount,
} from '@/lib/practice/drillEval'

export function useDrillPrefetch(fens: string[], index: number) {
  const upcoming = fens.slice(index, index + DRILL_PREFETCH_AHEAD + 1)
  const [ready, setReady] = useState(() => readyDrillCount(upcoming))

  useEffect(() => {
    prefetchDrillEvals(upcoming)
    setReady(readyDrillCount(upcoming))
    let cancelled = false
    void (async () => {
      for (const fen of upcoming) {
        if (cancelled) return
        await loadDrillEval(fen)
        if (!cancelled) setReady(readyDrillCount(upcoming))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [upcoming.join('\n')])

  return {
    ready,
    ahead: upcoming.length,
    currentReady: Boolean(fens[index] && peekDrillEval(fens[index]!)),
  }
}
