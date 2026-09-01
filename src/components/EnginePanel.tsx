import { Button, Chip, fieldControlClass, fieldLabelClass } from '@/components/ui'
import { formatEval } from '@/lib/analysis/formatEval'
import { formatPv } from '@/lib/analysis/suggestionArrows'
import { cn } from '@/lib/cn'
import type { useLiveEngine } from '@/lib/analysis/useLiveEngine'

export function EnginePanel({
  engine,
  enabled,
  onEnabledChange,
}: {
  engine: ReturnType<typeof useLiveEngine>
  enabled: boolean
  onEnabledChange: (on: boolean) => void
}) {
  const { prefs, update, lines, loading, status, why } = engine

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{status}</p>
        <Chip
          active={enabled}
          onClick={() => onEnabledChange(!enabled)}
        >
          Engine {enabled ? 'on' : 'off'}
        </Chip>
      </div>

      {enabled ? (
        <>
          <label className={fieldLabelClass} htmlFor="engine-depth">
            Max depth
          </label>
          <div className="flex flex-wrap gap-2">
            {engine.presets.map((value) => (
              <Chip
                key={value}
                active={prefs.depth === value}
                onClick={() => update({ depth: value })}
              >
                {value}
              </Chip>
            ))}
          </div>
          <input
            id="engine-depth"
            type="number"
            inputMode="numeric"
            min={engine.minDepth}
            max={engine.maxDepth}
            value={prefs.depth}
            onChange={(event) => update({ depth: Number(event.target.value) })}
            className={fieldControlClass}
            aria-describedby="engine-depth-hint"
          />
          <p id="engine-depth-hint" className="font-mono text-[10px] uppercase tracking-[0.08em] text-muted">
            Default 30 · custom {engine.minDepth}–{engine.maxDepth}
          </p>

          <div className="flex flex-wrap gap-2">
            <Chip
              active={prefs.arrows}
              onClick={() => update({ arrows: !prefs.arrows })}
            >
              Arrows {prefs.arrows ? 'on' : 'off'}
            </Chip>
            {[1, 2, 3].map((count) => (
              <Chip
                key={count}
                active={prefs.multipv === count}
                onClick={() => update({ multipv: count })}
              >
                {count} {count === 1 ? 'line' : 'lines'}
              </Chip>
            ))}
          </div>

          {loading && lines.length === 0 ? (
            <p className="font-mono text-xs text-muted">Calculating…</p>
          ) : null}
          {lines.length > 0 ? <p className="text-sm leading-6 text-ink">{why}</p> : null}
          <ul className="space-y-1.5">
            {lines.map((line, index) => (
              <li
                key={`${line.multipv}-${line.bestMove}`}
                className={cn(
                  'grid min-h-11 grid-cols-[3.25rem_minmax(0,1fr)] items-center gap-2 border px-2 py-2 font-mono text-xs',
                  index === 0 ? 'border-accent bg-accent-low text-ink' : 'border-line text-ink',
                )}
              >
                <span className="tabular text-muted">{formatEval(line.cp, line.mate)}</span>
                <span className="truncate">{formatPv(line)}</span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="text-sm text-muted">Turn the engine on to see arrows and why the top move scores highest.</p>
      )}
    </div>
  )
}

export function ExploreActions({
  canUndo,
  onUndo,
  onReset,
}: {
  canUndo: boolean
  onUndo: () => void
  onReset: () => void
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Button variant="ghost" className="w-full" onClick={onUndo} disabled={!canUndo}>
        Undo
      </Button>
      <Button variant="secondary" className="w-full" onClick={onReset} disabled={!canUndo}>
        Reset line
      </Button>
    </div>
  )
}
