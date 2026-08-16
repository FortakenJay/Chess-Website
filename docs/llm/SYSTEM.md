---
tags:
  - audience/llm
---

# SYSTEM — invariants

MUST / MUST NOT. Violate these only with an explicit product change plus updates to `.cursor/rules` and this vault.

## Persistence

- MUST persist game aggregates + `flagged_positions` leak tiers.
- MUST NOT persist library PGN.
- MUST NOT persist Review ply tapes (`includePlies` is RAM-only).
- MUST NOT persist cosmetic labels (brilliant, great, book) into drills.
- MUST bump `ANALYSIS_VERSION` when persisted JSON shape or scoring rules change.
- MUST treat null/older `analysis_version` as stale / reanalyze-eligible.
- MUST allow public reads of analysis rows; owner writes only when `username = linked_username()`.
- MUST write puzzle catalog with service role only.
- MUST ignore IndexedDB quota/private-mode failures.

## Analysis

- MUST use win%-drop for move accuracy and RMS for game/strategy/endgame aggregates.
- MUST use 12_000 nodes MultiPV 4 for persisted analysis; movetime for interactive Review.
- MUST match ECO on board-only FEN through move 10.
- MUST classify opening through move 10; endgame when non-pawn material ≤ 13.
- MUST try WASM worker, remember WASM failure, fall back to ASM, then main thread.

## Sync

- MUST keep a rolling 2-year retention in fetch, analysis, and DB purge.
- MUST run full backfill / Sync now in the browser; cron only incremental after `sync_state.last_game_end_time`.
- MUST pass `cutoff - 1` to Chess.com's exclusive timestamp filter.
- MUST NOT block sync if purge fails.

## Identity

- MUST bind Chess.com username via `link_chess_username` using `auth.uid()` only.
- MUST NOT accept client-supplied `user_id` for linking.
- MUST keep the profile link if avatar download/storage fails.
- MUST show owner mutations only when route username matches linked username.

## Chess.com

- MUST call public API through server functions with product User-Agent + backoff.
- MUST use URL pathname as `game_link`.
- MUST skip variants / missing PGN.
- MUST prefer `endTime` over PGN Date headers.

## Insights

- MUST nest Overview/Openings/Strategy/Endgames under `/results/$username`.
- MUST use SQL peer RPCs for strategy/endgames; render `—` on null.
- MUST NOT show a similar-rating column on openings.
- MUST split opening lists White vs Black.
- MUST exclude mate-inflated / unanalyzed rows from accuracy charts.
- MUST NOT reuse Review `peerPercentile` on Results.
- MUST derive Overview playstyle from stored `strategy_stats` (no peer RPC, no invented evals).

## Practice

- MUST hide engine best + historical move until a legal move is committed.
- MUST drill only inaccuracy/mistake/blunder.
- MUST identify positions by `(username, game_link, move_number)`.
- MUST persist `drill_attempts` only for the linked owner.
- MUST switch selection when clicking another friendly piece.

## Openings

- MUST take moves from PGN/ECO; frequencies/deviations from explorer; explanations from authored cards, imported comments, or evidence-backed templates (no evals). Lesson structure copy only if the line’s pawn FEN matches a skeleton.
- MUST NOT invent evals or explorer frequencies on knowledge cards. Statistics live on evidence/explorer fields, never in explanation prose.
- MUST link every generated teaching claim to board/engine/explorer evidence and drop a section when the fact cannot be proven.
- MUST keep imported PGN/Study commentary personal (`username` set); do not publish it into the shared catalog.
- MUST generate courses in resumable chunks (browser engine + bounded Lichess server slices). Do not rely on one long serverless request.
- MUST schedule from `min(recall_ease, understanding_ease)`.
- MUST train only repertoire nodes with ≥1 validated reason tag (not explorer-only).
- MUST start foundations/downloads in lesson phase; skip lesson on weak-spot drills.
- MUST key download UI per hit (`openingHitKey`); do not label every row Downloading.
- Structure identity = pawn-only FEN.

## Puzzles

- MUST cache by filter+Elo; stop remote expansion at ≥24 DB matches.
- MUST sort by distance to selected rating.
- MUST use FEN-only phase fallback without chess.js.

## UI

- MUST design phone-first; tap targets ≥ 44px.
- MUST size dense boards from leftover box (`FittedBoardFrame`), not width alone.
- MUST keep analysis nav on one horizontal scroll row.
- MUST NOT auto-complete roadmap nodes from games played.
- MUST NOT link roadmap practice to an empty opening trainer.

## Landing

- MUST render marketing `/` for logged-out users; redirect linked users to Results.
- MUST flatten motion for `prefers-reduced-motion`.
