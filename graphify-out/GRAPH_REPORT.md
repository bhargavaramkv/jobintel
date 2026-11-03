# Graph Report - jobintel  (2026-11-03)

## Corpus Check
- 88 files · ~187,583 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 9 file(s) not represented in the graph (top: .css 6, (none) 3)

## Summary
- 697 nodes · 1500 edges · 34 communities (33 shown, 1 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 47 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `45746c4c`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Routing & Job Assessment
- Dev Tooling & E2E Tests
- React Dependencies & App Shell
- Job Actions & Decisions
- Pages Deploy Workflow
- Data Privacy Dialogs
- Scan Workflow
- Storage & Unit Tests
- Collector Fetch & Filters
- Form Field Components
- App tsconfig
- Profile Navigation
- Profile Form Drafts
- Collector tsconfig
- ATS Adapters
- Node tsconfig
- Location & Feed Merge
- Roadmap Phases & IA
- Profile Readiness Rules
- Collector Tests & Types
- Phase 1 Specs
- Feed Schema & Zod
- Profile Schema
- Architecture Decisions & Build Check
- Product Plan & Principles
- Job Discovery Pipeline
- Phase 2 & Automation Docs
- Tag Input
- Storage & Phase 3 Docs
- Visual Design & Shell
- README & Stack
- Oxlint Config
- Favicon Brand
- Root tsconfig

## God Nodes (most connected - your core abstractions)
1. `react` - 22 edges
2. `DashboardPage()` - 20 edges
3. `ProfileEditor()` - 19 edges
4. `compilerOptions` - 18 edges
5. `FeedView()` - 17 edges
6. `compilerOptions` - 17 edges
7. `compilerOptions` - 15 edges
8. `useProfile()` - 14 edges
9. `lucide-react` - 13 edges
10. `vitest` - 13 edges

## Surprising Connections (you probably didn't know these)
- `Where things live (so you can skip exploring)` --references--> `ProfileEditor()`  [INFERRED]
  CLAUDE.md → src/features/profile/ProfilePage.tsx
- `Where things live (so you can skip exploring)` --references--> `DashboardPage()`  [INFERRED]
  CLAUDE.md → src/features/dashboard/DashboardPage.tsx
- `Where things live (so you can skip exploring)` --references--> `FeedView()`  [INFERRED]
  CLAUDE.md → src/features/jobs/JobsPage.tsx
- `Privacy model (public site, local data)` --semantically_similar_to--> `Public-site and privacy warning`  [INFERRED] [semantically similar]
  README.md → docs/IMPLEMENTATION_PLAN.md
- `Job discovery (Phase 2)` --semantically_similar_to--> `Job discovery pipeline`  [INFERRED] [semantically similar]
  README.md → docs/ARCHITECTURE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Job discovery pipeline (scan.yml, collector, feed schema, jobs.json, pages.yml)** — docs_architecture_scan_yml, collector_run, docs_architecture_feed_schema, docs_architecture_jobs_json, docs_architecture_pages_yml [EXTRACTED 1.00]
- **Browser-side feedback learning flow** — readme_applied_tracking_and_feedback, todo_applied_tracking_and_feedback_learning, docs_architecture_decisions_and_learning, docs_architecture_feedback_ts [INFERRED 0.85]
- **Local-first privacy model across docs** — readme_privacy_model, readme_encrypted_backup, docs_implementation_plan_public_site_privacy_warning, docs_architecture_backup_file_format, scripts_check_dist, index_no_referrer_meta [INFERRED 0.85]

## Communities (34 total, 1 thin omitted)

### Community 0 - "Routing & Job Assessment"
Cohesion: 0.05
Nodes (87): Where things live (so you can skip exploring), routes, useNow(), base(), Decision, DECISIONS, JobAction, JobRef (+79 more)

### Community 1 - "Dev Tooling & E2E Tests"
Cohesion: 0.05
Nodes (44): zod@^4.6.7, devDependencies, fake-indexeddb@^6.2.7, jsdom@^30.1.3, oxlint@^1.89.0, @playwright/test@^1.64.1, @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3 (+36 more)

### Community 2 - "React Dependencies & App Shell"
Cohesion: 0.06
Nodes (39): dependencies, lucide-react@^1.66.0, react@^19.3.1, react-dom@^19.3.1, react-router-dom@^7.18.5, lucide-react, react, react-dom (+31 more)

### Community 3 - "Job Actions & Decisions"
Cohesion: 0.50
Nodes (3): JobIntel — agent guide, Project rules that are not derivable from code, Use the knowledge graph first — do NOT read the whole repo

### Community 4 - "Pages Deploy Workflow"
Cohesion: 0.05
Nodes (43): concurrency, cancel-in-progress, group, environment, if, needs, permissions, runs-on (+35 more)

### Community 5 - "Data Privacy Dialogs"
Cohesion: 0.12
Nodes (31): Dialog(), TextField(), jobActionSchema, candidateProfileSchema, ClearDialog(), DataPrivacySection(), DataPrivacySectionProps, ExportDialog() (+23 more)

### Community 6 - "Scan Workflow"
Cohesion: 0.06
Nodes (33): concurrency, cancel-in-progress, group, if, needs, permissions, uses, with (+25 more)

### Community 7 - "Storage & Unit Tests"
Cohesion: 0.17
Nodes (21): vitest, DB_NAME, DB_VERSION, SCHEMA_VERSION, STORES, openDatabase(), requestToPromise(), resetDatabaseConnection() (+13 more)

### Community 8 - "Collector Fetch & Filters"
Cohesion: 0.13
Nodes (22): apiUrl(), fetchSource(), opts(), makeTitleFilter(), TitleFilter, toRegex(), args, config (+14 more)

### Community 9 - "Form Field Components"
Cohesion: 0.15
Nodes (18): ChoiceGroup(), FieldShell(), FieldShellProps, TextAreaField(), TextAreaFieldProps, TextFieldProps, COMPANY_TYPES, PROFICIENCIES (+10 more)

### Community 10 - "App tsconfig"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 11 - "Profile Navigation"
Cohesion: 0.17
Nodes (17): isProfileSection(), draftFromProfile(), draftsEqual(), calculateReadiness(), createEmptyProfile(), Notice, EditorProps, FIELD_SECTION (+9 more)

### Community 12 - "Profile Form Drafts"
Cohesion: 0.19
Nodes (14): DraftErrors, DraftResult, NumberParse, optionalText(), parseOptionalNumber(), ProfileDraft, profileFromDraft(), base (+6 more)

### Community 13 - "Collector tsconfig"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 14 - "ATS Adapters"
Cohesion: 0.30
Nodes (15): arr(), Fetcher, obj(), parseAshby(), parseGreenhouse(), parseLever(), PARSERS, str() (+7 more)

### Community 15 - "Node tsconfig"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 16 - "Location & Feed Merge"
Cohesion: 0.25
Nodes (13): classifyLocations(), LocationInfo, normalizeWorkMode(), dedupeKey(), mergeFeed(), MergeOptions, sourceKey(), toJob() (+5 more)

### Community 17 - "Roadmap Phases & IA"
Cohesion: 0.18
Nodes (16): Product navigation and IA, Phase 0: repository and architecture verification, Phase 4: referral intelligence, Phase 5: outreach and referral strategist, Phase 6: application management, Phase 8: analytics and career strategist, Phase 9: reliability, security and polish, Delivery roadmap Phases 0-9 (+8 more)

### Community 18 - "Profile Readiness Rules"
Cohesion: 0.19
Nodes (11): CHECKLIST_GROUPS, ChecklistGroupId, MIN_PRIMARY_SKILLS, Readiness, READINESS_RULES, ReadinessRule, RuleResult, CandidateProfile (+3 more)

### Community 19 - "Collector Tests & Types"
Cohesion: 0.16
Nodes (9): RawJob, SourceConfig, ASHBY, GH, LEVER, sourceA, sourceB, SourceResult (+1 more)

### Community 20 - "Phase 1 Specs"
Cohesion: 0.18
Nodes (14): Backup file format v1, Readiness score weights, Encrypted backup behavior spec, Dashboard Phase 1 screen spec, CandidateProfile data model, Phase 1: static app shell, dark UX, local profile, Candidate profile and preferences spec, Public-site and privacy warning (+6 more)

### Community 21 - "Feed Schema & Zod"
Cohesion: 0.22
Nodes (9): CITY_VALUES, FEED_FORMAT_VERSION, JOB_WORK_MODES, JobFeed, jobSchema, SourceHealth, sourceHealthSchema, makeFeed() (+1 more)

### Community 22 - "Profile Schema"
Cohesion: 0.17
Nodes (10): Compensation, compensationSchema, Proficiency, PROFILE_ID, shortText, skillList, skillSchema, tag (+2 more)

### Community 23 - "Architecture Decisions & Build Check"
Cohesion: 0.18
Nodes (8): Architecture decisions table, feedSchema.ts shared contract, domain/jobs/feedback.ts (learnFromActions, assessJob), public/data/jobs.json, DIST, SECRET_PATTERNS, TRACKER_PATTERNS, walk()

### Community 24 - "Product Plan & Principles"
Cohesion: 0.24
Nodes (9): JobIntel Product, UX and Implementation Plan, Phase 1 acceptance checklist, Definition of success, Official GitHub Pages/Actions references, GitHub Pages architecture constraints, Development workflow guardrails, What we are explicitly not building, Phase 1 implementation spec and non-goals (+1 more)

### Community 25 - "Job Discovery Pipeline"
Cohesion: 0.22
Nodes (9): Job discovery pipeline, pages.yml workflow, scan.yml workflow, Greenhouse, Lever, Ashby public APIs, collector/ (GitHub Actions scanner), Job discovery (Phase 2), public/data/jobs.json feed, collector/sources.json (+1 more)

### Community 26 - "Phase 2 & Automation Docs"
Cohesion: 0.25
Nodes (9): Future job-discovery on GitHub Actions, Phase 2: job discovery engine, Phase 7: scheduled automation and notifications, Responsibility boundaries by layer, Runtime architecture diagram, Closed job detection and 14-day pruning, Phase 2 status: job discovery (done), Phase 7 status: scheduled automation (scan done) (+1 more)

### Community 27 - "Tag Input"
Cohesion: 0.44
Nodes (6): TagInput(), TagInputProps, LIMITS, splitTagInput(), TagResult, validateTag()

### Community 28 - "Storage & Phase 3 Docs"
Cohesion: 0.43
Nodes (7): JobIntel Architecture doc (v0.1), Decisions and learning (IndexedDB v2 jobActions), Future phases pointer (Phase 3), Source layers (app, components, features, domain, storage, styles), IndexedDB storage and migrations, Phase 3: job intelligence and matching engine, Phase 3 status: matching engine (not started)

### Community 29 - "Visual Design & Shell"
Cohesion: 0.40
Nodes (6): Color tokens, Responsive layout and app shell, Approved dark blue/cyan visual direction, index.html (Vite entry), Dark color-scheme and theme-color #070B12, favicon.svg

### Community 30 - "README & Stack"
Cohesion: 0.40
Nodes (6): Recommended stack (React, Vite, Zod, Vitest, Playwright), JobIntel README, check:dist script, Deployment via pages.yml, Development commands, HashRouter routing

### Community 31 - "Oxlint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 32 - "Favicon Brand"
Cohesion: 0.67
Nodes (3): JobIntel browser tab / app favicon, Favicon dark navy and cyan-blue brand palette, JobIntel Favicon Logo (stylized J on dark rounded square)

## Ambiguous Edges - Review These
- `What we are explicitly not building` → `Phase 1 implementation spec and non-goals`  [AMBIGUOUS]
  docs/IMPLEMENTATION_PLAN.md · relation: conceptually_related_to

## Knowledge Gaps
- **13 isolated node(s):** `Product navigation and IA`, `Phase 0: repository and architecture verification`, `CandidateProfile data model`, `Phase 1 acceptance checklist`, `Definition of success` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 245 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `React Dependencies & App Shell` to `Routing & Job Assessment`, `Dev Tooling & E2E Tests`, `Data Privacy Dialogs`, `Form Field Components`, `Profile Navigation`, `Profile Readiness Rules`, `Tag Input`?**
  _High betweenness centrality (0.078) - this node is a cross-community bridge._
- **What connects `Product navigation and IA`, `Phase 0: repository and architecture verification`, `CandidateProfile data model` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Routing & Job Assessment` be split into smaller, more focused modules?**
  _Cohesion score 0.05349324195697697 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `Dev Tooling & E2E Tests` to `Routing & Job Assessment`, `Data Privacy Dialogs`, `Collector Fetch & Filters`, `Feed Schema & Zod`, `Profile Schema`?**
  _High betweenness centrality (0.075) - this node is a cross-community bridge._
- **Should `Dev Tooling & E2E Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.05176470588235294 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Storage & Unit Tests` to `Routing & Job Assessment`, `Dev Tooling & E2E Tests`, `Data Privacy Dialogs`, `Profile Form Drafts`, `Collector Tests & Types`, `Tag Input`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `What we are explicitly not building` and `Phase 1 implementation spec and non-goals`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._