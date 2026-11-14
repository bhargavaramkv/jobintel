# Graph Report - jobintel  (2026-11-14)

## Corpus Check
- 149 files · ~256,161 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 6 file(s) not represented in the graph (top: (none) 3, .css 3)

## Summary
- 1349 nodes · 2892 edges · 81 communities (71 shown, 10 thin omitted)
- Extraction: 96% EXTRACTED · 4% INFERRED · 0% AMBIGUOUS · INFERRED: 114 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0b9494f0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- backup.ts
- Scan Workflow (scan.yml)
- Pages Deploy Workflow
- lifecycle.ts
- OnboardingPage.tsx
- AI Result Import
- DashboardPage.tsx
- AI Context Export (2)
- PageHeader
- infer.ts
- Fit Score Factors
- search.ts
- AI Recommendation Schema
- Collector Title Filter and Probe
- pipeline.ts
- drafts.ts
- DiscoveryPage.tsx
- AI Result Import (2)
- contacts.ts
- feedback.test.ts
- context.ts
- form.ts
- package.json
- router.tsx
- Recovery Runbook
- Graph Refresh Workflow
- Collector Tests
- auto-sources.yml
- run.ts
- Product Plan Concepts
- App TypeScript Config
- ATS Adapters
- ProfileFields.tsx
- Collector TypeScript Config
- Manual hand-off to Claude
- feedSchema.ts
- apply.ts
- useApp
- Node TypeScript Config
- AI Integration Options and Roadmap
- feedback.ts
- react
- smoke.spec.ts
- TagInput.tsx
- actions.ts
- Field.tsx
- profile/schema.ts
- @axe-core/playwright
- UI V2
- AI Integration Options and Roadmap (2)
- AI Integration Options and Roadmap (3)
- Hosting and Discovery Constraints
- Data Architecture Decisions
- NPM Scripts
- drafts.test.ts
- check-dist.mjs
- validate-ai-result.ts
- Implementation Plan Phases
- Product Plan Concepts (2)
- jobintel-ai-result schema v1 contract
- JobIntel — agent guide
- Product Principles
- Runtime Dependencies
- ReminderAgent
- Dashboard and Backup Features
- Vite Build and CSP
- messages.ts
- Visual Design System
- Lint Config
- JobIntel architecture (v0.9)
- Phase 1 Shell
- Favicon Brand
- Root TS Config
- Analytics and Prep Phases
- AI Integration Options and Roadmap (4)
- Fit Score Factors (2)
- Outreach Follow-up Policy (2)
- Applied tracking and feedback learning
- AI automation: architecture (Phase A1)
- uiPreferences.ts
- appFixture.tsx

## God Nodes (most connected - your core abstractions)
1. `vitest` - 40 edges
2. `useApp()` - 24 edges
3. `makeJob()` - 21 edges
4. `react` - 20 edges
5. `buildAiContext()` - 20 edges
6. `Job` - 20 edges
7. `matchJob()` - 20 edges
8. `CandidateProfile` - 19 edges
9. `planApply()` - 18 edges
10. `compilerOptions` - 18 edges

## Surprising Connections (you probably didn't know these)
- `Use the knowledge graph first — do NOT read the whole repo` --references--> `main()`  [INFERRED]
  CLAUDE.md → collector/run.ts
- `The six layers` --references--> `buildAiContext()`  [INFERRED]
  docs/AI_AUTOMATION_ARCHITECTURE.md → src/domain/ai/context.ts
- `Jobs: search, filters and matching` --references--> `matchJob()`  [INFERRED]
  docs/UI_V2.md → src/domain/match/score.ts
- `Where things live (so you can skip exploring)` --references--> `DashboardPage()`  [INFERRED]
  CLAUDE.md → src/features/dashboard/DashboardPage.tsx
