# Graph Report - jobintel  (2026-11-03)

## Corpus Check
- 125 files · ~215,123 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: .css 10, (none) 3)

## Summary
- 1122 nodes · 2743 edges · 52 communities (51 shown, 1 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 0% AMBIGUOUS · INFERRED: 253 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `7fbd0adb`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App.test.tsx
- Outreach Drafts
- Scan Workflow
- Pages Deploy Workflow
- Form UI Components
- Referral Contacts
- DashboardPage.tsx
- Job Match Scoring
- Collector Fetch & Filters
- Analytics
- Agent Guide: Rules & CI
- form.ts
- Discovery Architecture & Roadmap
- Decisions and learning (jobActions, feedback.ts)
- Product Plan & Specs
- Applications Pipeline
- Architecture Decisions & Backup
- Collector Types & Tests
- Graph Refresh Workflow
- Agent Guide: Repo Layout
- Security and privacy review (Phase 9)
- actions.ts
- Dev Dependencies
- Backup Crypto
- Feed Schema
- App tsconfig
- ATS Adapters
- Collector tsconfig
- react
- Job Assessment Types
- Profile Navigation
- Node tsconfig
- LeadForm.tsx
- Profile Readiness
- db.ts
- App Shell & Providers
- Reminders
- lucide-react
- Knowledge-graph-first workflow
- Feedback Learning
- E2E Tests
- npm Scripts
- helpers.ts
- Visual Design & Shell
- Runtime Dependencies
- Test Libraries
- Vite Build
- Oxlint Config
- Plan Overview & Phase 1
- CLAUDE.md Guide
- Favicon Brand
- Root tsconfig

## God Nodes (most connected - your core abstractions)
1. `react` - 31 edges
2. `DashboardPage()` - 30 edges
3. `stageOf()` - 29 edges
4. `FeedView()` - 23 edges
5. `useProfile()` - 23 edges
6. `Security and privacy review (Phase 9)` - 23 edges
7. `useJobActions()` - 22 edges
8. `JobIntel overview (README)` - 22 edges
9. `vitest` - 21 edges
10. `Composer()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Use the knowledge graph first — do NOT read the whole repo` --references--> `main()`  [INFERRED]
  CLAUDE.md → collector/run.ts
- `Where things live (so you can skip exploring)` --references--> `ProfileEditor()`  [INFERRED]
  CLAUDE.md → src/features/profile/ProfilePage.tsx
- `Decisions and learning (jobActions, feedback.ts)` --semantically_similar_to--> `In-browser learning from decisions`  [INFERRED] [semantically similar]
  docs/ARCHITECTURE.md → TODO.md
- `Where things live (so you can skip exploring)` --references--> `DashboardPage()`  [INFERRED]
  CLAUDE.md → src/features/dashboard/DashboardPage.tsx
- `Where things live (so you can skip exploring)` --references--> `FeedView()`  [INFERRED]
  CLAUDE.md → src/features/jobs/JobsPage.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Knowledge graph first and freshness workflow** — claude_graph_first, claude_graph_freshness_rules, claude_ci_graph_refresh, claude_doc_change_graph_update [EXTRACTED 1.00]
- **GitHub Actions public job feed pipeline** — docs_implementation_plan_actions_discovery_architecture, docs_implementation_plan_source_registry, docs_implementation_plan_dedup_normalization, docs_implementation_plan_jobs_json_feed, docs_implementation_plan_pages_deployment_workflow [EXTRACTED 1.00]
- **Job feed scan, deploy and failure alert flow** — docs_architecture_job_discovery_pipeline, docs_architecture_feed_contract, docs_architecture_deployment_chaining, todo_scan_failure_alerts, docs_recovery_stale_feed [INFERRED 0.85]
- **Local-first privacy, encrypted backup and recovery flow** — readme_privacy_model, docs_architecture_backup_file_format, docs_security_backups, docs_recovery_data_gone [INFERRED 0.85]
- **Local-first privacy boundary** — docs_implementation_plan_local_first_personal_data, docs_implementation_plan_indexeddb_storage, docs_implementation_plan_encrypted_backup, docs_implementation_plan_privacy_model, docs_implementation_plan_public_site_privacy_warning [INFERRED 0.85]
- **Phase 1 foundation deliverables** — docs_implementation_plan_app_shell, docs_implementation_plan_dashboard_screen, docs_implementation_plan_profile_screen, docs_implementation_plan_profile_readiness, docs_implementation_plan_color_tokens [INFERRED 0.85]

## Communities (52 total, 1 thin omitted)

### Community 0 - "App.test.tsx"
Cohesion: 0.15
Nodes (22): vitest, feedRef, t, base(), jobActionSchema, pushHistory(), refOf(), ref (+14 more)

### Community 1 - "Outreach Drafts"
Cohesion: 0.06
Nodes (58): aboutMe(), addDays(), allowedStrategies(), askLine(), Channel, CHANNELS, contextLine(), Draft (+50 more)

### Community 2 - "Scan Workflow"
Cohesion: 0.05
Nodes (46): if, needs, permissions, runs-on, steps, concurrency, cancel-in-progress, group (+38 more)

### Community 3 - "Pages Deploy Workflow"
Cohesion: 0.05
Nodes (43): concurrency, cancel-in-progress, group, environment, if, needs, permissions, runs-on (+35 more)

### Community 4 - "Form UI Components"
Cohesion: 0.11
Nodes (24): TagInput(), TagInputProps, COMPANY_TYPES, Compensation, compensationSchema, LIMITS, PROFICIENCIES, Proficiency (+16 more)

### Community 5 - "Referral Contacts"
Cohesion: 0.13
Nodes (22): CompanyFocus, Confidence, CONTACT_LIMITS, contactSchema, httpUrl, LEAD_STATUSES, LeadRank, LeadStatus (+14 more)

### Community 6 - "DashboardPage.tsx"
Cohesion: 0.06
Nodes (55): Where things live (so you can skip exploring), LocationInfo, DIST, indexHtml, SECRET_PATTERNS, TRACKER_PATTERNS, walk(), useNow() (+47 more)

### Community 7 - "Job Match Scoring"
Cohesion: 0.09
Nodes (41): fitsPreferences(), bandOf(), cap(), experienceFactor(), factor(), FactorId, FactorResult, FACTORS (+33 more)

### Community 8 - "Collector Fetch & Filters"
Cohesion: 0.12
Nodes (25): apiUrl(), fetchSource(), opts(), makeTitleFilter(), TitleFilter, toRegex(), args, config (+17 more)

### Community 9 - "Analytics"
Cohesion: 0.18
Nodes (25): applicationsCsv(), byCompany(), CompanyRow, funnel(), FunnelStep, Metric, OutreachStats, outreachStats() (+17 more)

### Community 10 - "Agent Guide: Rules & CI"
Cohesion: 0.13
Nodes (24): Rule: collector scope Bengaluru + Hyderabad, all work modes, Rule: feed contract changed in one place, Project rules not derivable from code, Rule: TODO.md is the source of truth for status, Automation and reminders (recentScans, alert job, ReminderAgent), Duplicate keys (ats:board:sourceId, company+title+city), Collector never reads profile data, Feed contract feedSchema.ts shared by collector and app (+16 more)

### Community 11 - "form.ts"
Cohesion: 0.19
Nodes (14): DraftErrors, DraftResult, NumberParse, optionalText(), parseOptionalNumber(), ProfileDraft, profileFromDraft(), base (+6 more)

### Community 12 - "Discovery Architecture & Roadmap"
Cohesion: 0.08
Nodes (40): Job-discovery architecture on GitHub Actions, GitHub Actions schedule trade-offs, Candidate profile assumptions, CandidateProfile data schema, Normalization and deduplication, Definition of success, Delivery roadmap (Phases 0-9), Initial discovery configuration target (+32 more)

### Community 13 - "Decisions and learning (jobActions, feedback.ts)"
Cohesion: 0.36
Nodes (8): Decisions and learning (jobActions, feedback.ts), Matching engine (skills.ts, score.ts), Applied tracking and feedback learning (README), Matching and fit score (README), Applied tracking and feedback learning, In-browser learning from decisions, IndexedDB schema versions v1-v4 and backup schema 2-4, Phase 3: matching engine

### Community 14 - "Product Plan & Specs"
Cohesion: 0.12
Nodes (23): Applications (stage, history on jobActions), Referral leads (contacts store, relationshipsOf), Analytics metrics and honesty requirements, Application status lifecycle, Core product principles, Cost-conscious (free feeds, no paid APIs), Dashboard screen, Evidence over guesses (+15 more)

### Community 15 - "Applications Pipeline"
Cohesion: 0.20
Nodes (21): applicationsOf(), dueApplicationFollowUps(), findDuplicate(), FollowUp, groupByStage(), manualRef(), norm(), sameRole() (+13 more)

### Community 16 - "Architecture Decisions & Backup"
Cohesion: 0.13
Nodes (21): Rule: never commit personal backups, Decision: Web Crypto AES-256-GCM + PBKDF2 for backups, Backup file format v1 and import order, Architecture decisions table, Decision: hash router, Decision: no analytics, no API keys, no VITE_ secrets, Decision: public repo with base /jobintel/, Decision: static React+TS SPA on GitHub Pages (+13 more)

### Community 17 - "Collector Types & Tests"
Cohesion: 0.15
Nodes (17): RawJob, SourceConfig, ASHBY, GH, LEVER, sourceA, sourceB, classifyLocations() (+9 more)

### Community 18 - "Graph Refresh Workflow"
Cohesion: 0.09
Nodes (22): concurrency, cancel-in-progress, group, jobs, refresh, name, on, push (+14 more)

### Community 19 - "Agent Guide: Repo Layout"
Cohesion: 0.13
Nodes (21): Layout area: app shell and routing (src/app), Layout area: job collector (collector/), Layout area: pure domain logic (src/domain), Layout area: feature screens (src/features), Layout area: persistence (src/storage), Layout area: tests (Vitest + Playwright), Where things live (repo layout), Decision: IndexedDB for data, localStorage for UI only (+13 more)

### Community 20 - "Security and privacy review (Phase 9)"
Cohesion: 0.12
Nodes (30): Agent guide (CLAUDE.md), Doc/markdown change requires graphify --update, Analytics (pure analytics.ts, plain HTML/CSS charts), JobIntel architecture (v0.9), Reliability and polish (lazy routes, CSP meta, axe E2E), Phase 9 - Reliability, security and polish, Import says "newer JobIntel" / unsupported version, Local data shows an error after an update (+22 more)

### Community 21 - "actions.ts"
Cohesion: 0.13
Nodes (26): ApplicationDetails, Decision, DECISIONS, hasContent(), interviewSchema, isoDay, JobAction, JobRef (+18 more)

### Community 22 - "Dev Dependencies"
Cohesion: 0.13
Nodes (20): devDependencies, jsdom@^30.1.3, oxlint@^1.89.0, @testing-library/user-event@^14.6.8, @types/node@^24.19.2, @types/react@^19.3.0, @types/react-dom@^19.3.0, typescript@~7.0.2 (+12 more)

### Community 23 - "Backup Crypto"
Cohesion: 0.12
Nodes (27): useJobActions(), useOutreach(), DataPrivacySection(), DataPrivacySectionProps, ExportDialog(), downloadJson(), useContacts(), BACKUP_FORMAT (+19 more)

### Community 24 - "Feed Schema"
Cohesion: 0.14
Nodes (17): ATS_LABEL, CITY_VALUES, FEED_FORMAT_VERSION, feedSchema, JOB_WORK_MODES, JobFeed, jobSchema, SCAN_LOG_LENGTH (+9 more)

### Community 25 - "App tsconfig"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 26 - "ATS Adapters"
Cohesion: 0.27
Nodes (17): arr(), Fetcher, obj(), parseAshby(), parseGreenhouse(), parseLever(), PARSERS, sections() (+9 more)

### Community 27 - "Collector tsconfig"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 28 - "react"
Cohesion: 0.15
Nodes (16): react, react-router-dom, NAV_ITEMS, NavItem, PROFILE_SECTIONS, ProfileSectionId, routes, AppShell() (+8 more)

### Community 29 - "Job Assessment Types"
Cohesion: 0.16
Nodes (15): NOTE_MAX, REJECT_REASONS, STAGE_LABEL, Assessment, Job, BAND_LABEL, MatchResult, formatDay() (+7 more)

### Community 30 - "Profile Navigation"
Cohesion: 0.19
Nodes (18): isProfileSection(), ChoiceGroup(), draftFromProfile(), draftsEqual(), calculateReadiness(), Notice, EditorProps, FIELD_SECTION (+10 more)

### Community 31 - "Node tsconfig"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 32 - "LeadForm.tsx"
Cohesion: 0.20
Nodes (15): Dialog(), FieldShell(), FieldShellProps, TextAreaField(), TextAreaFieldProps, TextField(), TextFieldProps, newContactId() (+7 more)

### Community 33 - "Profile Readiness"
Cohesion: 0.19
Nodes (11): CHECKLIST_GROUPS, ChecklistGroupId, MIN_PRIMARY_SKILLS, Readiness, READINESS_RULES, ReadinessRule, RuleResult, CandidateProfile (+3 more)

### Community 34 - "db.ts"
Cohesion: 0.19
Nodes (16): DB_NAME, DB_VERSION, SCHEMA_VERSION, STORES, openDatabase(), requestToPromise(), StorageUnavailableError, transactionDone() (+8 more)

### Community 35 - "App Shell & Providers"
Cohesion: 0.21
Nodes (6): App(), renderAt(), createAppRouter(), JobFeedProvider(), ProfileProvider(), clearUiPreferences()

### Community 36 - "Reminders"
Cohesion: 0.42
Nodes (9): localDate(), shouldNotify(), ReminderAgent(), RemindersPanel(), notificationsSupported(), useReminderSummary(), readUiPreference(), UiPreferenceKey (+1 more)

### Community 37 - "lucide-react"
Cohesion: 0.27
Nodes (6): lucide-react, APP_VERSION, Header(), HeaderProps, isMacPlatform(), ChoiceGroupProps

### Community 38 - "Knowledge-graph-first workflow"
Cohesion: 0.22
Nodes (9): CI graph refresh (graph.yml), Knowledge-graph-first workflow, Graph freshness rules, GRAPH_REPORT.md read-once step, graphify query/explain/path/affected/god-nodes commands, Layout area: CI workflows (.github/workflows), Never rebuild graph from scratch, scan.yml calls pages.yml via workflow_call (+1 more)

### Community 39 - "Feedback Learning"
Cohesion: 0.36
Nodes (8): assessJob(), clamp(), learnFromActions(), LEVELS, ROLE_REASONS, seniorityOf(), STOP, titleTokens()

### Community 40 - "E2E Tests"
Cohesion: 0.18
Nodes (5): PAGES, @axe-core/playwright@^4.14.0, @playwright/test@^1.64.1, @axe-core/playwright, @playwright/test

### Community 41 - "npm Scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check:dist, dev, lint, preview, test, test:e2e (+2 more)

### Community 42 - "helpers.ts"
Cohesion: 0.52
Nodes (5): createEmptyProfile(), resetDatabaseConnection(), completeProfile(), freshDatabase(), makeProfile()

### Community 43 - "Visual Design & Shell"
Cohesion: 0.25
Nodes (9): Core application shell (header and sidebar), CSS color tokens, Interaction and accessibility details, Layout and responsive behavior, Approved visual direction (dark-only blue/cyan), index.html (Vite entry), Dark color-scheme and theme-color #070B12, favicon.svg (+1 more)

### Community 44 - "Runtime Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, lucide-react@^1.66.0, react@^19.3.1, react-dom@^19.3.1, react-router-dom@^7.18.5, zod@^4.6.7, react-dom, zod

### Community 45 - "Test Libraries"
Cohesion: 0.29
Nodes (6): fake-indexeddb@^6.2.7, @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, fake-indexeddb, @testing-library/jest-dom, @testing-library/react

### Community 46 - "Vite Build"
Cohesion: 0.29
Nodes (5): vite@^8.3.5, @vitejs/plugin-react@^6.1.2, vite, @vitejs/plugin-react, CSP

### Community 47 - "Oxlint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 48 - "Plan Overview & Phase 1"
Cohesion: 0.22
Nodes (9): JobIntel Product, UX & Implementation Plan, Development workflow and guardrails, Phase 1 end-of-phase report, Phase 1 acceptance checklist, Phase 1 explicit non-goals, Phase 1 implementation specification, Product vision (optimize for relevant interviews), UX_SPEC.md (+1 more)

### Community 49 - "CLAUDE.md Guide"
Cohesion: 0.50
Nodes (3): JobIntel — agent guide, Project rules that are not derivable from code, Use the knowledge graph first — do NOT read the whole repo

### Community 50 - "Favicon Brand"
Cohesion: 0.67
Nodes (3): JobIntel browser tab / app favicon, Favicon dark navy and cyan-blue brand palette, JobIntel Favicon Logo (stylized J on dark rounded square)

## Knowledge Gaps
- **29 isolated node(s):** `Probe and fix failing board (collector/probe.ts)`, `Normalization and deduplication`, `Initial discovery configuration target`, `Explicit non-goals (no backend, no LinkedIn scraper, no auto-send)`, `GitHub Pages-compatible approach mapping` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 362 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `index.html (Vite entry)` connect `Visual Design & Shell` to `App Shell & Providers`, `Agent Guide: Repo Layout`?**
  _High betweenness centrality (0.215) - this node is a cross-community bridge._
- **What connects `Probe and fix failing board (collector/probe.ts)`, `Normalization and deduplication`, `Initial discovery configuration target` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Outreach Drafts` be split into smaller, more focused modules?**
  _Cohesion score 0.05859969558599695 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `LeadForm.tsx`, `Outreach Drafts`, `Profile Readiness`, `App Shell & Providers`, `Form UI Components`, `Referral Contacts`, `DashboardPage.tsx`, `Reminders`, `Analytics`, `Runtime Dependencies`, `Applications Pipeline`, `actions.ts`, `Dev Dependencies`, `Backup Crypto`, `Feed Schema`, `Job Assessment Types`, `Profile Navigation`?**
  _High betweenness centrality (0.210) - this node is a cross-community bridge._
- **Should `Scan Workflow` be split into smaller, more focused modules?**
  _Cohesion score 0.04717853839037928 - nodes in this community are weakly interconnected._
- **Why does `Source layers (app, components, features, domain, storage, styles)` connect `Agent Guide: Repo Layout` to `Visual Design & Shell`, `Security and privacy review (Phase 9)`?**
  _High betweenness centrality (0.127) - this node is a cross-community bridge._
- **Should `Pages Deploy Workflow` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._