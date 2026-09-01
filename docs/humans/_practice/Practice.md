---
tags:
  - audience/human
  - domain/practice
aliases:
  - Drills
---

# Practice

Guess-before-reveal on **your** leaked positions. The engine best move and the historical move stay hidden until a legal move is committed. **Drill these** warms Stockfish to **depth 16** on the current FEN plus the next few in the queue so the principal move does not flip (`h4` then `h3`) between attempts. Near-equal MultiPV lines count as matching best. That search is not written back onto `flagged_positions`. After the reveal you can **play on** with engine arrows (default depth 30) — that is analysis, not a rescore.

## Owns

- `src/components/DrillBoard.tsx`, `PositionsTable.tsx`
- `src/routes/drill.$username.tsx`, `positions.$username.tsx`
- `drill_attempts` table

## Depends on

[[Analysis]] (leak tier) · [[Persistence]] · [[Shared]] (legalMoves, FittedBoardFrame)

```mermaid
sequenceDiagram
  actor Player
  participant Board as DrillBoard
  participant DB as drill_attempts

  Player->>Board: legal move
  Board->>Board: compare to engine best
  Board->>Board: compare to historical SAN
  Board-->>Player: reveal best + what you played in the game
  alt owner of this username
    Board->>DB: matched_best, matched_historical_mistake
  else visitor
    Board-->>Player: practice only, no row
  end
```

## Corpus

Only persisted inaccuracy / mistake / blunder. Brilliant, great, book never enter the table.

Identity of a position: `(username, game_link, move_number)`.

Clicking another friendly piece **switches selection** (Chess.com / Lichess), it does not try to capture your own piece.

Positions → Drill keeps table filters in the deep link.