- `Data sources` --references--> `FeedProvider()`  [INFERRED]
  docs/UI_V2.md → src/app/FeedProvider.tsx

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Automated AI loop: browser sync, private repo, daily routine, validated auto-import** — todo_auto_sync, docs_ai_automation_architecture_private_repo_sync, todo_daily_claude_routine, scripts_validate_ai_result, todo_auto_import, todo_recommendation_inbox [EXTRACTED 1.00]
- **GitHub Actions public job feed pipeline** — docs_implementation_plan_actions_discovery_architecture, docs_implementation_plan_source_registry, docs_implementation_plan_dedup_normalization, docs_implementation_plan_jobs_json_feed, docs_implementation_plan_pages_deployment_workflow [EXTRACTED 1.00]
- **AI output safety controls** — docs_ai_automation_architecture_action_whitelist, docs_ai_automation_architecture_grounding_rule, docs_ai_automation_architecture_plan_apply, docs_ai_automation_architecture_partial_import, docs_security_ai_output_untrusted [INFERRED 0.85]
- **Local-first privacy boundary** — docs_implementation_plan_local_first_personal_data, docs_implementation_plan_indexeddb_storage, docs_implementation_plan_encrypted_backup, docs_implementation_plan_privacy_model, docs_implementation_plan_public_site_privacy_warning [INFERRED 0.85]
- **Phase 1 foundation deliverables** — docs_implementation_plan_app_shell, docs_implementation_plan_dashboard_screen, docs_implementation_plan_profile_screen, docs_implementation_plan_profile_readiness, docs_implementation_plan_color_tokens [INFERRED 0.85]
- **Public build guards (CSP, check:dist, no AI keys)** — docs_security_content_security_policy, todo_check_dist, todo_csp_github_api, docs_ai_automation_architecture_privacy_boundaries [INFERRED 0.85]

## Communities (81 total, 10 thin omitted)

### Community 0 - "backup.ts"
Cohesion: 0.06
Nodes (58): IndexedDB storage with append-only migrations, fake-indexeddb, automationSettingsSchema, ExportRecord, exportRecordSchema, storedBriefingSchema, storedRecommendationSchema, aiBriefingsRepository (+50 more)

### Community 1 - "Scan Workflow (scan.yml)"
Cohesion: 0.05
Nodes (46): if, needs, permissions, runs-on, steps, concurrency, cancel-in-progress, group (+38 more)

### Community 2 - "Pages Deploy Workflow"
Cohesion: 0.05
Nodes (43): concurrency, cancel-in-progress, group, environment, if, needs, permissions, runs-on (+35 more)

### Community 3 - "lifecycle.ts"
Cohesion: 0.17
Nodes (16): ALLOWED, canTransition(), countByStatus(), isPending(), latestBriefing(), PRIORITY_RANK, sortInbox(), STATUS_HINT (+8 more)

### Community 4 - "OnboardingPage.tsx"
Cohesion: 0.22
Nodes (21): Data sources, ChoiceGroup(), TextField(), draftFromProfile(), calculateReadiness(), createEmptyProfile(), fillFromResume(), newSkill() (+13 more)

### Community 5 - "AI Result Import"
Cohesion: 0.11
Nodes (30): 5. Threat model for AI output, describe(), extractJson(), fail(), ImportReview, LocalFacts, parseAiResult(), ParsedAiResult (+22 more)

### Community 6 - "DashboardPage.tsx"
Cohesion: 0.42
Nodes (9): useJobFeed(), AsyncView(), relativeTime(), DashboardPage(), formatDateTime(), DiscoveryPage(), jobPath(), effectiveMinScore() (+1 more)

### Community 7 - "AI Context Export (2)"
Cohesion: 0.09
Nodes (23): 3. Architecture, The contract (schema v1), The six layers, chatPrompt(), serializeContext(), acme, build(), closed (+15 more)

### Community 8 - "PageHeader"
Cohesion: 0.29
Nodes (8): PageHeader(), TexValidation, validateTexFile(), validateTexUpload(), CodeBlock(), MasterUpload(), formatDateTime(), ResumesPage()

### Community 9 - "infer.ts"
Cohesion: 0.26
Nodes (11): BACKEND_SIGNALS, escapeRegex(), findSkills(), FRONTEND_SIGNALS, inferFromTex(), plainText(), ResumeInference, roleTitles() (+3 more)

### Community 10 - "Fit Score Factors"
Cohesion: 0.06
Nodes (61): citiesIn(), applyFilters(), DEFAULT_FILTERS, feedFreshness(), fitsPreferences(), Freshness, NEW_WINDOW_DAYS, newJobs() (+53 more)

