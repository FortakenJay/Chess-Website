---
tags:
  - audience/human
  - domain/persistence
aliases:
  - Supabase
  - Database
---

# Persistence

Supabase Postgres + RLS. Public **reads** of analysis for username preview. Owner **writes** when `username = linked_username()`. Shared catalogs (puzzles, seeded openings) are readable by all and written with the service role.

## Owns

- `src/lib/supabase/*`, `src/lib/persist.ts`
- `src/lib/playerCache.ts`, `idbCache.ts`
- `supabase/migrations/*`

## Depends on

[[Identity]] · [[Analysis]] (row shape)

```mermaid
erDiagram
  profiles ||--o| auth_users : uid
  games ||--o{ flagged_positions : game_link
  flagged_positions ||--o{ drill_attempts : position_id
  openings ||--o{ opening_nodes : opening_id
  opening_nodes ||--o{ node_progress : node_id
  profiles {
    uuid id
    text chess_com_username
  }
  games {
    text username
    text game_link
    int analysis_version
  }
  flagged_positions {
    text classification
    text fen_before
    int move_number
  }
  puzzles {
    text id
    int rating
  }
  openings {
    text username
    text eco
  }
```

## Tables

`profiles` · `games` · `flagged_positions` · `drill_attempts` · `period_summary` · `sync_state` · `puzzles` · `openings` · `opening_nodes` · `node_progress` · `structure_targets`

RPCs: `link_chess_username`, `linked_username`, `purge_expired_games`, `normalize_time_class`, `strategy_peer_stats`, `endgame_peer_stats`.

## Client cache

Versioned IndexedDB for player payloads. Quota / private-mode failures are ignored so the app still runs.

Persist in 200-row chunks. Refresh flagged rows by game link. `analysis_version` missing or old → eligible for reanalyze.

**Not stored:** library PGN, Review move tape, cosmetic move labels.
