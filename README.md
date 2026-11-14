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

## UI V2

A dark UI with six screens, each a hash route. It works on real data: the public job feed collected by the
GitHub Actions scanner, and a profile and master resume that stay in this browser only.

- **Dashboard** (`#/`): profile readiness, feed stats (open jobs, last scan, jobs above your minimum score), top five matches and the number of tracked jobs.
- **Setup** (`#/onboarding`): resume, about you, roles, skills, location, salary. Roles and skills are suggested from your resume. Finish saves your profile.
- **Resumes** (`#/resumes`): upload or replace your master resume (`.tex`) and read its source with line numbers.
- **Jobs** (`#/jobs`): search the feed by title, company and description, filter by city, work mode and minimum match score, and sort by match or newest. Each job shows how it matches you, with a link to the original posting and a **Track** button. Filters live in the URL (`?q=&city=&mode=&min=&sort=`).
- **Applications** (`#/applications`): the jobs you track. You set the status yourself (Saved, Applied, Interview, Offer, Rejected) and keep notes. Nothing is sent or checked for you.
- **Settings** (`#/settings`): edit your profile, the minimum match score, and the preferred cities and work modes that drive matching.

Your profile, resume, tracked jobs and preferences are saved in this browser's localStorage and nowhere else.
Clearing site data deletes them. The job feed is read from `public/data/jobs.json` and validated with the shared
schema before it is used. Details: [`docs/UI_V2.md`](docs/UI_V2.md).

IndexedDB data from earlier phases is not used by this UI. The AI assistant page is no longer in the UI; its domain
code remains in `src/domain/ai/`.

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