### Community 11 - "search.ts"
Cohesion: 0.16
Nodes (15): MatchResult, CITY_FILTERS, CityFilter, JobQuery, MODE_FILTERS, ModeFilter, postedKey(), ScoredJob (+7 more)

### Community 12 - "AI Recommendation Schema"
Cohesion: 0.06
Nodes (31): ACTION_TYPES, ActionType, AI_STAGES, AiResult, AUTOMATION_ID, briefingPrioritySchema, briefingShape, Checkable (+23 more)

### Community 13 - "Collector Title Filter and Probe"
Cohesion: 0.14
Nodes (20): apiUrl(), fetchSource(), opts(), makeTitleFilter(), TitleFilter, toRegex(), args, config (+12 more)

### Community 14 - "pipeline.ts"
Cohesion: 0.27
Nodes (13): applicationsOf(), daysBetween(), dueApplicationFollowUps(), findDuplicate(), FollowUp, groupByStage(), norm(), sameRole() (+5 more)

### Community 15 - "drafts.ts"
Cohesion: 0.13
Nodes (23): aboutMe(), allowedStrategies(), askLine(), contextLine(), Draft, DraftInput, DraftJob, firstName() (+15 more)

### Community 16 - "DiscoveryPage.tsx"
Cohesion: 0.19
Nodes (14): lucide-react, AsyncViewProps, ViewStatus, ModeBadge(), MODES, ScoreMeter(), cap(), Detail() (+6 more)

### Community 17 - "AI Result Import (2)"
Cohesion: 0.13
Nodes (20): AiContextBundle, DEFAULT_EXPORT_OPTIONS, AI_CONTEXT_FORMAT, AutomationSettings, LOW_RISK_ACTIONS, AUTO_ACCEPT_MIN_CONFIDENCE, CONTEXT_PATH, contextFingerprint() (+12 more)

### Community 18 - "contacts.ts"
Cohesion: 0.12
Nodes (19): CompanyFocus, Confidence, CONTACT_LIMITS, contactSchema, httpUrl, LEAD_STATUSES, LeadRank, LeadStatus (+11 more)

### Community 19 - "feedback.test.ts"
Cohesion: 0.22
Nodes (12): base(), jobActionSchema, pushHistory(), refOf(), snapshotOf(), ref, withApplied(), withRejected() (+4 more)

### Community 20 - "context.ts"
Cohesion: 0.19
Nodes (17): applicationEntry(), buildAiContext(), candidateSection(), clip(), clipAll(), dayOf(), ExportOptions, exportRecordOf() (+9 more)

### Community 21 - "form.ts"
Cohesion: 0.20
Nodes (14): DraftResult, draftsEqual(), NumberParse, optionalText(), parseOptionalNumber(), ProfileDraft, profileFromDraft(), base (+6 more)

### Community 22 - "package.json"
Cohesion: 0.11
Nodes (23): devDependencies, fake-indexeddb@^6.2.7, jsdom@^30.1.3, oxlint@^1.89.0, @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/node@^24.19.2 (+15 more)

### Community 23 - "router.tsx"
Cohesion: 0.24
Nodes (3): react-router-dom, createAppRouter(), routes

### Community 24 - "Recovery Runbook"
Cohesion: 0.10
Nodes (17): Backup file format v1 (jobintel-backup), Procedure: data gone, restore from encrypted backup, Import says "newer JobIntel" / unsupported version, Procedure: local data shows an error after update, Local data shows an error after an update, My data is gone (new browser, cleared site data, new device), Procedure: backup from newer JobIntel version, Probe and fix failing board (collector/probe.ts) (+9 more)

### Community 25 - "Graph Refresh Workflow"
Cohesion: 0.09
Nodes (22): concurrency, cancel-in-progress, group, jobs, refresh, name, on, push (+14 more)

### Community 26 - "Collector Tests"
Cohesion: 0.16
Nodes (16): RawJob, SourceConfig, ASHBY, GH, LEVER, sourceA, sourceB, classifyLocations() (+8 more)

### Community 27 - "auto-sources.yml"
Cohesion: 0.10
Nodes (21): concurrency, cancel-in-progress, group, jobs, verify-and-merge, name, on, push (+13 more)

### Community 28 - "run.ts"
Cohesion: 0.24
Nodes (11): collect(), configSchema, here, loadSources(), main(), readPrevious(), serializeFeed(), sourcesSchema (+3 more)

