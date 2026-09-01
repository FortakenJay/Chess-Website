import type { AnalysisBudget } from '@/lib/analysis/types'

const KEY = 'leak:engine-prefs:v1'
export const ENGINE_DEPTH_DEFAULT = 30
export const ENGINE_DEPTH_MIN = 6
export const ENGINE_DEPTH_MAX = 64
export const ENGINE_DEPTH_PRESETS = [12, 18, 24, 30] as const

export type EnginePrefs = {
  depth: number
  multipv: number
  arrows: boolean
}

const DEFAULTS: EnginePrefs = {
  depth: ENGINE_DEPTH_DEFAULT,
  multipv: 3,
  arrows: true,
}

function clampDepth(value: number) {
  if (!Number.isFinite(value)) return ENGINE_DEPTH_DEFAULT
  return Math.min(ENGINE_DEPTH_MAX, Math.max(ENGINE_DEPTH_MIN, Math.round(value)))
}

function clampLines(value: number) {
  if (!Number.isFinite(value)) return 3
  return Math.min(5, Math.max(1, Math.round(value)))
}

export function readEnginePrefs(): EnginePrefs {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { ...DEFAULTS }
    const parsed = JSON.parse(raw) as Partial<EnginePrefs>
    return {
      depth: clampDepth(Number(parsed.depth)),
      multipv: clampLines(Number(parsed.multipv)),
      arrows: parsed.arrows !== false,
    }
  } catch {
    return { ...DEFAULTS }
  }
}

export function writeEnginePrefs(prefs: EnginePrefs) {
  const next = {
    depth: clampDepth(prefs.depth),
    multipv: clampLines(prefs.multipv),
    arrows: prefs.arrows,
  }
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* quota / private mode */
  }
  return next
}

export function liveSearchBudget(depth = readEnginePrefs().depth): AnalysisBudget {
  return {
    kind: 'depth',
    value: clampDepth(depth),
    multipv: readEnginePrefs().multipv,
  }
}
