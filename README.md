# Chess Analyzer

A client-side chess analysis engine powered by Stockfish WASM. Analyze your games from Chess.com, Lichess, or raw PGN/FEN — no server required.

## Features

- **Game Import** — Look up any Chess.com or Lichess user, browse their game history, and pull games directly for analysis
- **Chess Analyzer** — Full Stockfish WASM engine running in-browser. Get move-by-move evaluation, best lines, blunder detection, and accuracy scores
- **FEN/PGN Input** — Paste any FEN position or PGN game for instant analysis
- **Puzzles** — Practice tactical puzzles to sharpen your play
- **Opening Tree** — Explore your personal opening repertoire built from all your played games. See win/loss/draw rates per line

## Tech Stack

- **Next.js** — React framework with SSR and API routes
- **Stockfish WASM** — Chess engine running client-side in the browser
- **chess.js** — Move validation, PGN/FEN parsing, game logic
- **react-chessboard** — Interactive board UI
- **Tailwind CSS** — Styling

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Deployment

Hosted on [Vercel](https://vercel.com) (free tier). Since the engine runs entirely in the browser, no server-side compute is needed.