### Community 29 - "Product Plan Concepts"
Cohesion: 0.14
Nodes (18): A5: Referral research and lead proposals, A6 — Resume analysis and tailoring, A7 — Application status from email, Analytics metrics and honesty requirements, Core application shell (header and sidebar), Application status lifecycle, Evidence over guesses, Human approval for external actions (+10 more)

### Community 30 - "App TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 31 - "ATS Adapters"
Cohesion: 0.27
Nodes (17): arr(), Fetcher, obj(), parseAshby(), parseGreenhouse(), parseLever(), PARSERS, sections() (+9 more)

### Community 32 - "ProfileFields.tsx"
Cohesion: 0.17
Nodes (9): ChoiceGroupProps, DraftErrors, SENIORITY_OPTIONS, WORK_MODES, COMPANY_OPTIONS, FieldsProps, SENIORITY_CHOICES, skillName() (+1 more)

### Community 33 - "Collector TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 35 - "feedSchema.ts"
Cohesion: 0.12
Nodes (20): LocationInfo, MergeOptions, Feed contract (feedSchema shared by collector and app), CITY_ORDER, CITY_PATTERNS, ATS_LABEL, City, CITY_VALUES (+12 more)

### Community 36 - "apply.ts"
Cohesion: 0.15
Nodes (22): 2. What the existing code gave us (reused as is), ApplyContext, ApplyPlan, normName(), normUrl(), planApply(), refFor(), refuse() (+14 more)

### Community 37 - "useApp"
Cohesion: 0.27
Nodes (8): useApp(), NAV_ITEMS, NavItem, AppShell(), Header(), Sidebar(), ToastItem(), ToastRegion()

### Community 38 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 39 - "AI Integration Options and Roadmap"
Cohesion: 0.22
Nodes (9): A1 — Foundation ✅, A5 — Referral research and evidence-based outreach, A8 — Adaptive preparation, AI automation: roadmap, Cross-cutting backlog, Decisions I need from you before A2/A3, Principles that hold for every phase, Status (+1 more)

### Community 40 - "feedback.ts"
Cohesion: 0.18
Nodes (14): Read-time learning from decisions, Applied tracking and feedback learning (in-browser re-ranking), assessJob(), Assessment, clamp(), describeLearning(), Learned, learnFromActions() (+6 more)

### Community 41 - "react"
Cohesion: 0.31
Nodes (9): react, FEED_URL(), FeedContext, FeedState, FeedStatus, loadFeed(), Load, JobFeed (+1 more)

### Community 42 - "smoke.spec.ts"
Cohesion: 0.18
Nodes (11): TEX, feed, FIRST_JOB, JOB_HASH, OPEN, SEED, seed(), NOT_FOUND_PAGE (+3 more)

### Community 43 - "TagInput.tsx"
Cohesion: 0.44
Nodes (6): TagInput(), TagInputProps, LIMITS, splitTagInput(), TagResult, validateTag()

### Community 44 - "actions.ts"
Cohesion: 0.08
Nodes (24): ApplicationDetails, Decision, DECISIONS, Interview, INTERVIEW_KINDS, interviewSchema, isoDay, JobRef (+16 more)

### Community 45 - "Field.tsx"
Cohesion: 0.40
Nodes (5): FieldShell(), FieldShellProps, TextAreaField(), TextAreaFieldProps, TextFieldProps

### Community 46 - "profile/schema.ts"
Cohesion: 0.15
Nodes (11): COMPANY_TYPES, Compensation, compensationSchema, PROFICIENCIES, Proficiency, PROFILE_ID, shortText, skillList (+3 more)

### Community 48 - "UI V2"
Cohesion: 0.29
Nodes (7): Applications, Design tokens, Jobs: search, filters and matching, Screens and routes, Settings, Tests, UI V2

### Community 49 - "AI Integration Options and Roadmap (2)"
Cohesion: 0.20
Nodes (10): A4 — Company and ATS-board discovery, GitHub Actions least-privilege permissions, Residual risks, Security & privacy review (Phase 9), auto-sources.yml board discovery merge, Public feed contract (feedSchema.ts), Phase 2: job discovery, Phase 7: scheduled automation and reminders (+2 more)

