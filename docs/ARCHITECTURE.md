# JobIntel architecture (v0.1 / Phase 1)

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

## Future phases (not implemented)

Phase 2+ will add a scheduled GitHub Actions collector. It will publish a **public-only**
`public/data/jobs.json`, and the browser will match it against the local profile. The profile
never leaves the browser. See `IMPLEMENTATION_PLAN.md` §2.3 and §7.
