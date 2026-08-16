---
tags:
  - audience/human
  - map
aliases:
  - How data moves
---

# Data flow

## Library ingest

Owner hits Analyze / Sync now, or cron wakes `/api/sync-user`.

```mermaid
sequenceDiagram
  actor Owner
  participant UI as Analyze UI
  participant Plan as sync/plan.ts
  participant API as Chess.com
  participant SF as Stockfish worker
  participant DB as Supabase

  Owner->>UI: Sync now / first backfill
  UI->>API: player archives
  API-->>UI: month URLs
  UI->>Plan: monthsToScan full or incremental
  loop each month batch of 2
    UI->>API: monthly games PGN
    API-->>UI: standard chess only
    loop each unsaved game
      UI->>SF: 12000 nodes MultiPV 4
      SF-->>UI: evals
      UI->>UI: classify, RMS accuracy, leak flags
    end
    UI->>DB: upsert 10 games + flagged_positions
  end
  UI->>DB: sync_state.last_game_end_time
```

Retention is a rolling **two years**. Purge runs best-effort before sync and does not block ingest.

## What gets stored vs what dies in memory

```mermaid
flowchart LR
  subgraph persist [Postgres]
    G[games aggregates]
    F[flagged_positions leak tier]
    P[period_summary]
  end

  subgraph memory [RAM only]
    Tape[Full ply tape]
    Cosmetic[brilliant / great / book]
    ReviewJSON[Review report]
  end

  AnalyzeGame[analyzeGame] --> G
  AnalyzeGame --> F
  AnalyzeGame --> Tape
  Tape --> Cosmetic
  ReviewUI[Review] --> ReviewJSON
```

`FlaggedPosition` is the leak tier used by [[Practice]]. Cosmetic labels never enter drills.

## Read path for Results

```mermaid
flowchart TB
  Q[usePlayerData] --> IDB[IndexedDB player cache]
  Q --> SB[Supabase games + flags]
  SB --> Model[resultsModel / stats]
  Model --> Charts[Results charts]
  Model --> Peers[strategy_peer_stats RPC]
  Peers -->|null if under sample| Dash[em dash]
```

Peer cohorts exist for Strategy and Endgames. Openings have **no** similar-rating column — a blank column would look like missing data.
