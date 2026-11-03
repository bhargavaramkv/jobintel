# Graph Report - jobintel  (2026-11-03)

## Corpus Check
- 167 files · ~245,376 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .css 11, (none) 3)

## Summary
- 1452 nodes · 3783 edges · 82 communities (75 shown, 7 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 114 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `9a6bc548`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- aiRepository.test.ts
- Scan Workflow (scan.yml)
- Pages Deploy Workflow
- AI Assistant Hooks
- Data Privacy and Backup UI
- AI Result Import
- AI Context Export
- AI Context Export (2)
- vitest
- Job Filters and Learning
- Fit Score Factors
- Profile Form Conversion
- AI Recommendation Schema
- Collector Title Filter and Probe
- OutreachPage.tsx
- ProfilePage.tsx
- AI Result Import (2)
- contacts.ts
- Form Field Primitives
- context.ts
- package.json
- App.tsx
- Recovery Runbook
- Graph Refresh Workflow
- Collector Tests
- auto-sources.yml
- feedSchema.ts
- Product Plan Concepts
- App TypeScript Config
- ATS Adapters
- Readiness Score
- Collector TypeScript Config
- AI Layers and Hand-off
- Routing and Navigation
- Node TypeScript Config
- AI Integration Options and Roadmap
- DashboardPage.tsx
- ExportPanel.tsx
- E2E Smoke and Workflow
- AutomationPanel.tsx
- actions.ts
- profile/schema.ts
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
- devDependencies
- Product Principles
- Runtime Dependencies
- AI Privacy Boundaries (2)
- Dashboard and Backup Features
- Vite Build and CSP
- syncCycle.test.ts
- Visual Design System
- Lint Config
- react
- Phase 1 Shell
- Favicon Brand
- Root TS Config
- Analytics and Prep Phases
- AI Integration Options and Roadmap (4)
- Fit Score Factors (2)
- Outreach Follow-up Policy (2)
- Applied tracking and feedback learning
- location.ts
- AI automation: architecture (Phase A1)
- TagInput.tsx
- CandidateProfile
- JobIntel architecture (v0.9)
- AiSyncAgent.tsx
- @testing-library/react

## God Nodes (most connected - your core abstractions)
1. `react` - 42 edges
2. `stageOf()` - 34 edges
3. `vitest` - 32 edges
4. `DashboardPage()` - 31 edges
5. `useJobActions()` - 30 edges
6. `localDate()` - 28 edges
7. `useProfile()` - 27 edges
8. `lucide-react` - 25 edges
9. `buildAiContext()` - 24 edges
10. `JobAction` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Use the knowledge graph first — do NOT read the whole repo` --references--> `main()`  [INFERRED]
  CLAUDE.md → collector/run.ts
- `The six layers` --references--> `buildAiContext()`  [INFERRED]
  docs/AI_AUTOMATION_ARCHITECTURE.md → src/domain/ai/context.ts
- `5. Threat model for AI output` --references--> `planApply()`  [INFERRED]
  docs/AI_AUTOMATION_ARCHITECTURE.md → src/domain/ai/apply.ts
- `Review lifecycle` --references--> `planApply()`  [INFERRED]
  docs/AI_AUTOMATION_ARCHITECTURE.md → src/domain/ai/apply.ts
- `5. Threat model for AI output` --references--> `reviewImport()`  [INFERRED]
  docs/AI_AUTOMATION_ARCHITECTURE.md → src/domain/ai/import.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Automated AI loop: browser sync, private repo, daily routine, validated auto-import** — todo_auto_sync, docs_ai_automation_architecture_private_repo_sync, todo_daily_claude_routine, scripts_validate_ai_result, todo_auto_import, todo_recommendation_inbox [EXTRACTED 1.00]
- **GitHub Actions public job feed pipeline** — docs_implementation_plan_actions_discovery_architecture, docs_implementation_plan_source_registry, docs_implementation_plan_dedup_normalization, docs_implementation_plan_jobs_json_feed, docs_implementation_plan_pages_deployment_workflow [EXTRACTED 1.00]
- **AI output safety controls** — docs_ai_automation_architecture_action_whitelist, docs_ai_automation_architecture_grounding_rule, docs_ai_automation_architecture_plan_apply, docs_ai_automation_architecture_partial_import, docs_security_ai_output_untrusted [INFERRED 0.85]
- **Local-first privacy boundary** — docs_implementation_plan_local_first_personal_data, docs_implementation_plan_indexeddb_storage, docs_implementation_plan_encrypted_backup, docs_implementation_plan_privacy_model, docs_implementation_plan_public_site_privacy_warning [INFERRED 0.85]
- **Phase 1 foundation deliverables** — docs_implementation_plan_app_shell, docs_implementation_plan_dashboard_screen, docs_implementation_plan_profile_screen, docs_implementation_plan_profile_readiness, docs_implementation_plan_color_tokens [INFERRED 0.85]
- **Public build guards (CSP, check:dist, no AI keys)** — docs_security_content_security_policy, todo_check_dist, todo_csp_github_api, docs_ai_automation_architecture_privacy_boundaries [INFERRED 0.85]

## Communities (82 total, 7 thin omitted)

### Community 0 - "aiRepository.test.ts"
Cohesion: 0.14
Nodes (28): IndexedDB storage with append-only migrations, fake-indexeddb, FEED_FORMAT_VERSION, JobFeed, seedV4Database(), DB_NAME, DB_VERSION, SCHEMA_VERSION (+20 more)

### Community 1 - "Scan Workflow (scan.yml)"
Cohesion: 0.05
Nodes (46): if, needs, permissions, runs-on, steps, concurrency, cancel-in-progress, group (+38 more)

### Community 2 - "Pages Deploy Workflow"
Cohesion: 0.05
Nodes (43): concurrency, cancel-in-progress, group, environment, if, needs, permissions, runs-on (+35 more)

### Community 3 - "AI Assistant Hooks"
Cohesion: 0.09
Nodes (44): lucide-react, react-router-dom, ApplyPlan, ALLOWED, canTransition(), countByStatus(), isPending(), latestBriefing() (+36 more)

### Community 4 - "Data Privacy and Backup UI"
Cohesion: 0.11
Nodes (33): Dialog(), TextField(), useOutreach(), ClearDialog(), DataPrivacySection(), DataPrivacySectionProps, ExportDialog(), ImportDialog() (+25 more)

### Community 5 - "AI Result Import"
Cohesion: 0.13
Nodes (23): describe(), extractJson(), fail(), ImportReview, LocalFacts, parseAiResult(), ParsedAiResult, ParseOutcome (+15 more)

### Community 6 - "AI Context Export"
Cohesion: 0.15
Nodes (7): describe(), DirEntry, GitHubClient, githubClient(), call(), GitHubError, Call

### Community 7 - "AI Context Export (2)"
Cohesion: 0.09
Nodes (22): 3. Architecture, The contract (schema v1), The six layers, acme, build(), closed, contact, globex (+14 more)

### Community 8 - "vitest"
Cohesion: 0.23
Nodes (11): vitest, storedIdOf(), now, REVIEW_STATUSES, job, json(), NOW, rawRecommendation() (+3 more)

### Community 9 - "Job Filters and Learning"
Cohesion: 0.13
Nodes (19): citiesIn(), applyFilters(), DEFAULT_FILTERS, feedFreshness(), fitsPreferences(), Freshness, NEW_WINDOW_DAYS, preferencesFromProfile() (+11 more)

### Community 10 - "Fit Score Factors"
Cohesion: 0.12
Nodes (30): LEVELS, targetLevels(), bandOf(), cap(), experienceFactor(), factor(), FactorId, FactorResult (+22 more)

### Community 11 - "Profile Form Conversion"
Cohesion: 0.19
Nodes (15): draftFromProfile(), DraftResult, draftsEqual(), NumberParse, optionalText(), parseOptionalNumber(), ProfileDraft, profileFromDraft() (+7 more)

### Community 12 - "AI Recommendation Schema"
Cohesion: 0.07
Nodes (27): ACTION_TYPES, ActionType, AI_STAGES, AiResult, briefingPrioritySchema, briefingShape, Checkable, confidence (+19 more)

### Community 13 - "Collector Title Filter and Probe"
Cohesion: 0.14
Nodes (20): apiUrl(), fetchSource(), opts(), makeTitleFilter(), TitleFilter, toRegex(), args, config (+12 more)

### Community 15 - "OutreachPage.tsx"
Cohesion: 0.06
Nodes (63): Follow-up limit (2, a week apart, none after reply), ReminderAgent, ExportSource, localDate(), aboutMe(), addDays(), allowedStrategies(), askLine() (+55 more)

### Community 16 - "ProfilePage.tsx"
Cohesion: 0.17
Nodes (15): isProfileSection(), NAV_ITEMS, NavItem, PROFILE_SECTIONS, ProfileSectionId, DraftErrors, createEmptyProfile(), Notice (+7 more)

### Community 17 - "AI Result Import (2)"
Cohesion: 0.20
Nodes (18): reviewImport(), toStored(), LOW_RISK_ACTIONS, AUTO_ACCEPT_MIN_CONFIDENCE, CONTEXT_PATH, contextFingerprint(), IMPORTED_MEMORY, isAutoAcceptable() (+10 more)

### Community 18 - "contacts.ts"
Cohesion: 0.07
Nodes (54): applicationsCsv(), byCompany(), CompanyRow, funnel(), FunnelStep, Metric, OutreachStats, outreachStats() (+46 more)

### Community 19 - "Form Field Primitives"
Cohesion: 0.13
Nodes (21): ChoiceGroup(), ChoiceGroupProps, FieldShell(), FieldShellProps, TextAreaField(), TextAreaFieldProps, TextFieldProps, PROFICIENCIES (+13 more)

### Community 20 - "context.ts"
Cohesion: 0.22
Nodes (17): Read-time learning from decisions, Applied tracking and feedback learning (in-browser re-ranking), applicationEntry(), buildAiContext(), candidateSection(), clip(), clipAll(), dayOf() (+9 more)

### Community 22 - "package.json"
Cohesion: 0.18
Nodes (10): oxlint@^1.89.0, @types/node@^24.19.2, typescript@~7.0.2, name, private, type, version, oxlint (+2 more)

### Community 23 - "App.tsx"
Cohesion: 0.19
Nodes (6): App(), renderAt(), createAppRouter(), routes, AiProvider(), renderAt()

### Community 24 - "Recovery Runbook"
Cohesion: 0.09
Nodes (20): Backup file format v1 (jobintel-backup), Procedure: data gone, restore from encrypted backup, Import says "newer JobIntel" / unsupported version, Procedure: local data shows an error after update, Local data shows an error after an update, My data is gone (new browser, cleared site data, new device), Procedure: backup from newer JobIntel version, Probe and fix failing board (collector/probe.ts) (+12 more)

### Community 25 - "Graph Refresh Workflow"
Cohesion: 0.09
Nodes (22): concurrency, cancel-in-progress, group, jobs, refresh, name, on, push (+14 more)

### Community 26 - "Collector Tests"
Cohesion: 0.15
Nodes (17): RawJob, SourceConfig, ASHBY, GH, LEVER, sourceA, sourceB, classifyLocations() (+9 more)

### Community 27 - "auto-sources.yml"
Cohesion: 0.10
Nodes (21): concurrency, cancel-in-progress, group, jobs, verify-and-merge, name, on, push (+13 more)

### Community 28 - "feedSchema.ts"
Cohesion: 0.12
Nodes (21): collect(), configSchema, here, loadSources(), main(), readPrevious(), serializeFeed(), sourcesSchema (+13 more)

### Community 29 - "Product Plan Concepts"
Cohesion: 0.17
Nodes (15): A5: Referral research and lead proposals, Analytics metrics and honesty requirements, Core application shell (header and sidebar), Application status lifecycle, Evidence over guesses, Human approval for external actions, Product navigation and information architecture, Outreach strategies and drafting rules (+7 more)

### Community 30 - "App TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 31 - "ATS Adapters"
Cohesion: 0.27
Nodes (17): arr(), Fetcher, obj(), parseAshby(), parseGreenhouse(), parseLever(), PARSERS, sections() (+9 more)

### Community 32 - "Readiness Score"
Cohesion: 0.18
Nodes (10): Readiness score weighted checklist, Profile readiness score, calculateReadiness(), CHECKLIST_GROUPS, ChecklistGroupId, MIN_PRIMARY_SKILLS, Readiness, READINESS_RULES (+2 more)

### Community 33 - "Collector TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 34 - "AI Layers and Hand-off"
Cohesion: 0.17
Nodes (10): buildAiContext allowlist (domain/ai/context.ts), planApply (re-reads live record on accept), Preview + per-export consent, Review lifecycle, Six-layer AI architecture, AI test map, AI Assistant (A1), Assistant page (#/assistant) (+2 more)

### Community 37 - "Routing and Navigation"
Cohesion: 0.24
Nodes (7): APP_VERSION, AppShell(), Header(), HeaderProps, initialsFor(), isMacPlatform(), Sidebar()

### Community 38 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 39 - "AI Integration Options and Roadmap"
Cohesion: 0.18
Nodes (12): A1 — Foundation ✅, A5 — Referral research and evidence-based outreach, A6 — Resume analysis and tailoring, A7 — Application status from email, A8 — Adaptive preparation, AI automation: roadmap, Cross-cutting backlog, Decisions I need from you before A2/A3 (+4 more)

### Community 40 - "DashboardPage.tsx"
Cohesion: 0.13
Nodes (24): Where things live (so you can skip exploring), useNow(), describeLearning(), hasSignals(), newJobs(), relativeTime(), nextScheduledScan(), SCAN_TIMES_UTC (+16 more)

### Community 41 - "ExportPanel.tsx"
Cohesion: 0.33
Nodes (11): approxTokens(), chatPrompt(), exportRecordOf(), serializeContext(), useAiExports(), useAutomationSettings(), ExportPanel(), NEVER (+3 more)

### Community 42 - "E2E Smoke and Workflow"
Cohesion: 0.18
Nodes (5): PAGES, @axe-core/playwright@^4.14.0, @playwright/test@^1.64.1, @axe-core/playwright, @playwright/test

### Community 43 - "AutomationPanel.tsx"
Cohesion: 0.21
Nodes (10): DEFAULT_EXPORT_OPTIONS, ExportOptions, MAX_TOP_MATCHES, AutomationPanel(), DEFAULT_REPO, FRESH, when(), Switch (+2 more)

### Community 44 - "actions.ts"
Cohesion: 0.05
Nodes (93): 2. What the existing code gave us (reused as is), ApplyContext, normName(), normUrl(), planApply(), refFor(), refuse(), STAGE_RANK (+85 more)

### Community 46 - "profile/schema.ts"
Cohesion: 0.17
Nodes (10): COMPANY_TYPES, Compensation, compensationSchema, PROFILE_ID, shortText, skillList, skillSchema, tag (+2 more)

### Community 47 - "Match Engine Tests"
Cohesion: 0.27
Nodes (11): aliasRegex(), blank(), BY_ALIAS, canonicalSkill(), COMPILED, escape(), mentionsSkill(), SkillDef (+3 more)

### Community 48 - "Record Repository Interface"
Cohesion: 0.15
Nodes (7): Provider, useRecords, createRecordContext(), Provider(), RecordContextValue, Repo, contactsRepository

### Community 49 - "AI Integration Options and Roadmap (2)"
Cohesion: 0.20
Nodes (10): A4 — Company and ATS-board discovery, GitHub Actions least-privilege permissions, Residual risks, Security & privacy review (Phase 9), auto-sources.yml board discovery merge, Public feed contract (feedSchema.ts), Phase 2: job discovery, Phase 7: scheduled automation and reminders (+2 more)

### Community 50 - "App Shell and IndexedDB Tests (2)"
Cohesion: 0.21
Nodes (11): AUTOMATION_ID, automationSettingsSchema, ExportRecord, storedBriefingSchema, storedRecommendationSchema, Provider, useRecords, aiBriefingsRepository (+3 more)

### Community 51 - "AI Integration Options and Roadmap (3)"
Cohesion: 0.14
Nodes (11): Claude Code Routines (scheduled tasks), Fine-grained GitHub token credential, Claude integration options (hand-off, Routines, setup-token, API, connectors), Private repo sync (context/latest.json, profile/resume.md), Subscription token (claude setup-token), Subscription cost implications, A2: Local scheduled runs, A3 — Cloud scheduled tasks for the daily briefing (+3 more)

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
Cohesion: 0.39
Nodes (7): feedSchema, FeedState, feedUrl(), JobFeedContext, JobFeedContextValue, loadFeed(), JobFeedProvider()

### Community 56 - "AI Privacy Boundaries"
Cohesion: 0.15
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

### Community 61 - "devDependencies"
Cohesion: 0.18
Nodes (11): devDependencies, fake-indexeddb@^6.2.7, jsdom@^30.1.3, @testing-library/user-event@^14.6.8, @types/react@^19.3.0, @types/react-dom@^19.3.0, vitest@^5.0.5, jsdom (+3 more)

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
Cohesion: 0.31
Nodes (10): Dashboard screen, CandidateProfile data schema, Delivery roadmap (Phases 0-9), Encrypted backup export/import (Web Crypto AES-GCM + PBKDF2), Dashboard KPI strip, Phase 0 - Repository and architecture verification, Phase 1 - Static app shell, dark UX, local profile, Phase 9 - Reliability, security and polish (+2 more)

### Community 66 - "Vite Build and CSP"
Cohesion: 0.29
Nodes (5): vite@^8.3.5, @vitejs/plugin-react@^6.1.2, vite, @vitejs/plugin-react, CSP

### Community 67 - "syncCycle.test.ts"
Cohesion: 0.25
Nodes (9): AiContextBundle, AI_CONTEXT_FORMAT, AutomationSettings, StoredBriefing, StoredRecommendation, SyncDeps, baseSettings(), deps() (+1 more)

### Community 68 - "Visual Design System"
Cohesion: 0.50
Nodes (5): CSS color tokens, Interaction and accessibility details, Layout and responsive behavior, Approved visual direction (dark-only blue/cyan), Dark color-scheme and theme-color #070B12

### Community 69 - "Lint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 70 - "react"
Cohesion: 0.33
Nodes (7): react, Command, CommandPalette(), COMMANDS, PaletteDialog(), DialogProps, useDialogFocus()

### Community 73 - "Phase 1 Shell"
Cohesion: 0.67
Nodes (3): Backups AES-256-GCM, PBKDF2-SHA-256 600k, Encrypted backup (AES-GCM + PBKDF2), Phase 1: app shell, dark UX, local profile

### Community 74 - "Favicon Brand"
Cohesion: 0.67
Nodes (3): JobIntel browser tab / app favicon, Favicon dark navy and cyan-blue brand palette, JobIntel Favicon Logo (stylized J on dark rounded square)

### Community 82 - "location.ts"
Cohesion: 0.36
Nodes (7): LocationInfo, CITY_ORDER, CITY_PATTERNS, City, JobWorkMode, JobFilters, ProfilePreferences

### Community 83 - "AI automation: architecture (Phase A1)"
Cohesion: 0.22
Nodes (9): 1. Summary, 4. Privacy boundaries, 5. Threat model for AI output, 6. Integration options, limits and cost, 7. Where I departed from the brief's assumptions, 8. Smallest viable implementation (what A1 includes and excludes), 9. Test map, AI automation: architecture (Phase A1) (+1 more)

### Community 84 - "TagInput.tsx"
Cohesion: 0.44
Nodes (6): TagInput(), TagInputProps, LIMITS, splitTagInput(), TagResult, validateTag()

### Community 85 - "CandidateProfile"
Cohesion: 0.46
Nodes (6): CandidateProfile, ProfileProvider(), LoadState, ProfileContext, ProfileContextValue, clearUiPreferences()

### Community 86 - "JobIntel architecture (v0.9)"
Cohesion: 0.27
Nodes (8): graph.yml workflow, JobIntel — agent guide, Project rules that are not derivable from code, Use the knowledge graph first — do NOT read the whole repo, JobIntel architecture (v0.9), JobIntel README, TODO.md (Implementation status), AI automation track A1-A8

### Community 88 - "AiSyncAgent.tsx"
Cohesion: 0.33
Nodes (6): PULL_INTERVAL_MS, AiSyncAgent(), newId(), SYNC_DONE_EVENT, SYNC_NOW_EVENT, SyncReport

### Community 89 - "@testing-library/react"
Cohesion: 0.40
Nodes (4): @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, @testing-library/jest-dom, @testing-library/react

## Knowledge Gaps
- **56 isolated node(s):** `IndexedDB storage with append-only migrations`, `Follow-up limit (2, a week apart, none after reply)`, `ReminderAgent`, `Applied tracking and feedback learning (in-browser re-ranking)`, `Procedure: local data shows an error after update` (+51 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 527 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `JobIntel architecture (v0.9)` connect `JobIntel architecture (v0.9)` to `aiRepository.test.ts`, `DashboardPage.tsx`, `Fit Score Factors`, `actions.ts`, `AI Recommendation Schema`, `Match Engine Tests`, `OutreachPage.tsx`, `Record Repository Interface`, `contacts.ts`, `AI Privacy Boundaries`?**
  _High betweenness centrality (0.080) - this node is a cross-community bridge._
- **What connects `IndexedDB storage with append-only migrations`, `Follow-up limit (2, a week apart, none after reply)`, `ReminderAgent` to the rest of the system?**
  _56 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `aiRepository.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.14059196617336153 - nodes in this community are weakly interconnected._
- **Why does `react` connect `react` to `AI Assistant Hooks`, `Data Privacy and Backup UI`, `OutreachPage.tsx`, `ProfilePage.tsx`, `contacts.ts`, `Form Field Primitives`, `package.json`, `App.tsx`, `Routing and Navigation`, `DashboardPage.tsx`, `ExportPanel.tsx`, `AutomationPanel.tsx`, `actions.ts`, `Record Repository Interface`, `Job Feed Loading`, `Runtime Dependencies`, `TagInput.tsx`, `CandidateProfile`, `AiSyncAgent.tsx`, `AiProvider.tsx`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `Scan Workflow (scan.yml)` be split into smaller, more focused modules?**
  _Cohesion score 0.04717853839037928 - nodes in this community are weakly interconnected._
- **Why does `Phase 9 - Reliability, security and polish` connect `Dashboard and Backup Features` to `AI Privacy Boundaries (2)`, `JobIntel architecture (v0.9)`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Should `Pages Deploy Workflow` be split into smaller, more focused modules?**
  _Cohesion score 0.046511627906976744 - nodes in this community are weakly interconnected._