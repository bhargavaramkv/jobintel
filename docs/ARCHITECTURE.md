# JobIntel architecture (v0.1 / Phases 1–2)

## Decisions

| # | Decision | Reason |
|---|---|---|
| 1 | Static React + TypeScript SPA built by Vite, hosted on GitHub Pages | Pages serves static files only. There is no backend. |
| 2 | Public repository `jobintel` → project site with `base: '/jobintel/'` | GitHub Pages on the free plan requires a public repo. The repo contains code only. |
| 3 | `createHashRouter` | Pages cannot rewrite unknown paths to `index.html`. Hash routes survive a refresh. |
| 4 | IndexedDB for the profile and localStorage only for the last-opened profile section | Structured, larger storage. localStorage holds nothing sensitive. |
| 5 | Zod validation on every read, write and import | Persisted or imported data is never trusted. |
| 6 | Web Crypto AES-256-GCM + PBKDF2-SHA-256 (600k iterations, 16-byte salt, 12-byte IV) for backups | Standard primitives only. No custom cryptography. |
| 7 | System font stacks, no web fonts or CDN | Zero third-party requests at runtime. |
| 8 | No analytics, no API keys, no `VITE_*` secrets | The bundle is public. `scripts/check-dist.mjs` enforces this in CI. |

## Layers

```
src/
  app/          router (hash), navigation model, App root
  components/   layout (rail, header, command palette), ui primitives (TagInput, Field, Dialog…)
  features/     dashboard/, profile/ (pages, sections, provider, data & privacy)
  domain/       profile schema, form ↔ record conversion, tag rules, readiness score (pure, tested)
  storage/      IndexedDB connection + migrations, typed profileRepository, encrypted backup, UI prefs
  styles/       design tokens, global, component CSS
```

- UI components hold no business rules. Validation, scoring and conversion live in `domain/`.
- Only `storage/` touches IndexedDB, and it does so through a typed repository.

## Storage

- Database `jobintel`, version 1. It has two stores: `profile` (keyPath `id`, one record
  `current-user`) and `meta` (`schemaVersion`).
- `storage/migrations.ts` holds an append-only list of upgrade steps. To change the schema, add a
  step, bump `DB_VERSION` and, if records change shape, `SCHEMA_VERSION`.
- If a stored record fails validation, the app reports an error and offers restore or clear. It
  does not silently discard the record.

## Backup file format (v1)

```json
{
  "format": "jobintel-backup",
  "formatVersion": 1,
  "createdAt": "ISO-8601",
  "kdf":    { "name": "PBKDF2", "hash": "SHA-256", "iterations": 600000, "salt": "<b64 16B>" },
  "cipher": { "name": "AES-GCM", "keyLength": 256, "iv": "<b64 12B>" },
  "ciphertext": "<b64 AES-GCM(JSON{ schemaVersion, exportedAt, profile })>"
}
```

Import order: parse the structure → check the format version → bound the KDF iterations
(100k–5M) → decrypt → check the schema version → validate with Zod → replace local data. Nothing
is written unless every step succeeds.

## Readiness score

The score is a fixed weighted checklist that sums to 100:

| Item | Weight |
|---|---|
| Title | 10 |
| Years of experience | 10 |
| Summary | 10 |
| Primary skills (proportional up to 3) | 20 |
| Secondary skill | 5 |
| Target role | 15 |
| Seniority | 5 |
| Location | 10 |
| Work mode | 10 |
| Company type | 5 |

Optional preferences (target companies, compensation, notice period, excluded titles, display
name) do not count.

## Job discovery (Phase 2)

```
scan.yml (cron 3x/day, manual) ──► collector/run.ts ──► Greenhouse / Lever / Ashby public APIs
        │                               │  parse → filter (Bengaluru/Hyderabad + eng titles) → merge with previous feed
        │                               ▼
        │                      public/data/jobs.json  (committed by github-actions[bot])
        └──► pages.yml (workflow_call) ──► verify + build + deploy to Pages
Browser: fetch BASE_URL/data/jobs.json (same origin, plain GET) → Zod validate → filter locally
```

- **Contract:** `src/domain/jobs/feedSchema.ts` is imported by both sides. The collector validates
  before writing, and the app validates after reading.
- **Isolation:** each source is fetched with a timeout and one retry. A failure only marks that
  source as `error` and keeps its last-known jobs open. If every source fails, the run exits
  non-zero without writing.
- **Lifecycle:** `firstSeenAt` is kept across scans and `lastVerifiedAt` is updated each time a
  job is seen. A job missing from a healthy source is marked `closed` and pruned after
  `closedRetentionDays`.
- **Duplicates:** the primary key is `ats:board:sourceId`. The secondary key is normalised
  company + title + city set.
- **Deployment:** a push made with `GITHUB_TOKEN` doesn't trigger workflows, so `scan.yml`
  calls `pages.yml` itself with `ref: main` to build the commit it just made.
- **Privacy:** the collector never reads profile data. `check:dist` fails if profile field names
  appear under `data/`. The app's profile filter (locations, work modes, excluded titles) runs
  only in the browser.

## Future phases (not implemented)

Phase 3 will rank feed jobs against the local profile in the browser, with explained scores. See `IMPLEMENTATION_PLAN.md` §2.3 and §7.
