# JobIntel — agent guide

Local-first job-search app (React + Vite + Zod, IndexedDB, GitHub Pages) with a GitHub Actions job collector.
Product context: `README.md`. Architecture: `docs/ARCHITECTURE.md`. Roadmap/status: `TODO.md`, `docs/IMPLEMENTATION_PLAN.md`.

## Use the knowledge graph first — do NOT read the whole repo

A pre-built graph of this repo lives in `graphify-out/` (code via AST + docs/favicon semantically).
Reading it is enough to orient yourself; open source files only for the specific nodes the graph points you to.

1. Read `graphify-out/GRAPH_REPORT.md` once (~3.5k tokens): god nodes, communities with labels, cross-doc links.
2. Ask the graph instead of grepping or globbing the tree:
   - `graphify query "<question>"` — BFS context for a question (`--dfs` to trace one path, `--budget N` to cap tokens)
   - `graphify explain "<node>"` — what a symbol/file/concept is and what it connects to
   - `graphify path "<A>" "<B>"` — shortest connection between two things
   - `graphify affected "<node>"` — blast radius of changing a node
   - `graphify god-nodes` — the main hubs
   Every node carries `source_file` + `source_location`; use those to open only the lines you need.
3. Only fall back to grep/Read when the graph has no match (exit code 4) or you need exact current code to edit.

Cloud / fresh clone / no `graphify` command? The graph is committed, so it is already here. Set up the CLI in ~10s:
`pip install "graphifyy==0.9.101"` (or `uv tool install graphifyy==0.9.101`). If you cannot install anything, read
`graphify-out/GRAPH_REPORT.md` and search `graphify-out/graph.json` (plain JSON: nodes have `id`, `label`, `source_file`,
`source_location`, `community_name`; edges have `source`, `target`, `relation`, `confidence`).

Keeping the graph fresh (works the same locally and in the cloud):
- **Code changes:** CI (`.github/workflows/graph.yml`) runs `graphify update .` on every push to `main` and commits the result
  (`chore(graph): refresh code graph`). You normally do nothing. To query your *own uncommitted* changes, run
  `graphify update .` yourself (AST only, no LLM, no API key), but do **not** stage `graphify-out/` in code PRs — CI owns it.
- **Doc/markdown/image changes** (README, TODO, docs/, favicon): CI cannot re-extract these semantically. Run `/graphify . --update`
  and commit the `graphify-out/` changes in that same PR. On a `graph.json` merge conflict, take `main`'s version and re-run the update.
- Never rebuild from scratch (`/graphify .`) unless `graph.json` is missing; `--update` only re-reads changed files.

## Where things live (so you can skip exploring)

| Area | Path | Notes |
|---|---|---|
| App shell, routing | `src/app/` | HashRouter, `router.tsx` |
| UI primitives / layout | `src/components/ui`, `src/components/layout` | ChoiceGroup, Field, TagInput, dialogs |
| Screens | `src/features/{dashboard,jobs,profile}` | `DashboardPage`, `FeedView`, `ProfileEditor` |
| Domain logic (pure) | `src/domain/{jobs,profile}` | `feedSchema.ts` (shared Zod contract), `feedback.ts` (learned ranking), `actions.ts`, `filters.ts`, `readiness.ts` |
| Persistence | `src/storage/` | IndexedDB `jobintel` (v2: profile + `jobActions`), `profileRepository` |
| Collector | `collector/` | Greenhouse/Lever/Ashby adapters, `sources.json`, `run.ts`, `merge.ts`, `location.ts`, title filter; writes `public/data/jobs.json` |
| CI | `.github/workflows/` | `pages.yml` (deploy), `scan.yml` (collector, 3x/day) |
| Tests | `*.test.ts(x)` beside code, `e2e/` | Vitest + Playwright |

## Project rules that are not derivable from code

- Collector scope is Bengaluru + Hyderabad only; all work modes (onsite/hybrid/remote). Target roles: full-stack / backend / .NET / product engineering, SDE-2 level, product (SaaS) companies.
- The site is public; profile data lives only in the user's browser (IndexedDB). Never commit personal backups (`*.jibak.json`, `*.backup.json`).
- The feed contract (`feedSchema.ts`, zod) is shared by the collector and the app — change it in one place.
- Phase 3 (skill-based matching) is not started; phases 1–2 and applied/not-interested tracking are shipped.
