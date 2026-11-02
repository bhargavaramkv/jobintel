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

## Phase 3: matching engine ✅

- [x] Deterministic fit score in the browser (`src/domain/match/score.ts`): skills 30, experience 20, role alignment 20, location/work 10, seniority 10, other 10
- [x] Every factor shows its evidence (matched / missing). A factor with no data on either side is left out of the score, and the card shows the coverage
- [x] Mandatory vs preferred skills: the collector now tags bullets under "preferred / nice to have / bonus" headings (`preferred` in the feed), and bullets saying "a plus" count as preferred
- [x] Skill vocabulary with careful synonyms (`.NET` = ASP.NET Core = dotnet; JavaScript ≠ TypeScript; Java ≠ Kotlin); longer names shadow shorter ones (SQL Server ≠ SQL)
- [x] Score capped at 50 when the profile lists under a third of the required skills
- [x] "Best fit for your profile" sort (default once the profile has skills); dashboard feed ranked by fit too
- [x] Stale ("posted long ago", 60+ days) and similar-posting (same company + title) flags
- [x] Shortlist / un-shortlist on every job, with a Shortlisted tab. Hide = "Not interested"
- [x] Tests: positive, negative and edge cases, determinism, missing data never counted as a match

### Known limitations

- Skill matching is by name. A posting that describes a skill without naming it isn't recognised.
- Years of experience are read from text like "3+ years" or "3–5 yrs"; the largest lower bound wins, which can over-read numbers that aren't requirements.
- Older feed entries have no `preferred` field until the next scan.
## Phase 4: referral intelligence ✅

- [x] Referrals page (`#/referrals`): "Companies to cover" from your pipeline (shortlisted / active applications) and target companies, with lead counts
- [x] "Find people" opens public searches (LinkedIn people search, web search) in a new tab. JobIntel fetches and stores nothing from them
- [x] Leads stored in IndexedDB (DB v3, `contacts` store); included in encrypted backups (data schema 3) and cleared by "Clear data"
- [x] Every lead needs a source URL (http/https). There are no email or phone fields
- [x] Relationships are derived from recorded facts, never typed in: former colleague (overlapping employers, normalised), alumni (overlapping colleges), mutual connection (named introducer + evidence), direct connection (you confirm), recruiter / engineering team (from role)
- [x] Confidence labels: Verified (you confirmed) / Inferred (from overlapping facts) / Unknown. "Worked together" can be confirmed only when an employer overlaps
- [x] Ranking by strength of shared context × confidence, plus pipeline / target-company relevance and matching role area; reasons shown
- [x] Status per lead: new, I know them, I don't know them, contacted, dismissed
- [x] Profile gains optional *Past employers* and *Colleges* (used only for this comparison)

### Known limitations

- Overlapping employers don't prove you overlapped in time or team; such leads stay "Inferred" until you confirm.
- Leads are entered by hand. There is no import from LinkedIn or other networks, by design.
## Phase 5: outreach strategist (not started)
## Phase 6: application management (partly done: applied date + notes; interview/offer stages, status history and follow-ups not started)
## Phase 7: scheduled automation (scheduled scan done in Phase 2; reminders/notifications not started)
## Phase 8: analytics (not started)
## Phase 9: reliability & polish (not started)
