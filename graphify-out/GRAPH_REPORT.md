# Graph Report - jobintel  (2026-11-03)

## Corpus Check
- 0 files · ~0 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1325 nodes · 3330 edges · 71 communities (66 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 116 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Shell and IndexedDB Tests
- AI Context Export
- Scan Workflow (scan.yml)
- Pages Deploy Workflow
- Job Actions and Reuse Map
- Data Privacy and Backup UI
- Referral Leads
- Job Filters and Learning
- AI Result Import
- AI Recommendation Schema
- Routing and Navigation
- Analytics Engine
- Form Field Primitives
- Application Pipeline
- Collector Title Filter and Probe
- Fit Score Factors
- AI Integration Options and Roadmap
- AI Review Lifecycle
- ATS Adapters
- Graph Refresh Workflow
- Collector Scope and Feed Contract
- Outreach Draft Templates
- Collector Tests
- App TypeScript Config
- Feedback Learning
- Match Engine Tests
- Collector TypeScript Config
- AI Assistant Hooks
- Profile Form Conversion
- Outreach Follow-up Policy
- Node TypeScript Config
- AI Apply Rules
- Job Card and Types
- Product Plan Concepts
- Contacts and Reminder Agent
- Agent Guide
- E2E AI and Schedule Tests
- Recovery Runbook
- Navigation Model
- Product Principles
- Data Architecture Decisions
- Test Dependencies
- Outreach Messages
- Agent Docs and Graph Policy
- Readiness Score
- Profile Schema
- AI Privacy Boundaries
- E2E Smoke and Workflow
- Package Manifest
- Outreach Page
- AI Output Safety
- AI Layers and Hand-off
- Dashboard and Backup Features
- Hosting and Discovery Constraints
- NPM Scripts
- Job Feed Loading
- Backup Format and Recovery
- AI Architecture Sections
- Implementation Plan Phases
- Tag Input
- Runtime Dependencies
- Profile Provider
- Vite Build and CSP
- Visual Design System
- Lint Config
- Record Repository Interface
- Favicon Brand
- Root TS Config
- Analytics and Prep Phases
- Claude API (Not Used)
- Phase 1 Shell

## God Nodes (most connected - your core abstractions)
1. `react` - 38 edges
2. `stageOf()` - 30 edges
3. `vitest` - 28 edges
4. `useJobActions()` - 28 edges
5. `lucide-react` - 24 edges
6. `FeedView()` - 23 edges
7. `localDate()` - 22 edges
8. `Composer()` - 21 edges
9. `matchJob()` - 21 edges
10. `JobAction` - 20 edges

## Surprising Connections (you probably didn't know these)
- `Use the knowledge graph first — do NOT read the whole repo` --references--> `main()`  [INFERRED]
  CLAUDE.md → collector/run.ts
- `2. What the existing code gave us (reused as is)` --references--> `withRejected()`  [INFERRED]
  docs/AI_AUTOMATION_ARCHITECTURE.md → src/domain/jobs/actions.ts
- `Where things live (so you can skip exploring)` --references--> `ProfileEditor()`  [INFERRED]
  CLAUDE.md → src/features/profile/ProfilePage.tsx
- `2. What the existing code gave us (reused as is)` --references--> `assessJob()`  [INFERRED]
  docs/AI_AUTOMATION_ARCHITECTURE.md → src/domain/jobs/feedback.ts
- `2. What the existing code gave us (reused as is)` --references--> `createRecordContext()`  [INFERRED]
  docs/AI_AUTOMATION_ARCHITECTURE.md → src/features/shared/recordContext.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AI output safety controls (untrusted-input defenses)** — docs_ai_automation_architecture_action_whitelist, docs_ai_automation_architecture_per_item_validation, docs_ai_automation_architecture_grounding_rule, docs_ai_automation_architecture_live_record_recheck, docs_ai_automation_architecture_review_lifecycle [EXTRACTED 1.00]
- **Roadmap phases that extend the contract via schema v2** — docs_ai_automation_roadmap_a4_company_and_ats_board_discovery, docs_ai_automation_roadmap_a5_referral_research_and_evidence_based_outreach, docs_ai_automation_roadmap_a6_resume_analysis_and_tailoring, docs_ai_automation_roadmap_a7_application_status_from_email, docs_ai_automation_roadmap_schema_v2 [EXTRACTED 1.00]
- **GitHub Actions public job feed pipeline** — docs_implementation_plan_actions_discovery_architecture, docs_implementation_plan_source_registry, docs_implementation_plan_dedup_normalization, docs_implementation_plan_jobs_json_feed, docs_implementation_plan_pages_deployment_workflow [EXTRACTED 1.00]
- **Local-first privacy boundary** — docs_implementation_plan_local_first_personal_data, docs_implementation_plan_indexeddb_storage, docs_implementation_plan_encrypted_backup, docs_implementation_plan_privacy_model, docs_implementation_plan_public_site_privacy_warning [INFERRED 0.85]
- **Phase 1 foundation deliverables** — docs_implementation_plan_app_shell, docs_implementation_plan_dashboard_screen, docs_implementation_plan_profile_screen, docs_implementation_plan_profile_readiness, docs_implementation_plan_color_tokens [INFERRED 0.85]
- **Public-site guards against leaking data or calling AI services** — docs_security_content_security_policy, docs_security_no_secrets_in_bundle, readme_check_dist, docs_ai_automation_architecture_privacy_boundaries [INFERRED 0.85]

## Communities (71 total, 5 thin omitted)

### Community 0 - "App Shell and IndexedDB Tests"
Cohesion: 0.05
Nodes (51): IndexedDB storage with append-only migrations, fake-indexeddb, @testing-library/react, @testing-library/user-event, vitest, App(), renderAt(), createAppRouter() (+43 more)

### Community 1 - "AI Context Export"
Cohesion: 0.07
Nodes (48): 3. Architecture, Allowlist context export (buildAiContext), The contract (schema v1), The six layers, AiContextBundle, applicationEntry(), approxTokens(), buildAiContext() (+40 more)

### Community 2 - "Scan Workflow (scan.yml)"
Cohesion: 0.05
Nodes (46): if, needs, permissions, runs-on, steps, concurrency, cancel-in-progress, group (+38 more)

### Community 3 - "Pages Deploy Workflow"
Cohesion: 0.05
Nodes (43): concurrency, cancel-in-progress, group, environment, if, needs, permissions, runs-on (+35 more)

### Community 4 - "Job Actions and Reuse Map"
Cohesion: 0.09
Nodes (34): 2. What the existing code gave us (reused as is), ApplicationDetails, base(), Decision, DECISIONS, hasContent(), Interview, INTERVIEW_KINDS (+26 more)

### Community 5 - "Data Privacy and Backup UI"
Cohesion: 0.11
Nodes (31): useAiExports(), ClearDialog(), DataPrivacySection(), DataPrivacySectionProps, ExportDialog(), ImportDialog(), downloadJson(), b64() (+23 more)

### Community 6 - "Referral Leads"
Cohesion: 0.11
Nodes (31): DraftInput, CompanyFocus, Confidence, Contact, CONTACT_LIMITS, contactSchema, httpUrl, LEAD_STATUSES (+23 more)

### Community 7 - "Job Filters and Learning"
Cohesion: 0.10
Nodes (33): citiesIn(), describeLearning(), hasSignals(), targetLevels(), applyFilters(), DEFAULT_FILTERS, feedFreshness(), fitsPreferences() (+25 more)

### Community 8 - "AI Result Import"
Cohesion: 0.12
Nodes (32): describe(), extractJson(), fail(), ImportReview, LocalFacts, parseAiResult(), ParsedAiResult, ParseOutcome (+24 more)

### Community 9 - "AI Recommendation Schema"
Cohesion: 0.07
Nodes (28): ACTION_TYPES, ActionType, AiResult, briefingPrioritySchema, briefingShape, Checkable, confidence, Evidence (+20 more)

### Community 10 - "Routing and Navigation"
Cohesion: 0.12
Nodes (18): react-router-dom, NAV_ITEMS, routes, APP_VERSION, AppShell(), Command, CommandPalette(), COMMANDS (+10 more)

### Community 11 - "Analytics Engine"
Cohesion: 0.18
Nodes (25): applicationsCsv(), byCompany(), CompanyRow, funnel(), FunnelStep, Metric, OutreachStats, outreachStats() (+17 more)

### Community 12 - "Form Field Primitives"
Cohesion: 0.12
Nodes (24): ChoiceGroup(), ChoiceGroupProps, FieldShell(), FieldShellProps, TextAreaField(), TextAreaFieldProps, TextFieldProps, COMPANY_TYPES (+16 more)

### Community 13 - "Application Pipeline"
Cohesion: 0.20
Nodes (23): TextField(), applicationsOf(), dueApplicationFollowUps(), findDuplicate(), FollowUp, groupByStage(), manualRef(), norm() (+15 more)

### Community 14 - "Collector Title Filter and Probe"
Cohesion: 0.12
Nodes (23): opts(), makeTitleFilter(), TitleFilter, toRegex(), args, config, fetcher, keep (+15 more)

### Community 15 - "Fit Score Factors"
Cohesion: 0.13
Nodes (26): Explained fit score (6 weighted factors), LEVELS, BAND_LABEL, cap(), experienceFactor(), factor(), FactorId, FactorResult (+18 more)

### Community 16 - "AI Integration Options and Roadmap"
Cohesion: 0.11
Nodes (24): Claude Code Routines / scheduled tasks, Claude connectors (Gmail/Calendar/Drive), Subscription token (claude setup-token, CLAUDE_CODE_OAUTH_TOKEN), A1 — Foundation ✅, A2: Local scheduled runs, A3 — Cloud scheduled tasks for the daily briefing, A4 — Company and ATS-board discovery, A5 — Referral research and evidence-based outreach (+16 more)

### Community 17 - "AI Review Lifecycle"
Cohesion: 0.16
Nodes (20): ApplyPlan, ALLOWED, canTransition(), isPending(), PRIORITY_RANK, sortInbox(), STATUS_HINT, STATUS_LABEL (+12 more)

### Community 18 - "ATS Adapters"
Cohesion: 0.21
Nodes (21): apiUrl(), arr(), Fetcher, fetchSource(), obj(), parseAshby(), parseGreenhouse(), parseLever() (+13 more)

### Community 19 - "Graph Refresh Workflow"
Cohesion: 0.09
Nodes (22): concurrency, cancel-in-progress, group, jobs, refresh, name, on, push (+14 more)

### Community 20 - "Collector Scope and Feed Contract"
Cohesion: 0.13
Nodes (18): LocationInfo, MergeOptions, Feed contract (feedSchema shared by collector and app), CITY_ORDER, CITY_PATTERNS, City, CITY_VALUES, FEED_FORMAT_VERSION (+10 more)

### Community 21 - "Outreach Draft Templates"
Cohesion: 0.14
Nodes (20): aboutMe(), allowedStrategies(), askLine(), contextLine(), Draft, DraftJob, firstName(), FOLLOW_UP_AFTER_DAYS (+12 more)

### Community 22 - "Collector Tests"
Cohesion: 0.17
Nodes (14): RawJob, ASHBY, GH, LEVER, sourceA, sourceB, classifyLocations(), normalizeWorkMode() (+6 more)

### Community 23 - "App TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 24 - "Feedback Learning"
Cohesion: 0.19
Nodes (17): Read-time learning from decisions, Applied tracking and feedback learning (in-browser re-ranking), refOf(), snapshotOf(), withRejected(), assessJob(), clamp(), Learned (+9 more)

### Community 25 - "Match Engine Tests"
Cohesion: 0.19
Nodes (16): bandOf(), jobSkills(), splitRequirements(), backendJob, dev, aliasRegex(), blank(), BY_ALIAS (+8 more)

### Community 26 - "Collector TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 27 - "AI Assistant Hooks"
Cohesion: 0.27
Nodes (13): react, countByStatus(), latestBriefing(), useAiBriefings(), useAiRecommendations(), AiDashboardPanel(), AssistantPage(), isTab() (+5 more)

### Community 28 - "Profile Form Conversion"
Cohesion: 0.18
Nodes (16): ProfilePreferences, draftFromProfile(), DraftResult, draftsEqual(), NumberParse, optionalText(), parseOptionalNumber(), ProfileDraft (+8 more)

### Community 29 - "Outreach Follow-up Policy"
Cohesion: 0.19
Nodes (14): Follow-up limit (2, a week apart, none after reply), Outreach drafts (copy-only, never sent), addDays(), FollowUpState, followUpState(), job, lead(), me (+6 more)

### Community 30 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 31 - "AI Apply Rules"
Cohesion: 0.19
Nodes (12): ApplyContext, planApply(), refFor(), refuse(), ctx(), job, now, plan() (+4 more)

### Community 32 - "Job Card and Types"
Cohesion: 0.23
Nodes (14): Assessment, ATS_LABEL, Job, relativeTime(), MatchResult, formatDay(), JobCard(), JobCardProps (+6 more)

### Community 33 - "Product Plan Concepts"
Cohesion: 0.22
Nodes (15): Application status lifecycle, Normalization and deduplication, Delivery roadmap (Phases 0-9), Initial discovery configuration target, Product navigation and information architecture, Phase 2 - Job discovery engine, Phase 3 - Job intelligence and matching engine, Phase 4 - Referral intelligence (+7 more)

### Community 34 - "Contacts and Reminder Agent"
Cohesion: 0.34
Nodes (9): localDate(), useContacts(), ReminderAgent(), RemindersPanel(), notificationsSupported(), useReminderSummary(), readUiPreference(), UiPreferenceKey (+1 more)

### Community 35 - "Agent Guide"
Cohesion: 0.19
Nodes (10): JobIntel — agent guide, Project rules that are not derivable from code, Use the knowledge graph first — do NOT read the whole repo, Where things live (so you can skip exploring), DashboardPage(), Kpi, RadarGraphic(), greetingFor() (+2 more)

### Community 36 - "E2E AI and Schedule Tests"
Cohesion: 0.16
Nodes (7): ReminderAgent, GitHub Actions least-privilege permissions, nextScheduledScan(), SCAN_TIMES_UTC, scheduleCron(), Phase 7: scheduled automation & reminders, scan-failure issue alert

### Community 37 - "Recovery Runbook"
Cohesion: 0.14
Nodes (13): Import says "newer JobIntel" / unsupported version, Procedure: local data shows an error after update, Local data shows an error after an update, My data is gone (new browser, cleared site data, new device), Procedure: backup from newer JobIntel version, Probe and fix failing board (collector/probe.ts), Recovery guide, Scheduled workflows stop after 60 days inactivity (+5 more)

### Community 38 - "Navigation Model"
Cohesion: 0.21
Nodes (11): lucide-react, isProfileSection(), NavItem, PROFILE_SECTIONS, ProfileSectionId, DraftErrors, Notice, EditorProps (+3 more)

### Community 39 - "Product Principles"
Cohesion: 0.15
Nodes (13): Analytics metrics and honesty requirements, Candidate profile assumptions, Core product principles, Cost-conscious (free feeds, no paid APIs), Evidence over guesses, Human approval for external actions, Local-first personal data, Automation without secrets in the browser (+5 more)

### Community 40 - "Data Architecture Decisions"
Cohesion: 0.23
Nodes (13): CandidateProfile data schema, IndexedDB typed repository storage, Public jobs.json feed (public/data/jobs.json), localStorage for UI preferences only, Deterministic match score weights, GitHub Actions Pages deployment workflow (pages.yml), React + TypeScript + Vite SPA, Recommended stack (+5 more)

### Community 41 - "Test Dependencies"
Cohesion: 0.15
Nodes (13): devDependencies, fake-indexeddb@^6.2.7, jsdom@^30.1.3, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/node@^24.19.2, @types/react@^19.3.0, typescript@~7.0.2 (+5 more)

### Community 42 - "Outreach Messages"
Cohesion: 0.21
Nodes (10): Channel, CHANNELS, CHANNEL_IDS, isoDay, MESSAGE_MAX, OutreachMessage, outreachMessageSchema, Provider (+2 more)

### Community 43 - "Agent Docs and Graph Policy"
Cohesion: 0.36
Nodes (6): graph.yml workflow, AI automation roadmap, JobIntel architecture (v0.9), JobIntel README, RecordContextValue, TODO implementation status

### Community 44 - "Readiness Score"
Cohesion: 0.17
Nodes (10): Readiness score weighted checklist, Profile readiness score, calculateReadiness(), CHECKLIST_GROUPS, ChecklistGroupId, MIN_PRIMARY_SKILLS, Readiness, READINESS_RULES (+2 more)

### Community 45 - "Profile Schema"
Cohesion: 0.17
Nodes (10): Compensation, compensationSchema, Proficiency, PROFILE_ID, SENIORITY_OPTIONS, shortText, skillList, skillSchema (+2 more)

### Community 46 - "AI Privacy Boundaries"
Cohesion: 0.18
Nodes (10): Consent log and context ids, Exact-bytes preview and per-export consent, AI privacy boundaries (default-off and never-exported fields), Content-Security-Policy (connect-src 'self'), npm run check:dist, DIST, indexHtml, SECRET_PATTERNS (+2 more)

### Community 47 - "E2E Smoke and Workflow"
Cohesion: 0.18
Nodes (5): PAGES, @axe-core/playwright@^4.14.0, @playwright/test@^1.64.1, @axe-core/playwright, @playwright/test

### Community 48 - "Package Manifest"
Cohesion: 0.18
Nodes (10): oxlint@^1.89.0, @testing-library/jest-dom@^7.0.1, @types/react-dom@^19.3.0, name, private, type, version, oxlint (+2 more)

### Community 49 - "Outreach Page"
Cohesion: 0.40
Nodes (9): followUpDraft(), newMessageId(), useOutreach(), Composer(), HistoryItem(), norm(), nowIso(), OutreachPage() (+1 more)

### Community 50 - "AI Output Safety"
Cohesion: 0.22
Nodes (7): Four-action whitelist (shortlist, not-interested, add-note, set-follow-up), Grounding rule (external-only evidence capped at 0.5 confidence), Accept re-checks live record (planApply), Partial import with per-item validation, Prompt injection via job description, jobintel-ai-result schema v1 contract, Threat model for AI output

### Community 51 - "AI Layers and Hand-off"
Cohesion: 0.22
Nodes (5): Review lifecycle, Six AI layers (collect, context, analysis, recommendations, approval, persistence), No secrets in the bundle, AI Assistant (A1), pages.yml GitHub Pages deployment

### Community 52 - "Dashboard and Backup Features"
Cohesion: 0.24
Nodes (10): Route-level code splitting (React Router lazy), Dashboard screen, Encrypted backup export/import (Web Crypto AES-GCM + PBKDF2), Dashboard KPI strip, Phase 0 - Repository and architecture verification, Phase 1 - Static app shell, dark UX, local profile, Phase 9 - Reliability, security and polish, Profile readiness / completion score (+2 more)

### Community 53 - "Hosting and Discovery Constraints"
Cohesion: 0.24
Nodes (10): Job-discovery architecture on GitHub Actions, GitHub Actions schedule trade-offs, Definition of success, GitHub Pages architecture constraints, React Router HashRouter, Explicit non-goals (no backend, no LinkedIn scraper, no auto-send), Official GitHub references, GitHub Pages-compatible approach mapping (+2 more)

### Community 54 - "NPM Scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check:dist, dev, lint, preview, test, test:e2e (+2 more)

### Community 55 - "Job Feed Loading"
Cohesion: 0.33
Nodes (8): feedSchema, JobFeed, FeedState, feedUrl(), JobFeedContext, JobFeedContextValue, loadFeed(), JobFeedProvider()

### Community 56 - "Backup Format and Recovery"
Cohesion: 0.22
Nodes (7): Backup file format v1 (jobintel-backup), Procedure: data gone, restore from encrypted backup, index.html (Vite entry), favicon.svg, no-referrer meta policy, Encrypted backups (AES-256-GCM, PBKDF2 600k), JobIntel (local-first job-search workspace)

### Community 57 - "AI Architecture Sections"
Cohesion: 0.22
Nodes (9): 1. Summary, 4. Privacy boundaries, 5. Threat model for AI output, 6. Integration options, limits and cost, 7. Where I departed from the brief's assumptions, 8. Smallest viable implementation (what A1 includes and excludes), 9. Test map, AI automation: architecture (Phase A1) (+1 more)

### Community 58 - "Implementation Plan Phases"
Cohesion: 0.22
Nodes (9): JobIntel Product, UX & Implementation Plan, Development workflow and guardrails, Phase 1 end-of-phase report, Phase 1 acceptance checklist, Phase 1 explicit non-goals, Phase 1 implementation specification, Product vision (optimize for relevant interviews), UX_SPEC.md (+1 more)

### Community 59 - "Tag Input"
Cohesion: 0.44
Nodes (6): TagInput(), TagInputProps, LIMITS, splitTagInput(), TagResult, validateTag()

### Community 60 - "Runtime Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, lucide-react@^1.66.0, react@^19.3.1, react-dom@^19.3.1, react-router-dom@^7.18.5, zod@^4.6.7, react-dom, zod

### Community 61 - "Profile Provider"
Cohesion: 0.46
Nodes (6): CandidateProfile, ProfileProvider(), LoadState, ProfileContext, ProfileContextValue, clearUiPreferences()

### Community 62 - "Vite Build and CSP"
Cohesion: 0.29
Nodes (5): vite@^8.3.5, @vitejs/plugin-react@^6.1.2, vite, @vitejs/plugin-react, CSP

### Community 63 - "Visual Design System"
Cohesion: 0.40
Nodes (6): Core application shell (header and sidebar), CSS color tokens, Interaction and accessibility details, Layout and responsive behavior, Approved visual direction (dark-only blue/cyan), Dark color-scheme and theme-color #070B12

### Community 64 - "Lint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 66 - "Favicon Brand"
Cohesion: 0.67
Nodes (3): JobIntel browser tab / app favicon, Favicon dark navy and cyan-blue brand palette, JobIntel Favicon Logo (stylized J on dark rounded square)

## Knowledge Gaps
- **43 isolated node(s):** `Probe and fix failing board (collector/probe.ts)`, `Scheduled workflows stop after 60 days inactivity`, `Explicit non-goals (no backend, no LinkedIn scraper, no auto-send)`, `GitHub Pages-compatible approach mapping`, `Application status lifecycle` (+38 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 470 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Phase 9 - Reliability, security and polish` connect `Dashboard and Backup Features` to `Product Plan Concepts`, `Agent Docs and Graph Policy`, `AI Privacy Boundaries`?**
  _High betweenness centrality (0.048) - this node is a cross-community bridge._
- **What connects `Probe and fix failing board (collector/probe.ts)`, `Scheduled workflows stop after 60 days inactivity`, `Explicit non-goals (no backend, no LinkedIn scraper, no auto-send)` to the rest of the system?**
  _43 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell and IndexedDB Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.05493133583021224 - nodes in this community are weakly interconnected._
- **Why does `react` connect `AI Assistant Hooks` to `App Shell and IndexedDB Tests`, `AI Context Export`, `Job Actions and Reuse Map`, `Data Privacy and Backup UI`, `Referral Leads`, `Job Filters and Learning`, `AI Result Import`, `Routing and Navigation`, `Analytics Engine`, `Form Field Primitives`, `Application Pipeline`, `AI Review Lifecycle`, `Job Card and Types`, `Contacts and Reminder Agent`, `Agent Guide`, `Navigation Model`, `Agent Docs and Graph Policy`, `Package Manifest`, `Outreach Page`, `Job Feed Loading`, `Tag Input`, `Runtime Dependencies`, `Profile Provider`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Should `AI Context Export` be split into smaller, more focused modules?**
  _Cohesion score 0.06862745098039216 - nodes in this community are weakly interconnected._
- **Why does `JobIntel architecture (v0.9)` connect `Agent Docs and Graph Policy` to `App Shell and IndexedDB Tests`, `E2E AI and Schedule Tests`, `AI Recommendation Schema`, `Analytics Engine`, `Application Pipeline`, `AI Privacy Boundaries`, `Fit Score Factors`, `Outreach Draft Templates`, `Match Engine Tests`, `AI Apply Rules`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Should `Scan Workflow (scan.yml)` be split into smaller, more focused modules?**
  _Cohesion score 0.04717853839037928 - nodes in this community are weakly interconnected._