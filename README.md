# JobIntel

A personal, local-first job-search workspace. It runs as a static site on GitHub Pages and keeps your
candidate profile in your own browser.

**Status:** v0.9. All planned phases (1–9) are done: local profile, job discovery, matching, referral leads, outreach, application tracking, automation + reminders, analytics, and a security/accessibility/reliability pass. See [`docs/SECURITY.md`](docs/SECURITY.md), [`docs/RECOVERY.md`](docs/RECOVERY.md),
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

## UI V2 (Phase 1 prototype)

**Status: Prototype.** The V2 UI is a dark, command-centre prototype with seven screens, each a hash route:

- **Dashboard** (`#/`)
- **Onboarding** (`#/onboarding`)
- **Resumes** (`#/resumes`)
- **Discovery** (`#/jobs`)
- **Applications** (`#/applications`)
- **Activity** (`#/activity`)
- **Settings** (`#/settings`)

All data is mock data in [`src/prototype/`](src/prototype), held in memory and reset on reload. The agent is
simulated: nothing is submitted, uploaded or sent, and the header says so.

Switch scenarios with the selector in the header:

- **Demo**: sample profile, jobs, resumes, applications and activity.
- **New user (empty)**: no profile, jobs or applications, so the empty states show.
- **Simulate error**: screens show their error state with a retry action.

The header's **Reset** button restores the current scenario's data.

IndexedDB data is untouched in Phase 1. The AI assistant page is no longer in the UI; its domain code remains in
`src/domain/ai/`.


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

## Security and recovery

See [`docs/SECURITY.md`](docs/SECURITY.md) for the security and privacy review (CSP, dist checks, backups,
workflow permissions) and [`docs/RECOVERY.md`](docs/RECOVERY.md) for restoring data, fixing a stale feed and
supported browsers.

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).
