# Implementation status

All planned phases (1–9) are implemented. See `docs/SECURITY.md` and `docs/RECOVERY.md`.

## V2 Phase 1: UI revamp (prototype)

Status: Prototype (mock data, simulated agent). Design and routes: `docs/UI_V2.md`. Rollback point: git tag `ui-v1-final` (= `a44d84d`).
The A-track UI (inbox, sync) is retired from the UI while its domain code is kept.

- [x] Dashboard
- [x] Onboarding
- [x] Resumes
- [x] Discovery
- [x] Applications
- [x] Activity
- [x] Settings

## AI automation (separate track, A1–A8)

Design: `docs/AI_AUTOMATION_ARCHITECTURE.md`. Plan and gates: `docs/AI_AUTOMATION_ROADMAP.md`.
Numbered A1–A8 so they don't collide with phases 1–9 below.

| Phase | Capability | Status |
|---|---|---|
| A1 | AI foundation: consented context export, schema v1, recommendation inbox, daily briefing | ✅ Implemented |
| A2 | Scheduled runs without typing anything | ✅ Implemented as part of A3 (a cloud routine runs even with the laptop closed) |
| A3 | Automated loop: browser ⇄ private repo ⇄ daily Claude routine, auto-import, auto-apply low-risk | ✅ Implemented |
| A4 | Company and ATS-board discovery with automatic verification and merge | ✅ Implemented |
| A5 | Referral research (lead proposals with public sources) | ✅ Implemented |
| A6 | Stored resume + job-specific resume suggestions | ✅ Implemented |
| A7 | Application status from email (forward stage proposals with quoted evidence) | ✅ Implemented; activates when a Gmail connector is connected in claude.ai |
| A8 | Interview prep plans | ✅ Implemented |

### A2–A8: automation ✅

- [x] **Automation** tab: connect a private GitHub repo once (fine-grained token, stored only in this browser, never in backups). JobIntel refuses to sync to a public repository
- [x] Auto-sync while the app is open: the context export (same switches and consent as manual export) and the stored resume are pushed when they change, at most every 30 minutes
- [x] Auto-import: results written by the daily routine are pulled, validated and added to the inbox; the briefing updates by itself
- [x] Auto-apply only notes and follow-up dates (confidence ≥ 0.6, switchable); everything else waits for one click, and **Accept all ready** handles a whole day at once
- [x] Daily Claude routine (08:30 IST) on the owner's subscription; instructions live in the private repo's `docs/daily-routine.md`; it validates its own output with `scripts/validate-ai-result.ts`
- [x] Schema v2 (v1 still accepted): kinds `resume-suggestion`, `lead-proposal`, `prep-plan`, `application-update`; actions `add-lead` (needs a public source; never asserts a relationship) and `set-stage` (forward only)
- [x] Discovery: the routine proposes boards on `claude/sources-*`; `auto-sources.yml` merges only additions to `collector/sources.json` that `collector/verify-sources.ts` confirms list engineering roles in Bengaluru/Hyderabad
- [x] Roles outside the tracked boards (LinkedIn, Naukri, careers pages): the routine proposes them with `track-job`; accepting adds a shortlisted manual entry with the posting link. This replaced the separate twice-daily "Job listings digest" routine
- [x] IndexedDB v6 (`aiSettings`), data schema 6; older backups restore
- [x] CSP `connect-src` now allows `https://api.github.com` (used only for the optional sync)

#### Known limitations

- Sync runs only while JobIntel is open in a browser; the routine itself runs daily regardless and uses the last synced context.
- A7 needs a Gmail connector connected at claude.ai/customize/connectors; until then the routine skips email.
- The token is kept in IndexedDB in plain form, like the rest of the local data. Use a fine-grained token scoped to the one private repo.

### A1: AI foundation ✅

- [x] **Assistant** page (`#/assistant`): Daily briefing, Recommendations, Export & import
- [x] Context export by **allowlist** with switches. Sensitive items (name, employers, schools, compensation, private notes, lead names) are off by default; message text, lead links/notes and files are never exported
- [x] **Preview of the exact file** (bytes, approximate tokens) and a **consent tick for every export**; any change to what is shared resets it; exports are logged as counts only
- [x] Hand-off is manual by design: download the file or copy it as a chat prompt and give it to Claude on your own subscription. JobIntel never contacts Claude and holds no API key
- [x] Versioned result schema (`jobintel-ai-result` v1), validated with Zod: evidence and confidence required, a four-action whitelist (shortlist, not-interested, add-note, set-follow-up), no send or submit action
- [x] Tolerant import (code fences, surrounding prose) with **per-item validation**: valid items are kept, rejected ones are listed with reasons, and nothing is stored until you confirm
- [x] Import warnings for unknown exports, stale or future-dated results, unknown job ids, and already-imported items (re-import never resets your decisions)
- [x] **Recommendation inbox** with visible states: Generated → Reviewed → Accepted / Rejected (text label plus dot, counts in the header)
- [x] Accept applies one change through the existing job-action helpers and **re-checks the live record**, so a stale suggestion can't overwrite a newer decision
- [x] AI daily briefing view and a dashboard panel (latest headline, recommendations to review)
- [x] IndexedDB v5 (`aiRecommendations`, `aiBriefings`, `aiExports`), data schema 5. Older backups (schemas 1–4) still restore; AI data is in encrypted backups and cleared by "Clear data"
- [x] `check:dist` fails on an AI API host or on AI field/format names in public `data/`
- [x] Tests: privacy (sentinel strings), schema and malformed output, apply rules, lifecycle, migration, backup compatibility, UI flow, and an end-to-end run with zero external requests