### Community 51 - "AI Integration Options and Roadmap (3)"
Cohesion: 0.16
Nodes (13): Claude Code Routines (scheduled tasks), Fine-grained GitHub token credential, Claude integration options (hand-off, Routines, setup-token, API, connectors), Private repo sync (context/latest.json, profile/resume.md), Subscription token (claude setup-token), Subscription cost implications, A2: Local scheduled runs, A3 — Cloud scheduled tasks for the daily briefing (+5 more)

### Community 52 - "Hosting and Discovery Constraints"
Cohesion: 0.24
Nodes (10): Job-discovery architecture on GitHub Actions, GitHub Actions schedule trade-offs, Definition of success, GitHub Pages architecture constraints, React Router HashRouter, Explicit non-goals (no backend, no LinkedIn scraper, no auto-send), Official GitHub references, GitHub Pages-compatible approach mapping (+2 more)

### Community 53 - "Data Architecture Decisions"
Cohesion: 0.27
Nodes (11): CandidateProfile data schema, IndexedDB typed repository storage, localStorage for UI preferences only, GitHub Actions Pages deployment workflow (pages.yml), React + TypeScript + Vite SPA, Recommended stack, Suggested repository structure, Responsibility boundaries (layers) (+3 more)

### Community 54 - "NPM Scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check:dist, dev, lint, preview, test, test:e2e (+2 more)

### Community 55 - "drafts.test.ts"
Cohesion: 0.25
Nodes (8): Follow-up limit (2, a week apart, none after reply), addDays(), FollowUpState, followUpState(), job, lead(), me, OutreachMessage

### Community 56 - "check-dist.mjs"
Cohesion: 0.25
Nodes (6): npm run check:dist, DIST, indexHtml, SECRET_PATTERNS, TRACKER_PATTERNS, walk()

### Community 57 - "validate-ai-result.ts"
Cohesion: 0.20
Nodes (7): args, ctxIdx, out, problems, nextScheduledScan(), SCAN_TIMES_UTC, scheduleCron()

### Community 58 - "Implementation Plan Phases"
Cohesion: 0.22
Nodes (9): JobIntel Product, UX & Implementation Plan, Development workflow and guardrails, Phase 1 end-of-phase report, Phase 1 acceptance checklist, Phase 1 explicit non-goals, Phase 1 implementation specification, Product vision (optimize for relevant interviews), UX_SPEC.md (+1 more)

### Community 59 - "Product Plan Concepts (2)"
Cohesion: 0.25
Nodes (9): Normalization and deduplication, Initial discovery configuration target, Public jobs.json feed (public/data/jobs.json), Deterministic match score weights, Phase 2 - Job discovery engine, Phase 3 - Job intelligence and matching engine, Planned job source order (Greenhouse, Lever, Ashby, ...), Non-secret source registry (+1 more)

### Community 60 - "jobintel-ai-result schema v1 contract"
Cohesion: 0.09
Nodes (15): buildAiContext allowlist (domain/ai/context.ts), planApply (re-reads live record on accept), Preview + per-export consent, Prompt injection via job descriptions, Review lifecycle, jobintel-ai-result schema v1 contract, Six-layer AI architecture, AI test map (+7 more)

### Community 61 - "JobIntel — agent guide"
Cohesion: 0.50
Nodes (4): JobIntel — agent guide, Project rules that are not derivable from code, Use the knowledge graph first — do NOT read the whole repo, Where things live (so you can skip exploring)

### Community 62 - "Product Principles"
Cohesion: 0.25
Nodes (8): Candidate profile assumptions, Core product principles, Cost-conscious (free feeds, no paid APIs), Local-first personal data, Automation without secrets in the browser, Privacy model (local-first personal app hosted publicly), Public-site and privacy warning, Static-hosting-first

### Community 63 - "Runtime Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, lucide-react@^1.66.0, react@^19.3.1, react-dom@^19.3.1, react-router-dom@^7.18.5, zod@^4.6.7, react-dom, zod

### Community 65 - "Dashboard and Backup Features"
Cohesion: 0.23
Nodes (11): AI privacy boundaries, Dashboard screen, Delivery roadmap (Phases 0-9), Encrypted backup export/import (Web Crypto AES-GCM + PBKDF2), Dashboard KPI strip, Phase 0 - Repository and architecture verification, Phase 1 - Static app shell, dark UX, local profile, Phase 9 - Reliability, security and polish (+3 more)

