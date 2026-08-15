import type { ReactNode } from 'react'
import { FilterTile } from '@/components/ui'
import type { PuzzleFocus, PuzzleRatingBand } from '@/lib/puzzles/types'

const SVG = {
  width: 16,
  height: 16,
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  'aria-hidden': true as const,
}

function TileIcon({
  kind,
}: {
  kind: 'elo' | 'week' | 'month' | 'opening' | 'middle' | 'end'
}) {
  if (kind === 'elo') {
    return (
      <svg {...SVG}>
        <path d="M3 12 L8 3 L13 12 Z" />
        <path d="M5.5 9h5" />
      </svg>
    )
  }
  if (kind === 'week') {
    return (
      <svg {...SVG}>
        <rect x="2.5" y="3.5" width="11" height="10" rx="1" />
        <path d="M2.5 6.5h11M5.5 2.5v2M10.5 2.5v2" />
      </svg>
    )
  }
  if (kind === 'month') {
    return (
      <svg {...SVG}>
        <rect x="2.5" y="3.5" width="11" height="10" rx="1" />
        <path d="M2.5 6.5h11" />
        <path d="M5 9h1.5M7.75 9h1.5M10.5 9h1.5M5 11.2h1.5M7.75 11.2h1.5" />
      </svg>
    )
  }
  if (kind === 'opening') {
    return (
      <svg {...SVG}>
        <path d="M3 12.5h10M4.5 12.5V6.5l3.5-3 3.5 3v6" />
      </svg>
    )
  }
  if (kind === 'middle') {
    return (
      <svg {...SVG}>
        <circle cx="5" cy="8" r="2.2" />
        <circle cx="11" cy="8" r="2.2" />
        <path d="M7.2 8h1.6" />
      </svg>
    )
  }
  return (
    <svg {...SVG}>
      <path d="M3 4.5h10v8H3z" />
      <path d="M3 8.5h10M8 4.5v8" />
    </svg>
  )
}

const FOCUS_TILES: Array<{
  id: PuzzleFocus
  label: string
  hint: string
  icon: ReactNode
}> = [
  {
    id: 'suited_elo',
    label: 'Your Elo',
    hint: 'Near your Chess.com rating',
    icon: <TileIcon kind="elo" />,
  },
  {
    id: 'this_week',
    label: 'This week',
    hint: 'Weakest phase from recent games',
    icon: <TileIcon kind="week" />,
  },
  {
    id: 'this_month',
    label: 'This month',
    hint: 'Target your monthly leak',
    icon: <TileIcon kind="month" />,
  },
  {
    id: 'opening',
    label: 'Opening',
    hint: 'First-phase tactics',
    icon: <TileIcon kind="opening" />,
  },
  {
    id: 'middlegame',
    label: 'Middlegame',
    hint: 'Complex positions',
    icon: <TileIcon kind="middle" />,
  },
  {
    id: 'endgame',
    label: 'Endgame',
    hint: 'Late-game technique',
    icon: <TileIcon kind="end" />,
  },
]

const BAND_TILES: Array<{
  id: PuzzleRatingBand
  label: string
  hint: string
}> = [
  { id: 'suited', label: 'Suited', hint: '±150 of your Elo' },
  { id: 'easier', label: 'Easier', hint: 'Build confidence' },
  { id: 'harder', label: 'Harder', hint: 'Stretch rating' },
  { id: 'any', label: 'Any Elo', hint: 'Ignore rating window' },
]

export function PuzzleFilterTiles({
  focus,
  ratingBand,
  onFocus,
  onBand,
}: {
  focus: PuzzleFocus
  ratingBand: PuzzleRatingBand
  onFocus: (focus: PuzzleFocus) => void
  onBand: (band: PuzzleRatingBand) => void
}) {
  return (
    <>
      <section className="mt-8">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">Focus</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {FOCUS_TILES.map((tile) => (
            <FilterTile
              key={tile.id}
              label={tile.label}
              hint={tile.hint}
              icon={tile.icon}
              active={focus === tile.id}
              onClick={() => onFocus(tile.id)}
            />
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted">
          Difficulty vs your Elo
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {BAND_TILES.map((tile) => (
            <FilterTile
              key={tile.id}
              label={tile.label}
              hint={tile.hint}
              active={ratingBand === tile.id}
              onClick={() => onBand(tile.id)}
            />
          ))}
        </div>
      </section>
    </>
  )
}

