---
tags:
  - audience/human
  - domain/insights
aliases:
  - Results
---

# Insights

Results is the information architecture for “where do I leak?” One top-level nav item, four nested sections.

## Owns

- `src/routes/results.$username*.tsx`
- `src/lib/resultsModel.ts`, `stats.ts`, `strategyStats.ts`, `grades.ts`, `trainingLoop.ts`
- `src/components/ResultsCharts.tsx`, `InsightStats.tsx`, `TrainingLoop.tsx`, `OpeningRepertoire.tsx`, `StrategyInsights.tsx`, `EndgameInsights.tsx`

## Depends on

[[Persistence]] · [[Analysis]] · [[Shared]] (charts)

```mermaid
flowchart TB
  Results["/results/$username"] --> Overview
  Results --> Openings
  Results --> Strategy
  Results --> Endgames
  Overview --> Loop[The loop]
  Overview --> RMS[RMS accuracy]
  Openings --> Color[White / Black swap]
  Openings --> Leak[score-leak rank]
  Strategy --> PeerS[strategy_peer_stats]
  Endgames --> PeerE[endgame_peer_stats]
  PeerS -->|under sample| Dash[em dash]
  PeerE -->|under sample| Dash
  Openings -.->|no RPC| NoPeer[no similar-rating column]
```

## Aggregation

RMS for game / strategy / endgame. Openings may fall back to ACPL on legacy rows. Filters normalize to Overall, Bullet, Blitz, Rapid, Daily, Other — same class goes into peer RPCs.

Opening lists default to **score leaks**: volume × how far game win rate sits below 50%. That is Lotus-shaped “your opening scores badly,” not a Stockfish eval. Overview repertoire meters show score then errors; ≥5 games under 48% get a WR leak tag.

Overview starts with **The loop** (`TrainingLoop`): ordered next actions into Drill, Trainer, Puzzles, and Review. Charts stay below as evidence. No extra nav item.

Letter grades: accuracy 90/85/78/70/60 → A+ through D, else F. Conversion grades depend on better / equal / worse entry (see `grades.ts`).

Charts skip unanalyzed or mate-inflated rows (`usableAccuracy` / `usableAcpl`) so a 0% / 5000-ACPL game cannot flatten the series.

Review's synthetic 5–95 percentile is **not** this domain.
