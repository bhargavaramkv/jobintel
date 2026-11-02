# JobIntel

A personal, local-first job-search workspace. It runs as a static site on GitHub Pages and keeps your
candidate profile in your own browser.

**Status:** v0.9. Phases 1–8 (local profile, job discovery, matching, referral leads, outreach, application tracking, automation + reminders, analytics) are done. See
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

## Job discovery (Phase 2)

`collector/` runs in GitHub Actions three times a day. It reads the public posting APIs of the
boards in [`collector/sources.json`](collector/sources.json) (Greenhouse, Lever, Ashby), keeps
engineering roles in Bengaluru and Hyderabad (the `cities` list in `collector/config.json`), and writes `public/data/jobs.json`. The app fetches that static
file from the same origin and filters it in the browser. Your profile is never sent anywhere, and
the feed contains only public posting facts. Note that the list of tracked companies is public.

- Run a scan locally: `node collector/run.ts` (Node 24+)
- Check a board before adding it: `node collector/probe.ts greenhouse:<board> lever:<site> ashby:<name>`
- Run a scan from GitHub: Actions → *Job discovery scan* → *Run workflow*

## Matching (Phase 3)

Every job gets an explained **fit score** computed in your browser: technical skills (30%), experience (20%),
role alignment (20%), location and work mode (10%), seniority (10%) and other requirements (10%). Open
*Details* on a job to see each factor with what matched and what's missing. Factors without data are left out
rather than counted as a match, and the card says how much of the score had evidence. Shortlist the jobs you
want to pursue; they move to the *Shortlisted* tab.

## Referral leads (Phase 4)

*Referrals* lists the companies in your pipeline and helps you record people who could refer you. You find
them yourself (the app only opens public searches in a new tab), and every lead needs the link where you found
it. JobIntel never lets you type a relationship as a claim: "former colleague" appears only when the lead's
companies overlap your own past employers, "alumni" only when colleges overlap, and each label shows whether it
is **verified** (you confirmed it) or **inferred**. There are no email or phone fields.

## Outreach (Phase 5)

*Outreach* drafts LinkedIn notes, LinkedIn messages and emails for a referral lead, in three tones. The approach
follows the evidence: a referral is asked for only when you confirmed you know the person or worked together;
otherwise the draft asks for advice. Every draft lists the facts it used, and you can edit it. JobIntel never
sends anything: copy the text, send it yourself, then press *I sent it* to log it. Follow-ups are suggested at
most twice, a week apart, and stop when the person replies.

## Application tracking (Phase 6)

*Applications* follows every job you pursue from shortlist through referral, application, interviews and
outcome. Each stage change is kept in a history. Record next actions, follow-up dates, interviews, the resume
version you used, linked referral contacts and feedback. You can add jobs you found elsewhere, and JobIntel
stops you from tracking the same company and title twice by accident.

## Automation and reminders (Phase 7)

Scans run three times a day in GitHub Actions. *Job Discovery → Sources* shows source health, the last 20 scans
and roughly when the next one runs. If a scan or deploy fails, the workflow opens a `scan-failure` issue (GitHub
notifies you) and the last good feed stays online; the next good run closes the issue. The dashboard's *Today*
panel lists interviews and follow-ups due, and you can turn on a once-a-day browser reminder that works while
JobIntel is open in a tab.

## Analytics (Phase 8)

*Analytics* turns your own records into a funnel, outreach and referral counts, a by-company table, time to
response and repeated skill gaps. Every number opens to the records behind it, small samples are flagged, and
recommendations show their evidence. Comparisons between groups are labelled as correlations. Nothing leaves the
browser unless you press *Export CSV*.

## Applied tracking and feedback

On each job you can **Mark applied**, mark it **Not interested** (with optional reasons), and add a
**private note**. These records live in IndexedDB next to your profile and are included in
encrypted backups. JobIntel learns from them in the browser and re-ranks every new scan: it hides
companies you rejected, demotes seniority levels and role types you passed on, and promotes roles
like the ones you applied to. Each card explains why it was moved.

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
