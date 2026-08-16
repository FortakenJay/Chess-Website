---
tags:
  - audience/human
  - map
aliases:
  - System architecture
---

# Architecture

LEAK is a TanStack Start app. Players bring a Chess.com library. The browser (and a thin daily cron) run Stockfish, persist **aggregates + leak positions** to Supabase, and teach from those leaks. Full move tapes are for [[Review]] only and never hit the database.

```mermaid
flowchart TB
  subgraph outside [Outside]
    Player[Player]
    ChessCom[Chess.com public API]
    Lichess[Lichess explorer / puzzles]
    EcoBook["@chess-openings/eco.json"]
  end

  subgraph app [LEAK]
    Landing[Landing]
    Shell[App shell]
    Sync[Sync]
    Engine[Stockfish WASM]
    Insights[Results]
    Practice[Drill]
    Puzzles[Puzzles]
    Trainer[Opening trainer]
    Review[Review]
  end

  subgraph data [Supabase]
    Games[games]
    Flags[flagged_positions]
    Catalog[puzzles / openings]
    Auth[(auth.users)]
  end

  Player --> Landing
  Player --> Shell
  Landing -->|sign up / preview / free review| Shell
  Shell --> Sync
  Sync --> ChessCom
  Sync --> Engine
  Engine --> Games
  Engine --> Flags
  Games --> Insights
  Flags --> Practice
  Catalog --> Puzzles
  Catalog --> Trainer
  Lichess --> Puzzles
  Lichess --> Trainer
  EcoBook --> Trainer
  ChessCom --> Review
  Engine --> Review
  Auth --> Shell
```

## Workload split

Heavy work lives in the player's browser on purpose. Vercel Hobby cron is a short incremental pass, not a library rebuild.

```mermaid
flowchart LR
  subgraph browser [Browser]
    Backfill[Full backfill]
    SyncNow[Sync now]
    ReviewPass[Review tape]
  end

  subgraph vercel [Vercel]
    Cron["GET /api/sync-user\n0 6 * * *"]
  end

  subgraph db [Postgres]
    State[sync_state.last_game_end_time]
    Rows[games + flagged_positions]
  end

  Backfill -->|Stockfish lite WASM| Rows
  SyncNow -->|Stockfish lite WASM| Rows
  ReviewPass -->|in memory only| PlayerUI[Review UI]
  Cron -->|games after last_game_end_time| Rows
  Rows --> State
```

## Domain graph

Arrows mean “this domain depends on that one.” Keep new features inside one domain unless the arrow already exists.

```mermaid
flowchart LR
  Platform --> Shared
  Shared --> Identity
  Identity --> ChessCom
  ChessCom --> Sync
  ChessCom --> Review
  Sync --> Analysis
  Review --> Analysis
  Analysis --> Persistence
  Persistence --> Insights
  Persistence --> Practice
  Persistence --> Puzzles
  Persistence --> Openings
  Insights --> Roadmap
  Openings --> Roadmap
  Landing --> Identity
```

Jump: [[Platform]] · [[Shared]] · [[Identity]] · [[Chess.com]] · [[Sync]] · [[Analysis]] · [[Persistence]] · [[Insights]] · [[Practice]] · [[Puzzles]] · [[Openings]] · [[Review]] · [[Roadmap]] · [[Landing]]
