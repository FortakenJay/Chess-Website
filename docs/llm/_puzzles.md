---
tags:
  - audience/llm
  - domain/puzzles
---

# _puzzles

Job: Elo-fit tactics from a merged catalog.

Owns: `src/lib/puzzles/**`, `PuzzleBoard.tsx`, `puzzles.$username.tsx`, `puzzles` table, `scripts/build-puzzle-seed.mjs`, `download-lichess-puzzles.mjs`.

Sources: Supabase catalog + static Lichess seed + on-demand Lichess + Chess.com. Optional bulk dump.

MUST: public read; service-role write.
MUST: cache by filter+Elo; stop expansion if DB ≥ 24 matches (`DB_SATISFIED`).
MUST: sort by |rating - selected|.
MUST: weakness phase only if that phase has ≥ 6 analyzed moves.
MUST: stepwise relax filters when empty.
MUST: phase from Lichess themes else FEN-only fallback (no chess.js; share analysis thresholds).
Opponent auto-reply delay 500ms.

Rule: `.cursor/rules/puzzles.mdc`.
