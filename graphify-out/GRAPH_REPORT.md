# Graph Report - jobintel  (2026-11-03)

## Corpus Check
- 153 files · ~236,170 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .css 11, (none) 3)

## Summary
- 1352 nodes · 3513 edges · 62 communities (60 shown, 2 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 276 edges (avg confidence: 0.91)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d7e369c8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- AssistantPage.test.tsx
- Outreach Drafts
- Scan Workflow
- Pages Deploy Workflow
- Form UI Components
- InboxPanel.tsx
- DashboardPage.tsx
- score.ts
- collector.test.ts
- Analytics
- Agent Guide: Rules & CI
- form.ts
- GitHub Pages architecture constraints
- JobIntel overview (README)
- Core product principles
- ExportPanel.tsx
- Architecture Decisions & Backup
- ai/schema.ts
- Graph Refresh Workflow
- Phase 4 - Referral intelligence
- Security and privacy review (Phase 9)
- actions.ts
- Dev Dependencies
- Backup Crypto
- context.test.ts
- App tsconfig
- score.test.ts
- Collector tsconfig
- react
- RecommendationCard.tsx
- Profile Navigation
- Node tsconfig
- TextField
- Profile Readiness
- aiRepository.test.ts
- App.tsx
- Reminders
- aiRepository.ts
- Knowledge-graph-first workflow
- context.ts
- E2E Tests
- npm Scripts
- Where things live (repo layout)
- Visual Design & Shell
- AI automation: roadmap
- Test Libraries
- Vite Build
- Oxlint Config
- Plan Overview & Phase 1
- useProfile
- Favicon Brand
- Root tsconfig
- AI automation: architecture (Phase A1)
- Recovery guide
- Product navigation and information architecture
- Phase 2 - Job discovery engine
- Recommended stack
- TagInput.tsx
- Delivery roadmap (Phases 0-9)
- schedule.test.ts
- check-dist.mjs
- Repo

## God Nodes (most connected - your core abstractions)
1. `react` - 38 edges
2. `stageOf()` - 34 edges
3. `DashboardPage()` - 31 edges
4. `vitest` - 28 edges
5. `localDate()` - 28 edges
6. `useJobActions()` - 28 edges
7. `useProfile()` - 25 edges
8. `lucide-react` - 24 edges
9. `JobIntel overview (README)` - 24 edges
10. `JobAction` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Review lifecycle` --references--> `planApply()`  [INFERRED]
  docs/AI_AUTOMATION_ARCHITECTURE.md → src/domain/ai/apply.ts
- `The six layers` --references--> `buildAiContext()`  [INFERRED]
  docs/AI_AUTOMATION_ARCHITECTURE.md → src/domain/ai/context.ts
- `Use the knowledge graph first — do NOT read the whole repo` --references--> `main()`  [INFERRED]
  CLAUDE.md → collector/run.ts
- `5. Threat model for AI output` --references--> `planApply()`  [INFERRED]
  docs/AI_AUTOMATION_ARCHITECTURE.md → src/domain/ai/apply.ts
- `5. Threat model for AI output` --references--> `reviewImport()`  [INFERRED]
  docs/AI_AUTOMATION_ARCHITECTURE.md → src/domain/ai/import.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Knowledge graph first and freshness workflow** — claude_graph_first, claude_graph_freshness_rules, claude_ci_graph_refresh, claude_doc_change_graph_update [EXTRACTED 1.00]
- **GitHub Actions public job feed pipeline** — docs_implementation_plan_actions_discovery_architecture, docs_implementation_plan_source_registry, docs_implementation_plan_dedup_normalization, docs_implementation_plan_jobs_json_feed, docs_implementation_plan_pages_deployment_workflow [EXTRACTED 1.00]
- **Job feed scan, deploy and failure alert flow** — docs_architecture_job_discovery_pipeline, docs_architecture_feed_contract, docs_architecture_deployment_chaining, todo_scan_failure_alerts, docs_recovery_stale_feed [INFERRED 0.85]
- **Local-first privacy, encrypted backup and recovery flow** — readme_privacy_model, docs_architecture_backup_file_format, docs_security_backups, docs_recovery_data_gone [INFERRED 0.85]
- **Local-first privacy boundary** — docs_implementation_plan_local_first_personal_data, docs_implementation_plan_indexeddb_storage, docs_implementation_plan_encrypted_backup, docs_implementation_plan_privacy_model, docs_implementation_plan_public_site_privacy_warning [INFERRED 0.85]
- **Phase 1 foundation deliverables** — docs_implementation_plan_app_shell, docs_implementation_plan_dashboard_screen, docs_implementation_plan_profile_screen, docs_implementation_plan_profile_readiness, docs_implementation_plan_color_tokens [INFERRED 0.85]

## Communities (62 total, 2 thin omitted)

### Community 0 - "AssistantPage.test.tsx"
Cohesion: 0.10
Nodes (35): vitest, describe(), extractJson(), fail(), ImportReview, LocalFacts, parseAiResult(), ParsedAiResult (+27 more)

### Community 1 - "Outreach Drafts"
Cohesion: 0.05
Nodes (75): familiesOf(), aboutMe(), addDays(), allowedStrategies(), askLine(), Channel, CHANNELS, contextLine() (+67 more)

### Community 2 - "Scan Workflow"
Cohesion: 0.05
Nodes (46): if, needs, permissions, runs-on, steps, concurrency, cancel-in-progress, group (+38 more)

### Community 3 - "Pages Deploy Workflow"
Cohesion: 0.05
Nodes (43): concurrency, cancel-in-progress, group, environment, if, needs, permissions, runs-on (+35 more)

### Community 4 - "Form UI Components"
Cohesion: 0.11
Nodes (19): ChoiceGroupProps, COMPANY_TYPES, Compensation, compensationSchema, PROFICIENCIES, Proficiency, PROFILE_ID, SENIORITY_OPTIONS (+11 more)

### Community 5 - "InboxPanel.tsx"
Cohesion: 0.14
Nodes (25): useNow(), ALLOWED, canTransition(), countByStatus(), isPending(), latestBriefing(), PRIORITY_RANK, sortInbox() (+17 more)

### Community 6 - "DashboardPage.tsx"
Cohesion: 0.08
Nodes (51): Where things live (so you can skip exploring), LocationInfo, MergeOptions, routes, citiesIn(), CITY_ORDER, CITY_PATTERNS, describeLearning() (+43 more)

### Community 7 - "score.ts"
Cohesion: 0.15
Nodes (22): LEVELS, cap(), experienceFactor(), factor(), FactorId, FactorResult, FACTORS, FAMILIES (+14 more)

### Community 8 - "collector.test.ts"
Cohesion: 0.05
Nodes (73): JobIntel — agent guide, Project rules that are not derivable from code, Use the knowledge graph first — do NOT read the whole repo, apiUrl(), arr(), Fetcher, fetchSource(), obj() (+65 more)

### Community 9 - "Analytics"
Cohesion: 0.18
Nodes (25): applicationsCsv(), byCompany(), CompanyRow, funnel(), FunnelStep, Metric, OutreachStats, outreachStats() (+17 more)

### Community 10 - "Agent Guide: Rules & CI"
Cohesion: 0.14
Nodes (22): Rule: collector scope Bengaluru + Hyderabad, all work modes, Rule: feed contract changed in one place, Project rules not derivable from code, Rule: TODO.md is the source of truth for status, Automation and reminders (recentScans, alert job, ReminderAgent), Duplicate keys (ats:board:sourceId, company+title+city), Feed contract feedSchema.ts shared by collector and app, Job discovery pipeline (scan.yml -> collector -> jobs.json) (+14 more)

### Community 11 - "form.ts"
Cohesion: 0.18
Nodes (15): DraftErrors, DraftResult, NumberParse, optionalText(), parseOptionalNumber(), ProfileDraft, profileFromDraft(), base (+7 more)

### Community 12 - "GitHub Pages architecture constraints"
Cohesion: 0.24
Nodes (10): Job-discovery architecture on GitHub Actions, GitHub Actions schedule trade-offs, Definition of success, GitHub Pages architecture constraints, React Router HashRouter, Explicit non-goals (no backend, no LinkedIn scraper, no auto-send), Official GitHub references, GitHub Pages-compatible approach mapping (+2 more)

### Community 13 - "JobIntel overview (README)"
Cohesion: 0.20
Nodes (19): Agent guide (CLAUDE.md), Doc/markdown change requires graphify --update, Analytics (pure analytics.ts, plain HTML/CSS charts), Applications (stage, history on jobActions), Decisions and learning (jobActions, feedback.ts), Matching engine (skills.ts, score.ts), JobIntel architecture (v0.9), Application status lifecycle (+11 more)

### Community 14 - "Core product principles"
Cohesion: 0.18
Nodes (11): Candidate profile assumptions, Core product principles, Cost-conscious (free feeds, no paid APIs), Human approval for external actions, Local-first personal data, Automation without secrets in the browser, Outreach strategies and drafting rules, Phase 5 - Outreach and referral strategist (+3 more)

### Community 15 - "ExportPanel.tsx"
Cohesion: 0.16
Nodes (26): Dialog(), approxTokens(), chatPrompt(), exportRecordOf(), serializeContext(), Provider, useAiBriefings(), useAiExports() (+18 more)

### Community 16 - "Architecture Decisions & Backup"
Cohesion: 0.17
Nodes (16): Decision: Web Crypto AES-256-GCM + PBKDF2 for backups, Backup file format v1 and import order, Architecture decisions table, Decision: hash router, Decision: public repo with base /jobintel/, Decision: static React+TS SPA on GitHub Pages, Decision: system fonts, no CDN, Decision: Zod validation on every read, write, import (+8 more)

### Community 17 - "ai/schema.ts"
Cohesion: 0.08
Nodes (23): ACTION_TYPES, ActionType, AiResult, aiResultSchema, briefingPrioritySchema, briefingShape, Checkable, confidence (+15 more)

### Community 18 - "Graph Refresh Workflow"
Cohesion: 0.09
Nodes (22): concurrency, cancel-in-progress, group, jobs, refresh, name, on, push (+14 more)

### Community 19 - "Phase 4 - Referral intelligence"
Cohesion: 0.17
Nodes (16): Layout area: persistence (src/storage), Decision: IndexedDB for data, localStorage for UI only, Outreach (drafts.ts, strategyFor, allowedStrategies), recordStore typed validating repository, Referral leads (contacts store, relationshipsOf), Storage (IndexedDB jobintel, migrations), Phase 4 - Referral intelligence, Procedure: local data shows an error after update (+8 more)

### Community 20 - "Security and privacy review (Phase 9)"
Cohesion: 0.14
Nodes (20): Layout area: tests (Vitest + Playwright), Rule: never commit personal backups, Collector never reads profile data, Decision: no analytics, no API keys, no VITE_ secrets, Reliability and polish (lazy routes, CSP meta, axe E2E), Phase 9 - Reliability, security and polish, Accessibility via axe-core in E2E, Content-Security-Policy (+12 more)

### Community 21 - "actions.ts"
Cohesion: 0.05
Nodes (93): 2. What the existing code gave us (reused as is), ApplyContext, planApply(), refFor(), refuse(), ctx(), job, now (+85 more)

### Community 22 - "Dev Dependencies"
Cohesion: 0.13
Nodes (20): devDependencies, jsdom@^30.1.3, oxlint@^1.89.0, @testing-library/user-event@^14.6.8, @types/node@^24.19.2, @types/react@^19.3.0, @types/react-dom@^19.3.0, typescript@~7.0.2 (+12 more)

### Community 23 - "Backup Crypto"
Cohesion: 0.14
Nodes (22): b64(), FAST, forge(), BACKUP_FORMAT, BACKUP_FORMAT_VERSION, BackupEnvelope, BackupError, BackupErrorCode (+14 more)

### Community 24 - "context.test.ts"
Cohesion: 0.11
Nodes (19): The contract (schema v1), acme, build(), closed, contact, globex, hidden, hideCompany (+11 more)

### Community 25 - "App tsconfig"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 26 - "score.test.ts"
Cohesion: 0.19
Nodes (16): bandOf(), jobSkills(), splitRequirements(), backendJob, dev, aliasRegex(), blank(), BY_ALIAS (+8 more)

### Community 27 - "Collector tsconfig"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 28 - "react"
Cohesion: 0.11
Nodes (23): dependencies, lucide-react@^1.66.0, react@^19.3.1, react-dom@^19.3.1, react-router-dom@^7.18.5, zod@^4.6.7, lucide-react, react (+15 more)

### Community 29 - "RecommendationCard.tsx"
Cohesion: 0.19
Nodes (13): ApplyPlan, STATUS_HINT, Evidence, ProposedAction, RECOMMENDATION_KINDS, StoredRecommendation, REJECT_REASONS, confidenceWord() (+5 more)

### Community 30 - "Profile Navigation"
Cohesion: 0.15
Nodes (20): isProfileSection(), NAV_ITEMS, NavItem, PROFILE_SECTIONS, ProfileSectionId, ChoiceGroup(), draftFromProfile(), draftsEqual() (+12 more)

### Community 31 - "Node tsconfig"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 32 - "TextField"
Cohesion: 0.36
Nodes (7): FieldShell(), FieldShellProps, TextAreaField(), TextAreaFieldProps, TextField(), TextFieldProps, IdentitySection()

### Community 33 - "Profile Readiness"
Cohesion: 0.19
Nodes (11): CHECKLIST_GROUPS, ChecklistGroupId, MIN_PRIMARY_SKILLS, Readiness, READINESS_RULES, ReadinessRule, RuleResult, CandidateProfile (+3 more)

### Community 34 - "aiRepository.test.ts"
Cohesion: 0.17
Nodes (22): FEED_FORMAT_VERSION, lead(), createEmptyProfile(), DB_NAME, DB_VERSION, SCHEMA_VERSION, STORES, openDatabase() (+14 more)

### Community 35 - "App.tsx"
Cohesion: 0.12
Nodes (13): App(), renderAt(), createAppRouter(), AiProvider(), renderAt(), FeedState, feedUrl(), JobFeedContext (+5 more)

### Community 36 - "Reminders"
Cohesion: 0.42
Nodes (9): localDate(), shouldNotify(), ReminderAgent(), RemindersPanel(), notificationsSupported(), useReminderSummary(), readUiPreference(), UiPreferenceKey (+1 more)

### Community 37 - "aiRepository.ts"
Cohesion: 0.20
Nodes (10): exportRecordSchema, storedBriefingSchema, storedRecommendationSchema, aiBriefingsRepository, aiExportsRepository, aiRecommendationsRepository, requestToPromise(), transactionDone() (+2 more)

### Community 38 - "Knowledge-graph-first workflow"
Cohesion: 0.22
Nodes (9): CI graph refresh (graph.yml), Knowledge-graph-first workflow, Graph freshness rules, GRAPH_REPORT.md read-once step, graphify query/explain/path/affected/god-nodes commands, Layout area: CI workflows (.github/workflows), Never rebuild graph from scratch, scan.yml calls pages.yml via workflow_call (+1 more)

### Community 39 - "context.ts"
Cohesion: 0.16
Nodes (21): AiContextBundle, applicationEntry(), buildAiContext(), candidateSection(), clip(), clipAll(), dayOf(), DEFAULT_EXPORT_OPTIONS (+13 more)

### Community 40 - "E2E Tests"
Cohesion: 0.14
Nodes (5): PAGES, @axe-core/playwright@^4.14.0, @playwright/test@^1.64.1, @axe-core/playwright, @playwright/test

### Community 41 - "npm Scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check:dist, dev, lint, preview, test, test:e2e (+2 more)

### Community 42 - "Where things live (repo layout)"
Cohesion: 0.19
Nodes (13): Layout area: app shell and routing (src/app), Layout area: job collector (collector/), Layout area: pure domain logic (src/domain), Layout area: feature screens (src/features), Where things live (repo layout), Source layers (app, components, features, domain, storage, styles), Readiness score weights (sum 100), index.html (Vite entry) (+5 more)

### Community 43 - "Visual Design & Shell"
Cohesion: 0.50
Nodes (5): CSS color tokens, Interaction and accessibility details, Layout and responsive behavior, Approved visual direction (dark-only blue/cyan), Dark color-scheme and theme-color #070B12

### Community 44 - "AI automation: roadmap"
Cohesion: 0.15
Nodes (13): A1 — Foundation ✅, A2 — Local scheduled runs, A3 — Cloud scheduled tasks for the daily briefing, A4 — Company and ATS-board discovery, A5 — Referral research and evidence-based outreach, A6 — Resume analysis and tailoring, A7 — Application status from email, A8 — Adaptive preparation (+5 more)

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

### Community 49 - "useProfile"
Cohesion: 0.21
Nodes (9): Provider, useRecords, useProfile(), Provider, useRecords, createRecordContext(), Provider(), RecordContextValue (+1 more)

### Community 50 - "Favicon Brand"
Cohesion: 0.67
Nodes (3): JobIntel browser tab / app favicon, Favicon dark navy and cyan-blue brand palette, JobIntel Favicon Logo (stylized J on dark rounded square)

### Community 52 - "AI automation: architecture (Phase A1)"
Cohesion: 0.17
Nodes (12): 1. Summary, 3. Architecture, 4. Privacy boundaries, 5. Threat model for AI output, 6. Integration options, limits and cost, 7. Where I departed from the brief's assumptions, 8. Smallest viable implementation (what A1 includes and excludes), 9. Test map (+4 more)

### Community 53 - "Recovery guide"
Cohesion: 0.17
Nodes (10): Import says "newer JobIntel" / unsupported version, Local data shows an error after an update, My data is gone (new browser, cleared site data, new device), Recovery guide, Supported browsers, The job feed is stale or empty, The site won't deploy, Residual risks (+2 more)

### Community 54 - "Product navigation and information architecture"
Cohesion: 0.25
Nodes (9): Analytics metrics and honesty requirements, Core application shell (header and sidebar), Dashboard screen, Evidence over guesses, Dashboard KPI strip, Product navigation and information architecture, Phase 8 - Analytics and career strategist, Profile readiness / completion score (+1 more)

### Community 55 - "Phase 2 - Job discovery engine"
Cohesion: 0.25
Nodes (9): Normalization and deduplication, Initial discovery configuration target, Public jobs.json feed (public/data/jobs.json), Deterministic match score weights, Phase 2 - Job discovery engine, Phase 3 - Job intelligence and matching engine, Planned job source order (Greenhouse, Lever, Ashby, ...), Non-secret source registry (+1 more)

### Community 56 - "Recommended stack"
Cohesion: 0.33
Nodes (9): IndexedDB typed repository storage, localStorage for UI preferences only, GitHub Actions Pages deployment workflow (pages.yml), React + TypeScript + Vite SPA, Recommended stack, Suggested repository structure, Responsibility boundaries (layers), Runtime architecture (+1 more)

### Community 57 - "TagInput.tsx"
Cohesion: 0.44
Nodes (6): TagInput(), TagInputProps, LIMITS, splitTagInput(), TagResult, validateTag()

### Community 58 - "Delivery roadmap (Phases 0-9)"
Cohesion: 0.43
Nodes (7): CandidateProfile data schema, Delivery roadmap (Phases 0-9), Encrypted backup export/import (Web Crypto AES-GCM + PBKDF2), Phase 0 - Repository and architecture verification, Phase 1 - Static app shell, dark UX, local profile, Candidate profile & preferences screen, Zod schema validation

### Community 59 - "schedule.test.ts"
Cohesion: 0.47
Nodes (3): nextScheduledScan(), SCAN_TIMES_UTC, scheduleCron()

### Community 60 - "check-dist.mjs"
Cohesion: 0.33
Nodes (5): DIST, indexHtml, SECRET_PATTERNS, TRACKER_PATTERNS, walk()

## Knowledge Gaps
- **29 isolated node(s):** `Probe and fix failing board (collector/probe.ts)`, `Candidate profile assumptions`, `Normalization and deduplication`, `Initial discovery configuration target`, `Explicit non-goals (no backend, no LinkedIn scraper, no auto-send)` (+24 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 450 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AI automation: architecture (Phase A1)` connect `AI automation: architecture (Phase A1)` to `actions.ts`, `JobIntel overview (README)`?**
  _High betweenness centrality (0.122) - this node is a cross-community bridge._
- **What connects `Probe and fix failing board (collector/probe.ts)`, `Candidate profile assumptions`, `Normalization and deduplication` to the rest of the system?**
  _29 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AssistantPage.test.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.09634146341463415 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `TextField`, `Outreach Drafts`, `Profile Readiness`, `App.tsx`, `Reminders`, `InboxPanel.tsx`, `DashboardPage.tsx`, `Analytics`, `ExportPanel.tsx`, `useProfile`, `actions.ts`, `Dev Dependencies`, `TagInput.tsx`, `Profile Navigation`?**
  _High betweenness centrality (0.121) - this node is a cross-community bridge._
- **Should `Outreach Drafts` be split into smaller, more focused modules?**
  _Cohesion score 0.050686641697877656 - nodes in this community are weakly interconnected._
- **Why does `index.html (Vite entry)` connect `Where things live (repo layout)` to `App.tsx`, `Visual Design & Shell`?**
  _High betweenness centrality (0.110) - this node is a cross-community bridge._
- **Should `Scan Workflow` be split into smaller, more focused modules?**
  _Cohesion score 0.04717853839037928 - nodes in this community are weakly interconnected._