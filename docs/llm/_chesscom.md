---
tags:
  - audience/llm
  - domain/chesscom
---

# _chesscom

Job: public Chess.com API + game identity.

Owns: `src/lib/chesscom.ts`, `chesscom.functions.ts`.

MUST: server functions only (User-Agent, backoff).
MUST: `game_link` = URL pathname, not full URL.
MUST: skip variants and games without PGN.
MUST: parse PGN headers with regex in this module (no top-level chess.js — SSR bundle).
MUST: prefer `endTime` over `[Date]`/`[UTCDate]`.
Rating for puzzles: blitz, rapid, bullet, daily.

Upsert key with games: `(username, game_link)`.

Rule: `.cursor/rules/chess-com-integration.mdc`.