### Community 66 - "Vite Build and CSP"
Cohesion: 0.29
Nodes (5): vite@^8.3.5, @vitejs/plugin-react@^6.1.2, vite, @vitejs/plugin-react, CSP

### Community 67 - "messages.ts"
Cohesion: 0.25
Nodes (6): Channel, CHANNELS, CHANNEL_IDS, isoDay, MESSAGE_MAX, outreachMessageSchema

### Community 68 - "Visual Design System"
Cohesion: 0.29
Nodes (8): CSS color tokens, Interaction and accessibility details, Layout and responsive behavior, Approved visual direction (dark-only blue/cyan), index.html (Vite entry), Dark color-scheme and theme-color #070B12, favicon.svg, no-referrer meta policy

### Community 69 - "Lint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 72 - "JobIntel architecture (v0.9)"
Cohesion: 0.36
Nodes (5): graph.yml workflow, JobIntel architecture (v0.9), JobIntel README, TODO.md (Implementation status), AI automation track A1-A8

### Community 73 - "Phase 1 Shell"
Cohesion: 0.67
Nodes (3): Backups AES-256-GCM, PBKDF2-SHA-256 600k, Encrypted backup (AES-GCM + PBKDF2), Phase 1: app shell, dark UX, local profile

### Community 74 - "Favicon Brand"
Cohesion: 0.67
Nodes (3): JobIntel browser tab / app favicon, Favicon dark navy and cyan-blue brand palette, JobIntel Favicon Logo (stylized J on dark rounded square)

### Community 83 - "AI automation: architecture (Phase A1)"
Cohesion: 0.25
Nodes (8): 1. Summary, 4. Privacy boundaries, 6. Integration options, limits and cost, 7. Where I departed from the brief's assumptions, 8. Smallest viable implementation (what A1 includes and excludes), 9. Test map, AI automation: architecture (Phase A1), Sources

### Community 89 - "appFixture.tsx"
Cohesion: 0.06
Nodes (59): Readiness score weighted checklist, Saved state, Profile readiness score, @testing-library/react, @testing-library/user-event, vitest, App(), renderAt() (+51 more)

## Knowledge Gaps
- **57 isolated node(s):** `IndexedDB storage with append-only migrations`, `Referral leads (derived relationships, verified vs inferred)`, `Procedure: local data shows an error after update`, `Procedure: backup from newer JobIntel version`, `Probe and fix failing board (collector/probe.ts)` (+52 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 543 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vitest` connect `appFixture.tsx` to `backup.ts`, `lifecycle.ts`, `AI Result Import`, `AI Context Export (2)`, `PageHeader`, `Fit Score Factors`, `search.ts`, `Collector Title Filter and Probe`, `pipeline.ts`, `DiscoveryPage.tsx`, `AI Result Import (2)`, `contacts.ts`, `feedback.test.ts`, `form.ts`, `package.json`, `Collector Tests`, `apply.ts`, `TagInput.tsx`, `drafts.test.ts`, `validate-ai-result.ts`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `buildAiContext()` (e.g. with `The six layers` and `norm()`) actually correct?**
  _`buildAiContext()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **What connects `IndexedDB storage with append-only migrations`, `Referral leads (derived relationships, verified vs inferred)`, `Procedure: local data shows an error after update` to the rest of the system?**
  _57 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `backup.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.06234567901234568 - nodes in this community are weakly interconnected._
- **Why does `JobIntel architecture (v0.9)` connect `JobIntel architecture (v0.9)` to `backup.ts`, `apply.ts`, `Fit Score Factors`, `AI Recommendation Schema`, `pipeline.ts`, `drafts.ts`, `check-dist.mjs`, `validate-ai-result.ts`?**
  _High betweenness centrality (0.091) - this node is a cross-community bridge._
- **Should `Scan Workflow (scan.yml)` be split into smaller, more focused modules?**
  _Cohesion score 0.04717853839037928 - nodes in this community are weakly interconnected._
- **Why does `Phase 9 - Reliability, security and polish` connect `Dashboard and Backup Features` to `JobIntel architecture (v0.9)`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._