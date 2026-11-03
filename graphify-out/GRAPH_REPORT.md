# Graph Report - jobintel  (2026-11-03)

## Corpus Check
- 125 files · ~215,056 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: .css 10, (none) 3)

## Summary
- 1018 nodes · 2526 edges · 46 communities (45 shown, 1 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 52 edges (avg confidence: 0.86)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4889a740`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- actions.ts
- package.json
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
- DashboardPage.tsx
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
- OutreachPage.tsx
- contacts.ts
- score.ts
- analytics.ts
- graph.yml
- merge.ts
- @playwright/test
- devDependencies
- scripts
- Recovery guide
- fake-indexeddb
- vite.config.ts

## God Nodes (most connected - your core abstractions)
1. `react` - 31 edges
2. `DashboardPage()` - 30 edges
3. `stageOf()` - 29 edges
4. `FeedView()` - 23 edges
5. `useProfile()` - 23 edges
6. `useJobActions()` - 22 edges
7. `vitest` - 21 edges
8. `Composer()` - 21 edges
9. `matchJob()` - 19 edges
10. `CandidateProfile` - 19 edges

## Surprising Connections (you probably didn't know these)
- `Use the knowledge graph first — do NOT read the whole repo` --references--> `main()`  [INFERRED]
  CLAUDE.md → collector/run.ts
- `Where things live (so you can skip exploring)` --references--> `ProfileEditor()`  [INFERRED]
  CLAUDE.md → src/features/profile/ProfilePage.tsx
- `Where things live (so you can skip exploring)` --references--> `DashboardPage()`  [INFERRED]
  CLAUDE.md → src/features/dashboard/DashboardPage.tsx
- `Where things live (so you can skip exploring)` --references--> `FeedView()`  [INFERRED]
  CLAUDE.md → src/features/jobs/JobsPage.tsx
- `Privacy model (public site, local data)` --semantically_similar_to--> `Public-site and privacy warning`  [INFERRED] [semantically similar]
  README.md → docs/IMPLEMENTATION_PLAN.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Job discovery pipeline (scan.yml, collector, feed schema, jobs.json, pages.yml)** — docs_architecture_scan_yml, collector_run, docs_architecture_feed_schema, docs_architecture_jobs_json, docs_architecture_pages_yml [EXTRACTED 1.00]
- **Browser-side feedback learning flow** — readme_applied_tracking_and_feedback, todo_applied_tracking_and_feedback_learning, docs_architecture_decisions_and_learning, docs_architecture_feedback_ts [INFERRED 0.85]
- **Local-first privacy model across docs** — readme_privacy_model, readme_encrypted_backup, docs_implementation_plan_public_site_privacy_warning, docs_architecture_backup_file_format, scripts_check_dist, index_no_referrer_meta [INFERRED 0.85]

## Communities (46 total, 1 thin omitted)

### Community 0 - "actions.ts"
Cohesion: 0.05
Nodes (92): ref(), applicationsOf(), dueApplicationFollowUps(), findDuplicate(), FollowUp, groupByStage(), manualRef(), norm() (+84 more)

### Community 1 - "package.json"
Cohesion: 0.18
Nodes (10): oxlint@^1.89.0, @testing-library/user-event@^14.6.8, @types/node@^24.19.2, name, private, type, version, oxlint (+2 more)

### Community 2 - "React Dependencies & App Shell"
Cohesion: 0.09
Nodes (24): dependencies, lucide-react@^1.66.0, react@^19.3.1, react-dom@^19.3.1, react-router-dom@^7.18.5, react, react-dom, App() (+16 more)

### Community 3 - "Job Actions & Decisions"
Cohesion: 0.50
Nodes (3): JobIntel — agent guide, Project rules that are not derivable from code, Use the knowledge graph first — do NOT read the whole repo

### Community 4 - "Pages Deploy Workflow"
Cohesion: 0.05
Nodes (43): concurrency, cancel-in-progress, group, environment, if, needs, permissions, runs-on (+35 more)

### Community 5 - "Data Privacy Dialogs"
Cohesion: 0.09
Nodes (34): Dialog(), TextField(), ClearDialog(), DataPrivacySection(), DataPrivacySectionProps, ExportDialog(), ImportDialog(), downloadJson() (+26 more)

### Community 6 - "Scan Workflow"
Cohesion: 0.05
Nodes (46): if, needs, permissions, runs-on, steps, concurrency, cancel-in-progress, group (+38 more)

### Community 7 - "Storage & Unit Tests"
Cohesion: 0.17
Nodes (21): vitest, DB_NAME, DB_VERSION, SCHEMA_VERSION, STORES, openDatabase(), requestToPromise(), resetDatabaseConnection() (+13 more)

### Community 8 - "Collector Fetch & Filters"
Cohesion: 0.13
Nodes (21): apiUrl(), fetchSource(), args, config, fetcher, keep, rows, collect() (+13 more)

### Community 9 - "Form Field Components"
Cohesion: 0.13
Nodes (22): lucide-react, ChoiceGroup(), ChoiceGroupProps, FieldShell(), FieldShellProps, TextAreaField(), TextAreaFieldProps, TextFieldProps (+14 more)

### Community 10 - "App tsconfig"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 11 - "Profile Navigation"
Cohesion: 0.17
Nodes (15): isProfileSection(), NAV_ITEMS, NavItem, PROFILE_SECTIONS, ProfileSectionId, DraftErrors, createEmptyProfile(), Notice (+7 more)

### Community 12 - "Profile Form Drafts"
Cohesion: 0.19
Nodes (15): draftFromProfile(), DraftResult, draftsEqual(), NumberParse, optionalText(), parseOptionalNumber(), ProfileDraft, profileFromDraft() (+7 more)

### Community 13 - "Collector tsconfig"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 14 - "ATS Adapters"
Cohesion: 0.27
Nodes (17): arr(), Fetcher, obj(), parseAshby(), parseGreenhouse(), parseLever(), PARSERS, sections() (+9 more)

### Community 15 - "Node tsconfig"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 16 - "DashboardPage.tsx"
Cohesion: 0.05
Nodes (70): Where things live (so you can skip exploring), LocationInfo, MergeOptions, react-router-dom, routes, APP_VERSION, AppShell(), CommandPalette() (+62 more)

### Community 17 - "Roadmap Phases & IA"
Cohesion: 0.18
Nodes (16): Product navigation and IA, Phase 0: repository and architecture verification, Phase 4: referral intelligence, Phase 5: outreach and referral strategist, Phase 6: application management, Phase 8: analytics and career strategist, Phase 9: reliability, security and polish, Delivery roadmap Phases 0-9 (+8 more)

### Community 18 - "Profile Readiness Rules"
Cohesion: 0.17
Nodes (12): calculateReadiness(), CHECKLIST_GROUPS, ChecklistGroupId, MIN_PRIMARY_SKILLS, Readiness, READINESS_RULES, ReadinessRule, RuleResult (+4 more)

### Community 19 - "Collector Tests & Types"
Cohesion: 0.16
Nodes (9): ASHBY, GH, LEVER, opts(), sourceA, sourceB, makeTitleFilter(), TitleFilter (+1 more)

### Community 20 - "Phase 1 Specs"
Cohesion: 0.18
Nodes (14): Backup file format v1, Readiness score weights, Encrypted backup behavior spec, Dashboard Phase 1 screen spec, CandidateProfile data model, Phase 1: static app shell, dark UX, local profile, Candidate profile and preferences spec, Public-site and privacy warning (+6 more)

### Community 21 - "Feed Schema & Zod"
Cohesion: 0.13
Nodes (15): zod@^4.6.7, zod, ATS_LABEL, CITY_VALUES, FEED_FORMAT_VERSION, JOB_WORK_MODES, JobFeed, jobSchema (+7 more)

### Community 22 - "Profile Schema"
Cohesion: 0.17
Nodes (10): COMPANY_TYPES, Compensation, compensationSchema, PROFICIENCIES, PROFILE_ID, shortText, skillList, skillSchema (+2 more)

### Community 23 - "Architecture Decisions & Build Check"
Cohesion: 0.18
Nodes (8): Architecture decisions table, DIST, indexHtml, SECRET_PATTERNS, TRACKER_PATTERNS, walk(), SCAN_TIMES_UTC, scheduleCron()

### Community 24 - "Product Plan & Principles"
Cohesion: 0.24
Nodes (9): JobIntel Product, UX and Implementation Plan, Phase 1 acceptance checklist, Definition of success, Official GitHub Pages/Actions references, GitHub Pages architecture constraints, Development workflow guardrails, What we are explicitly not building, Phase 1 implementation spec and non-goals (+1 more)

### Community 25 - "Job Discovery Pipeline"
Cohesion: 0.22
Nodes (9): Job discovery pipeline, pages.yml workflow, scan.yml workflow, Greenhouse, Lever, Ashby public APIs, collector/ (GitHub Actions scanner), Job discovery (Phase 2), public/data/jobs.json feed, collector/sources.json (+1 more)

### Community 26 - "Phase 2 & Automation Docs"
Cohesion: 0.18
Nodes (12): feedSchema.ts shared contract, domain/jobs/feedback.ts (learnFromActions, assessJob), public/data/jobs.json, Future job-discovery on GitHub Actions, Phase 2: job discovery engine, Phase 7: scheduled automation and notifications, Responsibility boundaries by layer, Runtime architecture diagram (+4 more)

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
Cohesion: 0.25
Nodes (8): Recommended stack (React, Vite, Zod, Vitest, Playwright), Residual risks, Security & privacy review (Phase 9), JobIntel README, check:dist script, Deployment via pages.yml, Development commands, HashRouter routing

### Community 31 - "Oxlint Config"
Cohesion: 0.33
Nodes (5): plugins, rules, react/only-export-components, react/rules-of-hooks, $schema

### Community 32 - "Favicon Brand"
Cohesion: 0.67
Nodes (3): JobIntel browser tab / app favicon, Favicon dark navy and cyan-blue brand palette, JobIntel Favicon Logo (stylized J on dark rounded square)

### Community 34 - "OutreachPage.tsx"
Cohesion: 0.08
Nodes (46): aboutMe(), addDays(), allowedStrategies(), askLine(), Channel, CHANNELS, contextLine(), Draft (+38 more)

### Community 35 - "contacts.ts"
Cohesion: 0.09
Nodes (35): familiesOf(), DraftInput, CompanyFocus, Confidence, Contact, CONTACT_LIMITS, contactSchema, httpUrl (+27 more)

### Community 36 - "score.ts"
Cohesion: 0.10
Nodes (38): BAND_LABEL, bandOf(), cap(), experienceFactor(), factor(), FactorId, FactorResult, FACTORS (+30 more)

### Community 37 - "analytics.ts"
Cohesion: 0.19
Nodes (24): applicationsCsv(), byCompany(), CompanyRow, funnel(), FunnelStep, Metric, OutreachStats, outreachStats() (+16 more)

### Community 38 - "graph.yml"
Cohesion: 0.09
Nodes (22): concurrency, cancel-in-progress, group, jobs, refresh, name, on, push (+14 more)

### Community 39 - "merge.ts"
Cohesion: 0.30
Nodes (11): RawJob, SourceConfig, classifyLocations(), normalizeWorkMode(), dedupeKey(), mergeFeed(), sourceKey(), SourceResult (+3 more)

### Community 40 - "@playwright/test"
Cohesion: 0.18
Nodes (5): PAGES, @axe-core/playwright@^4.14.0, @playwright/test@^1.64.1, @axe-core/playwright, @playwright/test

### Community 41 - "devDependencies"
Cohesion: 0.20
Nodes (10): devDependencies, jsdom@^30.1.3, @types/react@^19.3.0, @types/react-dom@^19.3.0, typescript@~7.0.2, vitest@^5.0.5, jsdom, @types/react (+2 more)

### Community 42 - "scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check:dist, dev, lint, preview, test, test:e2e (+2 more)

### Community 43 - "Recovery guide"
Cohesion: 0.25
Nodes (7): Import says "newer JobIntel" / unsupported version, Local data shows an error after an update, My data is gone (new browser, cleared site data, new device), Recovery guide, Supported browsers, The job feed is stale or empty, The site won't deploy

### Community 44 - "fake-indexeddb"
Cohesion: 0.29
Nodes (6): fake-indexeddb@^6.2.7, @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, fake-indexeddb, @testing-library/jest-dom, @testing-library/react

### Community 45 - "vite.config.ts"
Cohesion: 0.29
Nodes (5): vite@^8.3.5, @vitejs/plugin-react@^6.1.2, vite, @vitejs/plugin-react, CSP

## Ambiguous Edges - Review These
- `What we are explicitly not building` → `Phase 1 implementation spec and non-goals`  [AMBIGUOUS]
  docs/IMPLEMENTATION_PLAN.md · relation: conceptually_related_to

## Knowledge Gaps
- **13 isolated node(s):** `Product navigation and IA`, `Phase 0: repository and architecture verification`, `CandidateProfile data model`, `Phase 1 acceptance checklist`, `Definition of success` (+8 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 349 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `React Dependencies & App Shell` to `actions.ts`, `package.json`, `OutreachPage.tsx`, `contacts.ts`, `analytics.ts`, `Data Privacy Dialogs`, `Form Field Components`, `Profile Navigation`, `DashboardPage.tsx`, `Profile Readiness Rules`, `Tag Input`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **What connects `Product navigation and IA`, `Phase 0: repository and architecture verification`, `CandidateProfile data model` to the rest of the system?**
  _13 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `actions.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05330564209068882 - nodes in this community are weakly interconnected._
- **Why does `zod` connect `Feed Schema & Zod` to `actions.ts`, `package.json`, `OutreachPage.tsx`, `contacts.ts`, `Data Privacy Dialogs`, `Storage & Unit Tests`, `Collector Fetch & Filters`, `Profile Schema`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Should `React Dependencies & App Shell` be split into smaller, more focused modules?**
  _Cohesion score 0.08888888888888889 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `Storage & Unit Tests` to `actions.ts`, `package.json`, `OutreachPage.tsx`, `contacts.ts`, `score.ts`, `analytics.ts`, `Data Privacy Dialogs`, `devDependencies`, `Profile Form Drafts`, `fake-indexeddb`, `DashboardPage.tsx`, `Collector Tests & Types`, `Architecture Decisions & Build Check`, `Tag Input`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._

### Low-confidence Hints
_AMBIGUOUS edges — the extractor was unsure. Verify before acting on these._

- **What is the exact relationship between `What we are explicitly not building` and `Phase 1 implementation spec and non-goals`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._