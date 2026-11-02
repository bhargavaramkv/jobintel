# JobIntel

A personal, local-first job-search workspace. It runs as a static site on GitHub Pages and keeps your
candidate profile in your own browser.

**Status:** v0.1, Phase 1 (app shell + local candidate profile). Job discovery, matching, referrals,
outreach, application tracking and analytics are planned. They are **not** implemented yet. See
[`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) and [`TODO.md`](TODO.md).

## Privacy model: read this first

- **The website is public.** GitHub Pages sites can be reached by anyone with the URL. JobIntel has no
  login and does not pretend to.
- **Your data is not sent to the website.** Profile fields are stored in this browser's IndexedDB.
  The app makes no network requests with your data and has no analytics or tracking.
- **No sync.** Data does not move between devices or browsers. Clearing site data deletes it.
- **Backups are encrypted.** *Profile → Data & privacy → Export* creates a file encrypted with
  AES-256-GCM. The key comes from your passphrase via PBKDF2-SHA-256 (600k iterations). Nobody can
  recover a backup if you lose the passphrase.
- **Never commit personal data** (resume, profile JSON, backups, notes) to this repository.
  `*.jibak.json` is git-ignored as a safety net.

## Features (Phase 1)

- A dark, blue/cyan command-centre shell. Desktop has an icon rail, mobile has a bottom navigation
  bar, and `Ctrl/⌘+K` opens a command palette.
- A dashboard with honest empty states and zero counts. It contains no sample jobs or fake activity.
- Profile & Preferences, with sections for identity, skills (with proficiency), target roles,
  location and work mode, and company and compensation. Every field is optional.
- Validation: inline errors, and duplicate tags are rejected regardless of case. A skill cannot be
  both primary and secondary.
- Explicit save with saved/unsaved status, a `Ctrl/⌘+S` shortcut, and a warning before you leave
  with unsaved edits.
- A deterministic **profile readiness** score. It is a fixed weighted checklist, and you can open
  the breakdown on the dashboard. The weights are in
  [`src/domain/profile/readiness.ts`](src/domain/profile/readiness.ts).
- Encrypted export and import of backups, and a clear-local-data action that requires typed
  confirmation.

## Development

```bash
npm ci
npm run dev          # http://localhost:5173/jobintel/
npm run typecheck
npm run lint
npm test             # Vitest unit + component tests
npm run build        # static output in dist/
npm run check:dist   # fails on secrets, trackers or source maps in dist/
npx playwright install chromium
npm run test:e2e     # Playwright smoke tests (desktop, tablet, mobile) against the built site
```

## Deployment

`.github/workflows/pages.yml` type-checks, lints, tests, builds, scans `dist/`, runs E2E, and then
deploys `dist/` to GitHub Pages on every push to `main`. Pull requests run the same checks but do
not deploy.

The site is a **project site** at `https://<user>.github.io/jobintel/`, so Vite's `base` is
`/jobintel/`. If you rename the repository or use a custom domain, set `VITE_BASE_PATH` at build
time. Routing uses `HashRouter` (`#/profile`), so refreshing a deep link never returns a 404.

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
