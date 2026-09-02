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
MUST: repertoire miss vs `opening_nodes` is a separate `line` marker, never mixed into blunder/mistake quality.
Interactive arrows: shared engine prefs (default depth 30), not Fast/Balanced/Deep movetime. Game tape still RAM-only.
Review rows: `reviewUi` only for move/list rows (no press-scale). Buttons and chips come from `src/components/ui`. Engine chrome is `EnginePanel`.

Rule: `.cursor/rules/review.mdc`.
