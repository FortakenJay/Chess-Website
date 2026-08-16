# leak

Engine-verified chess error analysis for a Chess.com account: where rating is lost (phase, motif, color, clock), a browsable list of flagged positions, and a drill board that does not reveal the answer until you move.

## Stack

TanStack Start, TanStack Query, Supabase (Postgres + magic-link auth), Stockfish 18 WASM, chess.js, react-chessboard, Recharts. Vercel hosts the app; a Node function at `/api/sync-user` runs the daily incremental sync.

Heavy backfill and "Sync now" run Stockfish **in the browser**. The cron only analyzes games since `sync_state.last_game_end_time`.

## Setup

1. Copy `.env.example` to `.env.local`.
2. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
3. For the daily cron, also set `SUPABASE_SERVICE_ROLE_KEY` and `CRON_SECRET` (same values in the Vercel project).
4. In the Supabase dashboard: Authentication → URL configuration, add `http://localhost:3000/auth/callback` and the production callback.
5. Apply `supabase/migrations/20260813000000_init_chess_analysis.sql` if this is a new project.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Routes

- `/` — preview any public Chess.com username, or sign in
- `/analyze/$username` — client-side backfill / incremental sync
- `/results/$username` — dashboard
- `/positions/$username` — flagged-move table
- `/drill/$username` — guess-before-reveal board

Daily cron (Vercel Hobby allows once per day): `0 6 * * *` → `/api/sync-user` with `Authorization: Bearer $CRON_SECRET`.

## Docs

Architecture vault (Obsidian): open the `docs/` folder, start at `docs/Home.md`. Humans: `docs/humans/` (diagrams). Agents: `docs/llm/INDEX.md`.
