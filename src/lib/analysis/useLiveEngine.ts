import { useEffect, useMemo, useState } from 'react'
import { ENGINE_DISPLAY_NAME } from '@/lib/analysis/engine'
import {
  ENGINE_DEPTH_MAX,
  ENGINE_DEPTH_MIN,
  ENGINE_DEPTH_PRESETS,
  readEnginePrefs,
  writeEnginePrefs,
  type EnginePrefs,
} from '@/lib/analysis/enginePrefs'
import { formatPv, suggestionArrows, whyTopMove } from '@/lib/analysis/suggestionArrows'
import type { AnalysisBudget, EngineLine } from '@/lib/analysis/types'
import { evaluateLines } from '@/lib/analyzeClient'

export function useEnginePrefs() {
  const [prefs, setPrefs] = useState<EnginePrefs>(() =>
    typeof window === 'undefined' ? { depth: 30, multipv: 3, arrows: true } : readEnginePrefs(),
  )

  function update(patch: Partial<EnginePrefs>) {
    setPrefs((current) => writeEnginePrefs({ ...current, ...patch }))
  }

  return { prefs, update }
}

export function useLiveEngine(fen: string | null, enabled: boolean) {
  const { prefs, update } = useEnginePrefs()
  const [lines, setLines] = useState<EngineLine[]>([])
  const [depth, setDepth] = useState(0)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!fen || !enabled) {
      setLines([])
      setDepth(0)
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setDepth(0)
    const budget: AnalysisBudget = {
      kind: 'depth',
      value: prefs.depth,
      multipv: prefs.multipv,
    }
    const handle = window.setTimeout(() => {
      void evaluateLines(fen, budget, prefs.multipv, (next) => {
        if (!cancelled) setDepth(next)
      })
        .then((result) => {
          if (cancelled) return
          setLines(result.slice(0, prefs.multipv))
          const reached = result[0]?.depth
          if (reached) setDepth(reached)
        })
        .catch(() => {
          if (!cancelled) setLines([])
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }, 80)
    return () => {
      cancelled = true
      window.clearTimeout(handle)
    }
  }, [enabled, fen, prefs.depth, prefs.multipv])

  const arrows = useMemo(
    () => (enabled && prefs.arrows ? suggestionArrows(lines) : []),
    [enabled, lines, prefs.arrows],
  )

  const status = !enabled
    ? `${ENGINE_DISPLAY_NAME} off`
    : loading
      ? `${ENGINE_DISPLAY_NAME} · depth ${depth || '…'}/${prefs.depth}`
      : `${ENGINE_DISPLAY_NAME} · depth ${depth || prefs.depth}`

  return {
    prefs,
    update,
    lines,
    depth,
    loading,
    arrows,
    status,
    why: whyTopMove(lines),
    formatPv,
    presets: ENGINE_DEPTH_PRESETS,
    minDepth: ENGINE_DEPTH_MIN,
    maxDepth: ENGINE_DEPTH_MAX,
  }
}
