# Implementation status

## Phase 1: app shell, dark UX, local profile ✅

- [x] React + TypeScript + Vite static build, `base: /jobintel/`
- [x] GitHub Actions: typecheck, lint, unit/component tests, build, dist scan, E2E, Pages deploy
- [x] Dark-only blue/cyan design tokens (no purple), reduced-motion support
- [x] Responsive shell: icon rail (desktop/tablet), bottom nav (mobile), `Ctrl/⌘+K` palette
- [x] Dashboard with truthful zero/empty states, setup checklist, readiness, roadmap
- [x] Profile & Preferences: 5 editable sections + Data & privacy
- [x] IndexedDB repository with schema version + migrations, Zod validation
- [x] Deterministic readiness score with visible breakdown
- [x] Encrypted backup export/import (AES-GCM + PBKDF2) with tests
- [x] Clear local data with typed confirmation
- [x] Unsaved-changes guard (in-app navigation and tab close)
- [x] README, architecture doc

### Known limitations

- Data lives in one browser profile only. There is no cross-device sync, by design.
- Private/incognito windows may discard IndexedDB when closed.
- Planned navigation items are hidden on mobile. The dashboard roadmap lists them instead.
- The backup contains the last *saved* profile, not unsaved edits. The export dialog warns about this.

## Phase 2: job discovery ✅

- [x] Public feed contract shared by collector and app (`src/domain/jobs/feedSchema.ts`, Zod-validated on write and read)
- [x] Collector (`collector/`): Greenhouse, Lever and Ashby public posting APIs, no dependencies beyond Zod
- [x] Source registry `collector/sources.json`: 43 boards verified on 2026-11-02 to list engineering roles in Bengaluru or Hyderabad
- [x] Normalization: title, company, published locations → city, remote-India, work mode, department, plain-text description, requirement bullets, original URL, source id, posted / first-seen / last-verified timestamps
- [x] Feed keeps software-engineering titles in **Bengaluru and Hyderabad only**. The `cities` list in `collector/config.json` sets this scope, and city-less remote-India roles are excluded.
- [x] De-duplication by stable source id, then by company + title + location
- [x] Closed detection: a job missing from a healthy source is marked closed, then dropped after 14 days
- [x] A failing source never fails the scan and never closes its jobs. If every source fails, nothing is written.
- [x] Source health and last-successful-scan metadata in the feed and the UI
- [x] `scan.yml`: three scans a day (07:43, 13:43, 19:43 IST) plus manual dispatch. It commits the feed, then deploys via `pages.yml`.
- [x] Job Discovery page: search, city/remote/work-mode/company/date filters, sort, details, closed toggle, source table
- [x] Optional filter by the profile's stated locations, work modes and excluded titles (filtering only; no scoring). Accepting the remote work mode doesn't widen the location; only a location like "Remote India" does.
- [x] Dashboard: real "New Jobs" count (first seen in the last 3 days) and the newest fitting jobs
- [x] `check:dist` also fails if a candidate-profile field ever appears in `data/`

### Known limitations

- Hyderabad coverage is thinner than Bengaluru, because few Hyderabad-heavy companies use these three ATSs.
- Greenhouse doesn't publish a work mode, so most jobs show "Work mode not stated" and are never excluded for it.
- Requirement bullets come only from recognised headings. Some postings have none.
- Schedules are best-effort (GitHub can delay them), and they stop after 60 days without repository activity. The scan's own commits count as activity.
- Search-engine discovery and aggregators (plan items 5–6) are not implemented. Only stable public ATS APIs are used.
## Applied tracking and feedback learning ✅ (pulled forward at the user's request)

- [x] On every job: **Mark applied** (with an editable date), **Not interested** (optional reasons) and a **private note**
- [x] Tabs: To review / Applied / Not interested / All. Records whose job has left the feed stay listed, labelled "No longer listed".
- [x] Stored in IndexedDB (DB v2 migration, new `jobActions` store). Included in encrypted backups (data schema 2; v1 backups still import) and cleared by "Clear data".
- [x] In-browser learning, re-applied to every new scan:
  - "Not interested in this company" hides that company (reversible)
  - "Too senior/junior" demotes that level and beyond
  - "Wrong tech stack / not my kind of role" demotes title words, and Applied promotes them
  - The profile's target seniority demotes roles two or more levels away
  - Every adjustment is shown on the card ("Like roles you applied to: backend"), and a "Learned from your N decisions" panel lists the rules
- [x] Dashboard: real **Applied** count, and the feed shows only undecided jobs, ranked
- Decisions never leave the browser. The GitHub scan never sees them; the learning runs client-side on each new feed.

## Phase 3: matching engine (not started; skill-based fit scoring still to do)
## Phase 4: referral intelligence (not started)
## Phase 5: outreach strategist (not started)
## Phase 6: application management (partly done: applied date + notes; interview/offer stages, status history and follow-ups not started)
## Phase 7: scheduled automation (scheduled scan done in Phase 2; reminders/notifications not started)
## Phase 8: analytics (not started)
## Phase 9: reliability & polish (not started)
