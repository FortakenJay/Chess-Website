---
tags:
  - audience/llm
  - domain/platform
---

# _platform

Job: runtime, hosting, engine assets.

Owns: `package.json`, `vite.config.ts`, `vercel.json`, `src/router.tsx`, `scripts/copy-engine.mjs`, env vars.

Env:
- Client: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Server: `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`, `CHESSCOM_USER_AGENT`

MUST: copy Stockfish 18 lite-single WASM+ASM to `public/engine` on postinstall.
MUST: cron path `/api/sync-user` schedule `0 6 * * *`.
MUST: keep full library Stockfish in the browser; cron incremental only.

Do not add a second framework or host without updating this file + `platform.mdc`.
