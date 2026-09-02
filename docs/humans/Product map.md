---
tags:
  - audience/human
  - map
aliases:
  - What the product is
---

# Product map

LEAK is not a playing site. It is a **training room** around a Chess.com account: find the leak, hide the answer, make the player move.

```mermaid
flowchart TB
  subgraph loop [Core loop]
    A[Import games] --> B[Engine-score every move]
    B --> C[Keep leak positions]
    C --> D[Guess before reveal]
    D --> E[See the same leak in Results]
    E --> D
  end

  subgraph teach [Teaching]
    F[Puzzles at your Elo]
    G[Openings + pawn structures]
    H[Roadmap topics]
    I[Review a game — RAM tape]
  end

  E --> F
  E --> G
  E --> H
  E --> I
```

Overview packages that walk as **The loop** (`TrainingLoop`): drill the leak → train or learn the opening → puzzles → convert endings → review. Same routes, one home. Linked users land here.

## Surfaces

| Surface | Route | Job |
| --- | --- | --- |
| Landing | `/` | Convert logged-out visitors. Linked users skip this. |
| Results | `/results/$username` | Where rating leaks: overview, openings, strategy, endgames |
| Positions | `/positions/$username` | Browsable leak table |
| Drill | `/drill/$username` | Guess-before-reveal on **your** mistakes |
| Puzzles | `/puzzles/$username` | Catalog tactics at rating |
| Trainer | `/trainer/$username` | Repertoire recall + ideas, then structures |
| Roadmap | `/roadmap/$username` | Named topics with real study positions |
| Review | `/review/$username` | One-off Chess.com-style tape, **not stored** |
| Analyze | `/analyze/$username` | Owner backfill / sync now |

Public username URLs are readable without signing in. Writes (sync, drill attempts, opening progress, username link) require the bound owner.

## What is never the product

- A chess server or matchmaking
- Storing PGN of the library
- Persisting Review tapes
- Invented evals or explorer frequencies on opening lesson cards
- Completing roadmap nodes because someone played games