#### Known limitations

- The manual hand-off remains available under *Manual export & import*; automation (A3) removes the need for it.
- Recommendations never edit the profile; schema v2 adds leads and forward-only stage changes.

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
## Phase 5: outreach strategist ✅

- [x] Outreach page (`#/outreach`, also "Draft outreach" on each lead): context panel with relationships, evidence, approach and job fit
- [x] Strategies chosen from the evidence: direct connection / confirmed colleague ask for a referral; shared employer, alumni, mutual connection and cold contacts ask for advice first; recruiters get a role-focused note
- [x] Overrides limited to strategies the facts support (`allowedStrategies`), so a draft can never claim a relationship you didn't record
- [x] LinkedIn connection note (300-char limit enforced with a warning), LinkedIn message and email (with subject); concise / warm / formal tones
- [x] Drafts are editable; "Facts this draft uses" lists every fact; warnings when profile details are missing
- [x] Copy to clipboard; nothing is ever sent. "I sent it" logs the message with a date, marks the lead contacted, and moves a shortlisted job to "Referral requested" when the draft asked for one
- [x] Message history per person, "They replied", saved drafts
- [x] Follow-up policy: at most 2 follow-ups, 7 days apart, none after a reply. Due follow-ups listed on the page and counted on the dashboard
- [x] Stored in IndexedDB (DB v4, `outreach` store); in encrypted backups (data schema 4)

### Known limitations

- Drafts are templates, not AI-written text. Edit them so they sound like you.
- Replies are logged by hand; JobIntel can't see your inbox.
## Phase 6: application management ✅

- [x] Applications page (`#/applications`) with a pipeline summary: Shortlisted → Referral requested → Referred → Applied → Interviewing → Offer / Rejected by company / Withdrawn
- [x] Stage changes append to a status history (never rewritten); a timeline per application
- [x] Per application: applied date, next action, follow-up date, resume version label, linked referral contacts, interviews (date, type, outcome, note), rejection/feedback notes
- [x] "Needs attention": overdue follow-ups and upcoming interviews; counted in the dashboard Follow-ups KPI
- [x] Manual applications for jobs outside the feed (`manual:` ids)
- [x] Duplicate prevention: one record per job id, and an active application with the same company + title (case/brackets ignored) blocks a manual entry and asks before shortlisting/applying to a reposted job
- [x] Applications live in the existing `jobActions` records (new optional fields), so they're in encrypted backups and old records still validate (legacy "applied" counts as the Applied stage)

### Known limitations

- Resume files aren't stored, only a version label.
## Phase 7: scheduled automation & reminders ✅

- [x] Scheduled scans three times a day plus manual dispatch (from Phase 2). A failed scan writes nothing, so the last good feed stays live
- [x] Scan log: each successful scan prepends a summary (sources OK/failed, open, new, closed) to `recentScans` in the feed (last 20), shown under *Sources* on Job Discovery
- [x] Run summary on the Actions page (`$GITHUB_STEP_SUMMARY`) listing failed sources
- [x] Failure alerts: a failed scan or deploy opens (or comments on) one `scan-failure` issue, which notifies the owner; the next good run closes it
- [x] In-app freshness plus "next scan around …" (from `src/domain/jobs/schedule.ts`; a test keeps it in sync with `scan.yml`)
- [x] "Today" panel on the dashboard: interviews today, application and outreach follow-ups due
- [x] Optional browser reminders while the app is open: one notification a day at most, only with permission, stored preference only (no record content in localStorage)

### Known limitations

- Reminders can't fire while the tab is closed; a static site has no background process or push server.
- The cron stays in UTC (equivalent IST times are documented) rather than the newer `timezone:` key, so an
  unsupported key can never silently stop the scans.
## Phase 8: analytics ✅

- [x] Analytics page (`#/analytics`), computed in the browser from your records only; no benchmarks
- [x] Funnel from status history: open jobs → shortlisted/applied → applied → company responded → interviewed → offer, with step conversion
- [x] Referrals & outreach: messages sent, people contacted, replies, recruiter replies, referral requests, confirmed referrals, reply rate
- [x] By-company table (applied, responded, interviews, offers, rejections, response rate with n)
- [x] Time to response (median days from applied to first company response) and applications still waiting
- [x] Repeated skill gaps across relevant jobs (pipeline + open jobs with at least a partial fit)
- [x] Recommendations, each with its evidence and records; group comparisons are labelled "Correlation", not cause; small-sample warnings below 5 applications
- [x] Every number expands to the records behind it; CSV export only on request
- [x] Mobile bottom navigation fits all seven areas
## Phase 9: reliability, security & polish ✅

- [x] Security & privacy review: `docs/SECURITY.md`
- [x] Content-Security-Policy meta tag on the production build; `check:dist` requires it and E2E fails on CSP violations
- [x] `check:dist` also rejects any private field name (leads, applications, outreach, new profile fields) in public data
- [x] Dependency audit: `npm audit` clean
- [x] Accessibility: axe-core (WCAG 2 A/AA) on every screen at desktop, tablet and mobile widths in E2E; fixed in-text links that relied on colour alone
- [x] Full-workflow E2E: shortlist → referral lead → outreach → application → analytics → encrypted backup → clear → restore
- [x] Performance: screens other than the dashboard load on first visit (route-level code splitting); no chunk-size warning
- [x] Workflow failure alerts (Phase 7) and recovery instructions: `docs/RECOVERY.md`, including supported browsers
- [x] Mobile navigation fits all seven areas
