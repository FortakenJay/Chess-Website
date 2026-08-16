---
tags:
  - vault/home
aliases:
  - LEAK docs
---

# LEAK

Engine-verified chess error analysis for a Chess.com account. The product finds where rating leaks, then makes the player guess before it shows the answer.

## Start here

**People:** [[Architecture]] → [[Product map]] → [[Data flow]]

**Agents:** start at `llm/INDEX.md`. Load `llm/SYSTEM.md`, then the `_domain` file that matches the files you are changing.

## Domains

Cross-cutting first, then the product loop, then teaching surfaces.

| Folder | Domain | Human | LLM |
| --- | --- | --- | --- |
| `_shared` | Shell, tokens, queries, boards | [[Shared]] | `llm/_shared.md` |
| `_platform` | TanStack Start, Vercel, Stockfish assets | [[Platform]] | `llm/_platform.md` |
| `_identity` | Auth, Chess.com binding, avatars | [[Identity]] | `llm/_identity.md` |
| `_chesscom` | Public API, PGN, game identity | [[Chess.com]] | `llm/_chesscom.md` |
| `_sync` | Library ingest, retention, cron | [[Sync]] | `llm/_sync.md` |
| `_analysis` | Stockfish, scoring, flags | [[Analysis]] | `llm/_analysis.md` |
| `_persistence` | Supabase, RLS, caches | [[Persistence]] | `llm/_persistence.md` |
| `_insights` | Results IA, peers, charts | [[Insights]] | `llm/_insights.md` |
| `_practice` | Flagged drills | [[Practice]] | `llm/_practice.md` |
| `_puzzles` | Catalog, rating fit | [[Puzzles]] | `llm/_puzzles.md` |
| `_openings` | Repertoire trainer, lessons | [[Openings]] | `llm/_openings.md` |
| `_review` | Ephemeral game review | [[Review]] | `llm/_review.md` |
| `_roadmap` | Study topics, structures | [[Roadmap]] | `llm/_roadmap.md` |
| `_landing` | Logged-out marketing | [[Landing]] | `llm/_landing.md` |

## Also

- [[Route map]] — every URL
- [[Decision log]] — chose / considered / why, rolled up
- [[Domain overview]] / [[Decision]] — templates for new notes
