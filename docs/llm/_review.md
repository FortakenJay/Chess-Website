---
tags:
  - audience/llm
  - domain/review
---

# _review

Job: ephemeral Chess.com-style tape.

Owns: `src/components/review/**`, `review.tsx`, `review.index.tsx`, `review.$username.tsx`, `parseGameMeta.ts`, `reportStats.ts`.

MUST: analyze in memory; write nothing to DB.
MUST: `includePlies: true` here; false on library sync.
MUST: list games via header parse only (no engine).
MUST: if PGN lacks username, ask color and rewrite headers.
MUST NOT: feed `reportStats.peerPercentile` (synthetic 5–95) into Results peers.
Interactive budget ~60ms movetime.
Review rows: shared `reviewUi` classes, no press-scale.

Rule: `.cursor/rules/review.mdc`.
