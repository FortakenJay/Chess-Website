---
tags:
  - audience/llm
  - domain/analysis
---

# _analysis

Job: Stockfish → aggregates + leak flags.

Owns: `src/lib/analysis/**`, `analyzeClient.ts`. `ANALYSIS_VERSION = 1` in `types.ts`.

Budgets: persisted 12_000 nodes MultiPV 4; interactive Review/puzzles/drills user depth (default 30, `enginePrefs`); **position-drill scoring** depth 16 MultiPV 3 (not persisted, does not bump `ANALYSIS_VERSION`). Live depth streams via worker `evalProgress`. Suggestion arrows: `suggestionArrows.ts`. Display name `ENGINE_DISPLAY_NAME`.

Fallbacks: WASM worker → remember fail → ASM; no worker → main thread.

MUST: move accuracy from win% drop; game/strategy/endgame from RMS.
MUST: ECO match board-only FEN through move 10.
MUST: persist leak classification only (`inaccuracy|mistake|blunder`).
MUST NOT: persist ply tape (`AnalyzeOptions.includePlies`).
MUST NOT: put brilliant/great/book on `FlaggedPosition`.
Phases: opening through move 10; endgame non-pawn material ≤ 13.
Strategy themes from engine-best move.

Stale if `analysis_version` null or `< ANALYSIS_VERSION`.

Rule: `.cursor/rules/analysis.mdc`.
