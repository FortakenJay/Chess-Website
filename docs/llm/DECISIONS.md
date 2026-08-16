---
tags:
  - audience/llm
---

# DECISIONS

Compressed ADRs. `⚠️` = implemented, no written product why. Full prose: `docs/humans/Decision log.md`. Cursor copies: `.cursor/rules/*.mdc`.

## Platform

- Stack: TanStack Start, Query, Vite, Nitro, React 19. ⚠️ why.
- Host: Vercel. Cron `0 6 * * *` → `/api/sync-user`.
- Backfill in browser; cron incremental only.
- Query: 30s stale, no focus refetch; player queries refetch on mount/focus. ⚠️
- Engine assets: Stockfish 18 lite-single WASM + ASM via postinstall.

## Identity

- Email/password + PKCE. README magic-link is stale.
- Unique Chess.com bind via `link_chess_username`; no client `user_id`.
- Validate handle pre-signup; link post-session.
- Avatar failure does not roll back link.
- Owner chrome iff route username = linked username.

## Chess.com

- Server functions + User-Agent + backoff.
- `game_link` = URL pathname.
- Regex PGN headers (avoid chess.js in that SSR module).
- Standard chess only.
- `endTime` > PGN Date.
- Rating: blitz > rapid > bullet > daily. ⚠️ order.

## Sync

- 2-year retention aligned with purge. ⚠️ why 2.
- Modes: full | incremental | reanalyze (`plan.ts`).
- Incremental: `cutoff - 1` for exclusive `>`.
- Cron: MAX_SYNC_MS ~8s; ≤2 months if no cursor. ⚠️ values.
- Batches: 2 months download, 10 games save. ⚠️
- Purge errors do not block sync.

## Analysis

- Persist budget 12k nodes MultiPV 4; Review movetime.
- WASM → remembered fail → ASM; worker → main.
- Accuracy = win% drop; game = RMS not mean.
- ECO: board FEN, through move 10.
- Persist leak tier only.
- Phases: opening ≤10; endgame non-pawn ≤13. ⚠️ thresholds.

## Persistence

- No PGN, no review tape.
- Public read / owner write.
- Puzzle catalog service-role writes.
- `analysis_version` staleness.
- Peer RPCs null under sample thresholds. ⚠️ numbers.
- IDB cache best-effort.
- 200-row persist chunks. ⚠️

## Insights

- Nested Results; redirect legacy top-level routes.
- RMS; opening ACPL fallback for legacy.
- Real peers on strategy/endgame only; omit opening peer column.
- Opening lists split by color.
- Time class: Overall, Bullet, Blitz, Rapid, Daily, Other.
- Grades in `grades.ts`. ⚠️ cutoffs.
- `usableAccuracy` / `usableAcpl` drop outliers.

## Practice

- Guess before reveal.
- Leak tiers only.
- Score best-match and historical-repeat.
- Key `(username, game_link, move_number)`.
- Friendly-piece click = reselect.
- Filter-preserving drill deep links.
- Attempts owner-only.

## Puzzles

- Merge: Supabase + seed + Lichess batches + Chess.com. ⚠️ dual provider.
- Cache; DB_SATISFIED = 24. ⚠️
- Elo windows + distance sort. ⚠️ bands.
- Weakness phase needs ≥6 moves. ⚠️
- Stepwise filter relax. ⚠️ order.
- 500ms opponent reply. ⚠️

## Openings

- Dual ease; due = min(recall, understanding).
- Provenance split: PGN moves / explorer freq / authored text.
- Constrained reason tags; prophylaxis needs a target.
- Session: 8 recall, MCQ on first 5.
- Chooser: played first, color first, ask to learn; ECO download if missing.
- Lesson before foundations/download; skip on weak-spot.
- Download: server ECO search + optional explorer extend; `openingHitKey` for UI busy state.
- Structures: pawn-only FEN; roadmap query params.
- Explorer: ±100 rating, ≥1.5% replies, no invented reasons. ⚠️ numbers.
- Shared `username IS NULL` + personal. Progress if authenticated.

## Review

- In-memory only.
- `includePlies` on; library sync off.
- Header-only list parse (no engine).
- PGN without username → ask color, rewrite headers.
- Synthetic percentile 5–95; do not use on Results.
- ~60ms movetime. ⚠️
- No press-scale on dense review rows.

## Landing / UI

- Logged-out marketing page; linked skip to Results.
- Training-room tokens on product chrome (Anton / Instrument / JetBrains, sharp, green accent).
- CSS 3D parallax, no scroll listeners.
- Italian leaks hero; live widgets not screenshots.
- Phone-first, 44px, FittedBoardFrame, scrolling nav, no roadmap auto-complete.
