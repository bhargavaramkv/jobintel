# Graph Report - jobintel  (2026-11-03)

## Corpus Check
- 169 files · ~244,696 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1456 nodes · 3635 edges · 81 communities (74 shown, 7 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 112 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- App Shell and IndexedDB Tests
- Scan Workflow (scan.yml)
- Pages Deploy Workflow
- AI Assistant Hooks
- Data Privacy and Backup UI
- AI Result Import
- AI Context Export
- AI Context Export (2)
- Referral Leads
- Job Filters and Learning
- Fit Score Factors
- Profile Form Conversion
- AI Recommendation Schema
- Collector Title Filter and Probe
- Application Pipeline
- Outreach Draft Templates
- Navigation Model
- AI Result Import (2)
- Analytics Engine
- Form Field Primitives
- AI Context Export (3)
- Job Actions and Reuse Map
- Test Dependencies
- Outreach Messages
- Recovery Runbook
- Graph Refresh Workflow
- Collector Tests
- auto-sources.yml
- Collector Scope and Feed Contract
- Product Plan Concepts
- App TypeScript Config
- ATS Adapters
- Readiness Score
- Collector TypeScript Config
- AI Layers and Hand-off
- AI Apply Rules
- Feedback Learning
- Routing and Navigation
- Node TypeScript Config
- AI Integration Options and Roadmap
- Agent Guide
- Referral Leads (2)
- E2E Smoke and Workflow
- AI Review Lifecycle
- Job Card and Types
- Job Actions and Reuse Map (2)
- Contacts and Reminder Agent
- Match Engine Tests
- Record Repository Interface
- AI Integration Options and Roadmap (2)
- App Shell and IndexedDB Tests (2)
- AI Integration Options and Roadmap (3)
- Hosting and Discovery Constraints
- Data Architecture Decisions
- NPM Scripts
- Job Feed Loading
- AI Privacy Boundaries
- AI Output Safety
- Implementation Plan Phases
- Product Plan Concepts (2)
- AI Output Safety (2)
- verify-sources.ts
- Product Principles
- Runtime Dependencies
- AI Privacy Boundaries (2)
- Dashboard and Backup Features
- Vite Build and CSP
- Outreach Follow-up Policy
- Visual Design System
- Lint Config
- E2E AI and Schedule Tests
- Agent Docs and Graph Policy
- Agent Guide (2)
- Phase 1 Shell
- Favicon Brand
- Root TS Config
- Analytics and Prep Phases
- AI Integration Options and Roadmap (4)
- Fit Score Factors (2)
- Outreach Follow-up Policy (2)
- Applied tracking and feedback learning

## God Nodes (most connected - your core abstractions)
1. `react` - 42 edges
2. `vitest` - 32 edges
3. `stageOf()` - 30 edges
4. `useJobActions()` - 25 edges
5. `lucide-react` - 25 edges
6. `FeedView()` - 23 edges
7. `localDate()` - 22 edges
8. `JobAction` - 21 edges
9. `matchJob()` - 21 edges
10. `Composer()` - 21 edges

## Surprising Connections (you probably didn't know these)
- `Use the knowledge graph first — do NOT read the whole repo` --references--> `main()`  [INFERRED]
  CLAUDE.md → collector/run.ts
- `The six layers` --references--> `buildAiContext()`  [INFERRED]
  docs/AI_AUTOMATION_ARCHITECTURE.md → src/domain/ai/context.ts
- `2. What the existing code gave us (reused as is)` --references--> `createRecordContext()`  [INFERRED]
  docs/AI_AUTOMATION_ARCHITECTURE.md → src/features/shared/recordContext.tsx
- `Where things live (so you can skip exploring)` --references--> `ProfileEditor()`  [INFERRED]
  CLAUDE.md → src/features/profile/ProfilePage.tsx
- `2. What the existing code gave us (reused as is)` --references--> `matchJob()`  [INFERRED]
  docs/AI_AUTOMATION_ARCHITECTURE.md → src/domain/match/score.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Automated AI loop: browser sync, private repo, daily routine, validated auto-import** — todo_auto_sync, docs_ai_automation_architecture_private_repo_sync, todo_daily_claude_routine, scripts_validate_ai_result, todo_auto_import, todo_recommendation_inbox [EXTRACTED 1.00]
- **GitHub Actions public job feed pipeline** — docs_implementation_plan_actions_discovery_architecture, docs_implementation_plan_source_registry, docs_implementation_plan_dedup_normalization, docs_implementation_plan_jobs_json_feed, docs_implementation_plan_pages_deployment_workflow [EXTRACTED 1.00]
- **AI output safety controls** — docs_ai_automation_architecture_action_whitelist, docs_ai_automation_architecture_grounding_rule, docs_ai_automation_architecture_plan_apply, docs_ai_automation_architecture_partial_import, docs_security_ai_output_untrusted [INFERRED 0.85]
- **Local-first privacy boundary** — docs_implementation_plan_local_first_personal_data, docs_implementation_plan_indexeddb_storage, docs_implementation_plan_encrypted_backup, docs_implementation_plan_privacy_model, docs_implementation_plan_public_site_privacy_warning [INFERRED 0.85]
- **Phase 1 foundation deliverables** — docs_implementation_plan_app_shell, docs_implementation_plan_dashboard_screen, docs_implementation_plan_profile_screen, docs_implementation_plan_profile_readiness, docs_implementation_plan_color_tokens [INFERRED 0.85]
- **Public build guards (CSP, check:dist, no AI keys)** — docs_security_content_security_policy, todo_check_dist, todo_csp_github_api, docs_ai_automation_architecture_privacy_boundaries [INFERRED 0.85]

## Communities (81 total, 7 thin omitted)

### Community 0 - "App Shell and IndexedDB Tests"
Cohesion: 0.06
Nodes (44): IndexedDB storage with append-only migrations, fake-indexeddb, @testing-library/react, vitest, App(), renderAt(), createAppRouter(), ref() (+36 more)

### Community 1 - "Scan Workflow (scan.yml)"
Cohesion: 0.05
Nodes (46): if, needs, permissions, runs-on, steps, concurrency, cancel-in-progress, group (+38 more)

### Community 2 - "Pages Deploy Workflow"
Cohesion: 0.05
Nodes (43): concurrency, cancel-in-progress, group, environment, if, needs, permissions, runs-on (+35 more)

### Community 3 - "AI Assistant Hooks"
Cohesion: 0.12
Nodes (34): react, react-router-dom, storedIdOf(), ALLOWED, canTransition(), countByStatus(), isPending(), latestBriefing() (+26 more)

### Community 4 - "Data Privacy and Backup UI"
Cohesion: 0.10
Nodes (33): useAiExports(), ClearDialog(), DataPrivacySection(), DataPrivacySectionProps, ExportDialog(), ImportDialog(), downloadJson(), b64() (+25 more)

### Community 5 - "AI Result Import"
Cohesion: 0.10
Nodes (32): describe(), extractJson(), fail(), ImportReview, LocalFacts, parseAiResult(), ParsedAiResult, ParseOutcome (+24 more)

### Community 6 - "AI Context Export"
Cohesion: 0.10
Nodes (22): DEFAULT_EXPORT_OPTIONS, RESUME_MAX, PULL_INTERVAL_MS, useAutomationSettings(), AiSyncAgent(), newId(), SYNC_DONE_EVENT, SYNC_NOW_EVENT (+14 more)

### Community 7 - "AI Context Export (2)"
Cohesion: 0.06
Nodes (32): 1. Summary, 3. Architecture, 4. Privacy boundaries, 5. Threat model for AI output, 6. Integration options, limits and cost, 7. Where I departed from the brief's assumptions, 8. Smallest viable implementation (what A1 includes and excludes), 9. Test map (+24 more)

### Community 8 - "Referral Leads"
Cohesion: 0.10
Nodes (25): DraftInput, CompanyFocus, Confidence, Contact, CONTACT_LIMITS, contactSchema, httpUrl, LEAD_STATUSES (+17 more)

### Community 9 - "Job Filters and Learning"
Cohesion: 0.12
Nodes (27): citiesIn(), JobWorkMode, applyFilters(), DEFAULT_FILTERS, feedFreshness(), fitsPreferences(), Freshness, JobFilters (+19 more)

### Community 10 - "Fit Score Factors"
Cohesion: 0.12
Nodes (29): bandOf(), cap(), experienceFactor(), factor(), FactorId, FactorResult, FACTORS, FAMILIES (+21 more)

### Community 11 - "Profile Form Conversion"
Cohesion: 0.10
Nodes (27): DraftErrors, draftFromProfile(), DraftResult, draftsEqual(), NumberParse, optionalText(), parseOptionalNumber(), ProfileDraft (+19 more)

### Community 12 - "AI Recommendation Schema"
Cohesion: 0.07
Nodes (27): ACTION_TYPES, ActionType, AI_STAGES, AiResult, briefingPrioritySchema, briefingShape, Checkable, confidence (+19 more)

### Community 13 - "Collector Title Filter and Probe"
Cohesion: 0.12
Nodes (25): apiUrl(), fetchSource(), opts(), makeTitleFilter(), TitleFilter, toRegex(), args, config (+17 more)

### Community 14 - "Application Pipeline"
Cohesion: 0.19
Nodes (23): applicationsOf(), dueApplicationFollowUps(), findDuplicate(), FollowUp, groupByStage(), manualRef(), norm(), sameRole() (+15 more)

### Community 15 - "Outreach Draft Templates"
Cohesion: 0.13
Nodes (24): Follow-up limit (2, a week apart, none after reply), aboutMe(), addDays(), allowedStrategies(), askLine(), contextLine(), Draft, firstName() (+16 more)

### Community 16 - "Navigation Model"
Cohesion: 0.13
Nodes (21): lucide-react, isProfileSection(), NavItem, PROFILE_SECTIONS, ProfileSectionId, Command, CommandPalette(), COMMANDS (+13 more)

### Community 17 - "AI Result Import (2)"
Cohesion: 0.18
Nodes (22): AiContextBundle, reviewImport(), toStored(), AutomationSettings, ExportRecord, StoredBriefing, AUTO_ACCEPT_MIN_CONFIDENCE, CONTEXT_PATH (+14 more)

### Community 18 - "Analytics Engine"
Cohesion: 0.20
Nodes (23): applicationsCsv(), byCompany(), CompanyRow, funnel(), FunnelStep, Metric, OutreachStats, outreachStats() (+15 more)

### Community 19 - "Form Field Primitives"
Cohesion: 0.14
Nodes (20): ChoiceGroup(), ChoiceGroupProps, TagInput(), TagInputProps, COMPANY_TYPES, LIMITS, PROFICIENCIES, Proficiency (+12 more)

### Community 20 - "AI Context Export (3)"
Cohesion: 0.16
Nodes (23): applicationEntry(), approxTokens(), buildAiContext(), candidateSection(), chatPrompt(), clip(), clipAll(), dayOf() (+15 more)

### Community 21 - "Job Actions and Reuse Map"
Cohesion: 0.13
Nodes (23): ApplicationDetails, Decision, DECISIONS, hasContent(), interviewSchema, isoDay, JobAction, JobRef (+15 more)

### Community 22 - "Test Dependencies"
Cohesion: 0.11
Nodes (24): devDependencies, fake-indexeddb@^6.2.7, jsdom@^30.1.3, oxlint@^1.89.0, @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/node@^24.19.2 (+16 more)

### Community 23 - "Outreach Messages"
Cohesion: 0.14
Nodes (21): Channel, CHANNELS, DraftJob, STRATEGIES, Tone, TONES, CHANNEL_IDS, isoDay (+13 more)

### Community 24 - "Recovery Runbook"
Cohesion: 0.09
Nodes (20): Backup file format v1 (jobintel-backup), Procedure: data gone, restore from encrypted backup, Import says "newer JobIntel" / unsupported version, Procedure: local data shows an error after update, Local data shows an error after an update, My data is gone (new browser, cleared site data, new device), Procedure: backup from newer JobIntel version, Probe and fix failing board (collector/probe.ts) (+12 more)

### Community 25 - "Graph Refresh Workflow"
Cohesion: 0.09
Nodes (22): concurrency, cancel-in-progress, group, jobs, refresh, name, on, push (+14 more)

### Community 26 - "Collector Tests"
Cohesion: 0.16
Nodes (16): RawJob, SourceConfig, ASHBY, GH, LEVER, sourceA, sourceB, classifyLocations() (+8 more)

### Community 27 - "auto-sources.yml"
Cohesion: 0.10
Nodes (21): concurrency, cancel-in-progress, group, jobs, verify-and-merge, name, on, push (+13 more)

### Community 28 - "Collector Scope and Feed Contract"
Cohesion: 0.13
Nodes (17): LocationInfo, MergeOptions, Feed contract (feedSchema shared by collector and app), CITY_ORDER, CITY_PATTERNS, ATS_LABEL, City, CITY_VALUES (+9 more)

### Community 29 - "Product Plan Concepts"
Cohesion: 0.13
Nodes (20): A5: Referral research and lead proposals, A6 — Resume analysis and tailoring, A7 — Application status from email, Analytics metrics and honesty requirements, Application status lifecycle, Dashboard screen, Evidence over guesses, Human approval for external actions (+12 more)

### Community 30 - "App TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 31 - "ATS Adapters"
Cohesion: 0.27
Nodes (17): arr(), Fetcher, obj(), parseAshby(), parseGreenhouse(), parseLever(), PARSERS, sections() (+9 more)

### Community 32 - "Readiness Score"
Cohesion: 0.15
Nodes (15): Readiness score weighted checklist, Profile readiness score, CHECKLIST_GROUPS, ChecklistGroupId, MIN_PRIMARY_SKILLS, Readiness, READINESS_RULES, ReadinessRule (+7 more)

### Community 33 - "Collector TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 34 - "AI Layers and Hand-off"
Cohesion: 0.11
Nodes (12): buildAiContext allowlist (domain/ai/context.ts), planApply (re-reads live record on accept), Preview + per-export consent, Review lifecycle, Six-layer AI architecture, AI test map, Route-level code splitting (React Router lazy), AI Assistant (A1) (+4 more)

### Community 35 - "AI Apply Rules"
Cohesion: 0.17
Nodes (14): ApplyContext, normName(), normUrl(), planApply(), refFor(), refuse(), STAGE_RANK, ctx() (+6 more)

### Community 36 - "Feedback Learning"
Cohesion: 0.21
Nodes (15): Read-time learning from decisions, Applied tracking and feedback learning (in-browser re-ranking), assessJob(), clamp(), describeLearning(), hasSignals(), Learned, learnFromActions() (+7 more)

### Community 37 - "Routing and Navigation"
Cohesion: 0.18
Nodes (9): NAV_ITEMS, routes, APP_VERSION, AppShell(), Header(), HeaderProps, initialsFor(), isMacPlatform() (+1 more)

### Community 38 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 39 - "AI Integration Options and Roadmap"
Cohesion: 0.23
Nodes (13): A1 — Foundation ✅, A5 — Referral research and evidence-based outreach, A8 — Adaptive preparation, AI automation: roadmap, Cross-cutting backlog, Decisions I need from you before A2/A3, Principles that hold for every phase, Status (+5 more)

### Community 40 - "Agent Guide"
Cohesion: 0.18
Nodes (11): Where things live (so you can skip exploring), useNow(), DashboardPage(), Kpi, RadarGraphic(), greetingFor(), NEXT_MILESTONE, ROADMAP (+3 more)

### Community 41 - "Referral Leads (2)"
Cohesion: 0.22
Nodes (13): FieldShell(), FieldShellProps, TextAreaField(), TextAreaFieldProps, TextField(), TextFieldProps, newContactId(), IdentitySection() (+5 more)

### Community 42 - "E2E Smoke and Workflow"
Cohesion: 0.14
Nodes (5): PAGES, @axe-core/playwright@^4.14.0, @playwright/test@^1.64.1, @axe-core/playwright, @playwright/test

### Community 43 - "AI Review Lifecycle"
Cohesion: 0.20
Nodes (13): ApplyPlan, STATUS_HINT, Evidence, RECOMMENDATION_KINDS, REJECT_REASONS, STAGE_LABEL, confidenceWord(), describeAction() (+5 more)

### Community 44 - "Job Card and Types"
Cohesion: 0.24
Nodes (13): Assessment, Job, relativeTime(), BAND_LABEL, MatchResult, formatDay(), JobCard(), JobCardProps (+5 more)

### Community 45 - "Job Actions and Reuse Map (2)"
Cohesion: 0.21
Nodes (12): 2. What the existing code gave us (reused as is), d(), journey(), base(), jobActionSchema, pushHistory(), ref, withApplied() (+4 more)

### Community 46 - "Contacts and Reminder Agent"
Cohesion: 0.42
Nodes (9): localDate(), shouldNotify(), ReminderAgent(), RemindersPanel(), notificationsSupported(), useReminderSummary(), readUiPreference(), UiPreferenceKey (+1 more)

### Community 47 - "Match Engine Tests"
Cohesion: 0.27
Nodes (11): aliasRegex(), blank(), BY_ALIAS, canonicalSkill(), COMPILED, escape(), mentionsSkill(), SkillDef (+3 more)

### Community 48 - "Record Repository Interface"
Cohesion: 0.20
Nodes (6): ProfilePage(), useProfile(), createRecordContext(), Provider(), RecordContextValue, Repo

### Community 49 - "AI Integration Options and Roadmap (2)"
Cohesion: 0.20
Nodes (10): A4 — Company and ATS-board discovery, GitHub Actions least-privilege permissions, Residual risks, Security & privacy review (Phase 9), auto-sources.yml board discovery merge, Public feed contract (feedSchema.ts), Phase 2: job discovery, Phase 7: scheduled automation and reminders (+2 more)

### Community 50 - "App Shell and IndexedDB Tests (2)"
Cohesion: 0.25
Nodes (8): AUTOMATION_ID, automationSettingsSchema, Provider, useRecords, aiBriefingsRepository, aiExportsRepository, aiRecommendationsRepository, aiSettingsRepository

### Community 51 - "AI Integration Options and Roadmap (3)"
Cohesion: 0.24
Nodes (9): Claude Code Routines (scheduled tasks), Fine-grained GitHub token credential, Claude integration options (hand-off, Routines, setup-token, API, connectors), Private repo sync (context/latest.json, profile/resume.md), Subscription token (claude setup-token), Subscription cost implications, A2: Local scheduled runs, A3 — Cloud scheduled tasks for the daily briefing (+1 more)

### Community 52 - "Hosting and Discovery Constraints"
Cohesion: 0.24
Nodes (10): Job-discovery architecture on GitHub Actions, GitHub Actions schedule trade-offs, Definition of success, GitHub Pages architecture constraints, React Router HashRouter, Explicit non-goals (no backend, no LinkedIn scraper, no auto-send), Official GitHub references, GitHub Pages-compatible approach mapping (+2 more)

### Community 53 - "Data Architecture Decisions"
Cohesion: 0.29
Nodes (10): IndexedDB typed repository storage, localStorage for UI preferences only, GitHub Actions Pages deployment workflow (pages.yml), React + TypeScript + Vite SPA, Recommended stack, Suggested repository structure, Responsibility boundaries (layers), Runtime architecture (+2 more)

### Community 54 - "NPM Scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check:dist, dev, lint, preview, test, test:e2e (+2 more)

### Community 55 - "Job Feed Loading"
Cohesion: 0.33
Nodes (8): feedSchema, JobFeed, FeedState, feedUrl(), JobFeedContext, JobFeedContextValue, loadFeed(), JobFeedProvider()

### Community 56 - "AI Privacy Boundaries"
Cohesion: 0.22
Nodes (6): npm run check:dist, DIST, indexHtml, SECRET_PATTERNS, TRACKER_PATTERNS, walk()

### Community 57 - "AI Output Safety"
Cohesion: 0.22
Nodes (5): jobintel-ai-result schema v1 contract, args, ctxIdx, out, problems

### Community 58 - "Implementation Plan Phases"
Cohesion: 0.22
Nodes (9): JobIntel Product, UX & Implementation Plan, Development workflow and guardrails, Phase 1 end-of-phase report, Phase 1 acceptance checklist, Phase 1 explicit non-goals, Phase 1 implementation specification, Product vision (optimize for relevant interviews), UX_SPEC.md (+1 more)

### Community 59 - "Product Plan Concepts (2)"
Cohesion: 0.25
Nodes (9): Normalization and deduplication, Initial discovery configuration target, Public jobs.json feed (public/data/jobs.json), Deterministic match score weights, Phase 2 - Job discovery engine, Phase 3 - Job intelligence and matching engine, Planned job source order (Greenhouse, Lever, Ashby, ...), Non-secret source registry (+1 more)

### Community 60 - "AI Output Safety (2)"
Cohesion: 0.29
Nodes (4): Prompt injection via job descriptions, Threat model for AI output, Relationships derived from facts, never asserted, Referral leads (derived relationships, verified vs inferred)

### Community 61 - "verify-sources.ts"
Cohesion: 0.43
Nodes (6): diffSources(), key(), main(), readSources(), Source, base

### Community 62 - "Product Principles"
Cohesion: 0.25
Nodes (8): Candidate profile assumptions, Core product principles, Cost-conscious (free feeds, no paid APIs), Local-first personal data, Automation without secrets in the browser, Privacy model (local-first personal app hosted publicly), Public-site and privacy warning, Static-hosting-first

### Community 63 - "Runtime Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, lucide-react@^1.66.0, react@^19.3.1, react-dom@^19.3.1, react-router-dom@^7.18.5, zod@^4.6.7, react-dom, zod

### Community 64 - "AI Privacy Boundaries (2)"
Cohesion: 0.29
Nodes (6): AI privacy boundaries, Content-Security-Policy meta tag, Auto-sync (context export + resume, max every 30 min), Automation tab (private GitHub repo sync), check:dist public build guard, CSP connect-src allows api.github.com

### Community 65 - "Dashboard and Backup Features"
Cohesion: 0.48
Nodes (7): CandidateProfile data schema, Delivery roadmap (Phases 0-9), Encrypted backup export/import (Web Crypto AES-GCM + PBKDF2), Phase 0 - Repository and architecture verification, Phase 1 - Static app shell, dark UX, local profile, Phase 9 - Reliability, security and polish, Candidate profile & preferences screen

### Community 66 - "Vite Build and CSP"
Cohesion: 0.29
Nodes (5): vite@^8.3.5, @vitejs/plugin-react@^6.1.2, vite, @vitejs/plugin-react, CSP

### Community 67 - "Outreach Follow-up Policy"
Cohesion: 0.60
Nodes (5): ReminderAgent, followUpState(), threadOf(), ReminderSummary, reminderSummary()

### Community 68 - "Visual Design System"
Cohesion: 0.40
Nodes (6): Core application shell (header and sidebar), CSS color tokens, Interaction and accessibility details, Layout and responsive behavior, Approved visual direction (dark-only blue/cyan), Dark color-scheme and theme-color #070B12

### Community 69 - "Lint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 70 - "E2E AI and Schedule Tests"
Cohesion: 0.60
Nodes (3): nextScheduledScan(), SCAN_TIMES_UTC, scheduleCron()

### Community 72 - "Agent Guide (2)"
Cohesion: 0.67
Nodes (3): JobIntel — agent guide, Project rules that are not derivable from code, Use the knowledge graph first — do NOT read the whole repo

### Community 73 - "Phase 1 Shell"
Cohesion: 0.67
Nodes (3): Backups AES-256-GCM, PBKDF2-SHA-256 600k, Encrypted backup (AES-GCM + PBKDF2), Phase 1: app shell, dark UX, local profile

### Community 74 - "Favicon Brand"
Cohesion: 0.67
Nodes (3): JobIntel browser tab / app favicon, Favicon dark navy and cyan-blue brand palette, JobIntel Favicon Logo (stylized J on dark rounded square)

## Knowledge Gaps
- **56 isolated node(s):** `IndexedDB storage with append-only migrations`, `Explained fit score (6 weighted factors)`, `Per-source isolation in the collector`, `Referral leads (derived relationships, verified vs inferred)`, `Applied tracking and feedback learning (in-browser re-ranking)` (+51 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 533 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `JobIntel architecture (v0.9)` connect `AI Integration Options and Roadmap` to `App Shell and IndexedDB Tests`, `AI Apply Rules`, `E2E AI and Schedule Tests`, `Fit Score Factors`, `AI Recommendation Schema`, `Application Pipeline`, `Match Engine Tests`, `Outreach Draft Templates`, `Record Repository Interface`, `Analytics Engine`, `AI Privacy Boundaries`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **What connects `IndexedDB storage with append-only migrations`, `Explained fit score (6 weighted factors)`, `Per-source isolation in the collector` to the rest of the system?**
  _56 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell and IndexedDB Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.060534822215692036 - nodes in this community are weakly interconnected._
- **Why does `react` connect `AI Assistant Hooks` to `App Shell and IndexedDB Tests`, `Data Privacy and Backup UI`, `AI Result Import`, `AI Context Export`, `Referral Leads`, `Job Filters and Learning`, `Application Pipeline`, `Navigation Model`, `Analytics Engine`, `Form Field Primitives`, `AI Context Export (3)`, `Job Actions and Reuse Map`, `Test Dependencies`, `Outreach Messages`, `Readiness Score`, `Routing and Navigation`, `Agent Guide`, `Referral Leads (2)`, `Job Card and Types`, `Contacts and Reminder Agent`, `Record Repository Interface`, `Job Feed Loading`, `Runtime Dependencies`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Should `Scan Workflow (scan.yml)` be split into smaller, more focused modules?**
  _Cohesion score 0.04717853839037928 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `App Shell and IndexedDB Tests` to `AI Assistant Hooks`, `Data Privacy and Backup UI`, `AI Result Import`, `AI Context Export`, `AI Context Export (2)`, `Referral Leads`, `Job Filters and Learning`, `Fit Score Factors`, `Profile Form Conversion`, `Application Pipeline`, `Outreach Draft Templates`, `AI Result Import (2)`, `Analytics Engine`, `Form Field Primitives`, `Test Dependencies`, `Collector Tests`, `AI Apply Rules`, `Feedback Learning`, `Job Actions and Reuse Map (2)`, `verify-sources.ts`, `E2E AI and Schedule Tests`?**
  _High betweenness centrality (0.047) - this node is a cross-community bridge._
- **Should `Pages Deploy Workflow` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._