# JobIntel — agent guide

Local-first job-search app (React + Vite + Zod, IndexedDB, GitHub Pages) with a GitHub Actions job collector.
Product context: `README.md`. Architecture: `docs/ARCHITECTURE.md`. Status: `TODO.md`. Security/recovery: `docs/SECURITY.md`, `docs/RECOVERY.md`.

## Use the knowledge graph first — do NOT read the whole repo

A pre-built graph of this repo lives in `graphify-out/` (code via AST + docs/favicon semantically).
Reading it is enough to orient yourself; open source files only for the specific nodes the graph points you to.

1. Read `graphify-out/GRAPH_REPORT.md` once (~4k tokens): god nodes, communities with labels, cross-doc links.
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
- **Doc/markdown/image changes** (README, TODO, docs/, favicon): CI cannot re-extract these semantically, so the doc part of the
  graph goes stale. Run `/graphify . --update` (run `graphify install` first if the `/graphify` skill is missing) and commit the
  `graphify-out/` changes in that same PR. If you can't, say so in the PR. On a `graph.json` merge conflict, take `main`'s
  version and re-run the update.
- Never rebuild from scratch (`/graphify .`) unless `graph.json` is missing; `--update` only re-reads changed files.
- Community names can degrade to file names (e.g. "actions.ts") as the code grows; that is cosmetic. `graphify label .` renames them (needs an LLM).

## Where things live (so you can skip exploring)

Stable layout only; for specifics (files, symbols, status) ask the graph — this table does not track them.

| Area | Path |
|---|---|
| App shell, routing | `src/app/` |
| UI primitives and layout | `src/components/{ui,layout}` |
| Screens, one folder per feature | `src/features/{dashboard,onboarding,resumes,discovery,applications,activity,settings}` (V2 UI, see `docs/UI_V2.md`) |
| V2 UI prototype: in-memory mock state, simulated agent | `src/prototype/` (store, selectors, `data/`) |
| Domain logic (pure, no React) | `src/domain/*` (mirrors the features, plus `match`); `src/domain/jobs/feedSchema.ts` is the Zod feed contract shared with the collector |
| Persistence (IndexedDB) | `src/storage/` |
| AI assistant domain (consented export, validated import, recommendation inbox; UI retired from V2) | `src/domain/ai/` (pure); design in `docs/AI_AUTOMATION_ARCHITECTURE.md`, plan in `docs/AI_AUTOMATION_ROADMAP.md` |
| Job collector (Greenhouse/Lever/Ashby, runs in Actions) | `collector/`; writes `public/data/jobs.json` |
| CI | `.github/workflows/` (`pages.yml` deploy, `scan.yml` job scan, `graph.yml` graph refresh) |
| Tests | `*.test.ts(x)` beside the code, plus `e2e/` (Vitest + Playwright) |

## Project rules that are not derivable from code

- Collector scope is Bengaluru + Hyderabad only; all work modes (onsite/hybrid/remote). Target roles: full-stack / backend / .NET / product engineering, SDE-2 level, product (SaaS) companies.
- The site is public; profile data lives only in the user's browser (IndexedDB). Never commit personal backups (`*.jibak.json`, `*.backup.json`).
- The feed contract (`feedSchema.ts`) is shared by the collector and the app — change it in one place.
- All planned phases (1–9) are implemented; `TODO.md` is the source of truth for status. The AI track (A1–A8) is tracked there too.
- AI output is untrusted input. The action whitelist in `src/domain/ai/schema.ts` must never gain an action that sends, submits, edits the profile or deletes. Change the contract by adding a schema version and keeping the old one parseable, never by loosening a limit.
- The AI context export (`src/domain/ai/context.ts`) is an allowlist. Add a field deliberately, default sensitive ones off, and extend `context.test.ts` (it greps the output for sentinel personal strings). The app never calls an AI service and holds no key; `check:dist` enforces it.
