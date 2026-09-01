---
name: chesscom-analysis-board
description: >-
  Chess.com-style analysis board UX for LEAK: engine on/off, live depth readout,
  suggestion arrows, MultiPV lines, play-from-position after a puzzle or drill.
  Use when adding or changing analysis mode, engine arrows, depth tuners,
  Review interactive search, PuzzleBoard/DrillBoard post-solve explore, or
  Stockfish live eval UI.
---

# Chess.com analysis board (LEAK)

Chess.com Analysis Board: toggle engine → arrows on the board, lines in the sidebar, live depth, play any legal move from the current position. LEAK copies that interaction, not their branding.

Official Chess.com help (behavior to match):

- [Using the Analysis Board](https://support.chess.com/en/articles/8612657-using-the-analysis-board)
- [Analysis Board settings](https://support.chess.com/en/articles/8708701-how-do-i-change-the-analysis-board-settings)
- Puzzle complete → **Analysis** / play from the position (same board, engine optional)

## Product split (do not mix)

| Path | Budget | Persist |
| --- | --- | --- |
| Library sync | 12,000 nodes, MultiPV 4 | Game aggregates + leak flags |
| Drill **scoring** | Depth 16, MultiPV 3, RAM cache | Never. Prefetch upcoming FENs |
| Interactive analysis | User depth, default **30**, MultiPV 1–3 | Prefs in `localStorage` `leak:engine-prefs:v1` only |

Do not bump `ANALYSIS_VERSION` for interactive depth. Do not invent plans in “why this move” copy — eval + SAN only (`whyTopMove`).

Engine display name: `ENGINE_DISPLAY_NAME` (`Stockfish 18 Lite`). Status line:

```
Stockfish 18 Lite · depth 14/30
```

Depth presets 12 / 18 / 24 / 30. Custom input clamped 6–64.

## Chess.com UX → LEAK

1. **Engine chip** — on/off. Off = browse and play still work; no arrows, no live search.
2. **Arrows** — principal opaque green, 2nd yellow, fading alts. `suggestionArrows()`. Toggle arrows independently of engine.
3. **Lines list** — eval in a tabular column, PV SAN truncated. Top line emphasized (`border-accent`).
4. **Depth tuner** — chips + number input. Shared prefs so Review / puzzles / drills stay in sync.
5. **Play on** — after puzzle solve/fail or drill reveal, legal moves continue from that FEN. Undo / Reset line. Guess-before-reveal stays locked until the attempt.
6. **Why text** — `whyTopMove`: principal SAN + eval; 15cp window = engine-equal. No “this attacks the king because…”.

## Implementation map

- Prefs: `src/lib/analysis/enginePrefs.ts`
- Arrows / why: `src/lib/analysis/suggestionArrows.ts`
- Hook: `src/lib/analysis/useLiveEngine.ts`
- Explore: `src/lib/analysis/useExploreLine.ts`
- Panel: `src/components/EnginePanel.tsx` (`EnginePanel`, `ExploreActions`)
- Worker progress: `evalProgress` in `analyze.worker.ts` → `analyzeClient.evaluateLines(..., onEvalDepth)`
- Boards: `PuzzleBoard.tsx`, `DrillBoard.tsx`, `review/GameReview.tsx`

`react-chessboard` arrows: `{ startSquare, endSquare, color }`.

## Hard rules

- Phone-first: depth input and chips `min-h-11`. Do not put engine settings behind hover.
- One `EnginePanel` — do not restyle a second analysis chrome.
- Live search must not rescore drill answers. Scoring stays `loadDrillEval` / depth 16.
- Review ply tape stays RAM-only.
- When engine is calculating with no lines yet, show `Calculating…` plus live depth, not a blank board.

## Do not

- Copy Chess.com assets, copy, or arrow SVGs.
- Persist Review / puzzle exploration PGN.
- Use movetime Fast/Balanced/Deep for the interactive panel (legacy). Depth is the control.
- Run live analysis during puzzle opponent auto-reply or drill `thinking`.
