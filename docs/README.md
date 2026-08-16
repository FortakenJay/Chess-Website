# LEAK architecture vault

Open **this `docs` folder** as an Obsidian vault (File → Open folder as vault). Do not open the whole git repo — the graph fills with source files and becomes unreadable.

Two audiences, two trees. Same domains, different density.

| Folder | Who | What |
| --- | --- | --- |
| [[Home]] | Everyone | Map of the vault |
| `humans/` | People | Prose, mermaid diagrams, charts, why |
| `llm/` | Agents | Invariants, file maps, contracts, do/don't |
| `humans/_templates/` | Authors | New domain / decision note shapes |

Cursor still enforces coding constraints in `.cursor/rules/*.mdc`. This vault explains the system. If they disagree, the running code and the Cursor rule win — then update the vault.

## Obsidian

- Graph view: color groups are tagged by domain (`#domain/analysis`, `#audience/human`, `#audience/llm`).
- Mermaid renders in preview. Click a `[[wikilink]]` to jump.
- Unique note names on purpose so the graph does not collide (`Analysis` vs `llm/_analysis`).
