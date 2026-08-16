---
tags:
  - audience/llm
  - domain/practice
---

# _practice

Job: guess-before-reveal on leaked positions.

Owns: `DrillBoard.tsx`, `PositionsTable.tsx`, `drill.$username.tsx`, `positions.$username.tsx`, `drill_attempts`.

MUST: hide best + historical until legal move committed.
MUST: corpus = persisted inaccuracy/mistake/blunder only.
MUST: record `matched_best` and `matched_historical_mistake`.
MUST: identity `(username, game_link, move_number)`.
MUST: clicking another friendly piece reselects (`legalMoves.ts`).
MUST: preserve position-table filters in drill deep link.
MUST: persist attempts only for linked owner; visitors may still practice.

Rule: `.cursor/rules/practice.mdc`.
