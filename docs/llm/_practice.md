---
tags:
  - audience/llm
  - domain/practice
---

# _practice

Job: guess-before-reveal on leaked positions.

Owns: `DrillBoard.tsx`, `PositionsTable.tsx`, `drill.$username.tsx`, `positions.$username.tsx`, `src/lib/practice/**`, `drill_attempts`.

MUST: hide best + historical until legal move committed.
MUST: corpus = persisted inaccuracy/mistake/blunder only.
MUST: record `matched_best` and `matched_historical_mistake`.
MUST: identity `(username, game_link, move_number)`.
MUST: clicking another friendly piece reselects (`legalMoves.ts`).
MUST: preserve position-table filters in drill deep link.
MUST: persist attempts only for linked owner; visitors may still practice.
MUST: drill answers come from a depth-16 MultiPV cache; prefetch the next few FENs; treat near-equal PVs as matching best. Do not rescore with a short movetime after the guess.
MUST: after reveal, play-on + `EnginePanel` is analysis only (user depth, default 30). It must not change `matched_best`.

Rule: `.cursor/rules/practice.mdc`.
