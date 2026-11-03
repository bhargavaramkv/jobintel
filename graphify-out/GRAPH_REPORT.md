# Graph Report - jobintel  (2026-11-03)

## Corpus Check
- 167 files · ~244,696 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 14 file(s) not represented in the graph (top: .css 11, (none) 3)

## Summary
- 1436 nodes · 3794 edges · 75 communities (70 shown, 5 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 122 edges (avg confidence: 0.87)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `d80b01f4`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- App Shell and IndexedDB Tests
- context.test.ts
- Scan Workflow (scan.yml)
- Pages Deploy Workflow
- Job Actions and Reuse Map
- Data Privacy and Backup UI
- Referral Leads
- JobsPage.tsx
- AI Result Import
- AI Recommendation Schema
- Routing and Navigation
- Analytics Engine
- Form Field Primitives
- Application Pipeline
- feedSchema.ts
- Fit Score Factors
- AI Integration Options and Roadmap
- AI Review Lifecycle
- AutomationPanel.tsx
- Graph Refresh Workflow
- syncCycle.ts
- Outreach Draft Templates
- auto-sources.yml
- App TypeScript Config
- Feedback Learning
- Match Engine Tests
- Collector TypeScript Config
- aiContext.tsx
- Profile Form Conversion
- Outreach Follow-up Policy
- Node TypeScript Config
- AI Apply Rules
- Job Card and Types
- Product Plan Concepts
- Contacts and Reminder Agent
- DashboardPage.tsx
- E2E AI and Schedule Tests
- Recovery Runbook
- ProfilePage.tsx
- Product Principles
- Data Architecture Decisions
- Test Dependencies
- OutreachPage.tsx
- Agent Docs and Graph Policy
- Readiness Score
- Profile Schema
- AI Privacy Boundaries
- E2E Smoke and Workflow
- ExportPanel.tsx
- context.ts
- AI Output Safety
- RecommendationCard.tsx
- Dashboard and Backup Features
- Hosting and Discovery Constraints
- NPM Scripts
- App.tsx
- Backup Format and Recovery
- AI Architecture Sections
- Implementation Plan Phases
- Tag Input
- Runtime Dependencies
- syncCycle.test.ts
- Vite Build and CSP
- Visual Design System
- Lint Config
- Record Repository Interface
- Favicon Brand
- Root TS Config
- Analytics and Prep Phases
- Claude API (Not Used)
- Phase 1 Shell
- filters.test.ts
- useNow
- useJobActions.ts
- validate-ai-result.ts

## God Nodes (most connected - your core abstractions)
1. `react` - 42 edges
2. `stageOf()` - 34 edges
3. `vitest` - 32 edges
4. `DashboardPage()` - 31 edges
5. `useJobActions()` - 30 edges
6. `localDate()` - 28 edges
7. `useProfile()` - 27 edges
8. `lucide-react` - 25 edges
9. `buildAiContext()` - 25 edges
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
- `The contract (schema v1)` --references--> `source()`  [INFERRED]
  docs/AI_AUTOMATION_ARCHITECTURE.md → src/domain/ai/context.test.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **AI output safety controls (untrusted-input defenses)** — docs_ai_automation_architecture_action_whitelist, docs_ai_automation_architecture_per_item_validation, docs_ai_automation_architecture_grounding_rule, docs_ai_automation_architecture_live_record_recheck, docs_ai_automation_architecture_review_lifecycle [EXTRACTED 1.00]
- **Roadmap phases that extend the contract via schema v2** — docs_ai_automation_roadmap_a4_company_and_ats_board_discovery, docs_ai_automation_roadmap_a5_referral_research_and_evidence_based_outreach, docs_ai_automation_roadmap_a6_resume_analysis_and_tailoring, docs_ai_automation_roadmap_a7_application_status_from_email, docs_ai_automation_roadmap_schema_v2 [EXTRACTED 1.00]
- **GitHub Actions public job feed pipeline** — docs_implementation_plan_actions_discovery_architecture, docs_implementation_plan_source_registry, docs_implementation_plan_dedup_normalization, docs_implementation_plan_jobs_json_feed, docs_implementation_plan_pages_deployment_workflow [EXTRACTED 1.00]
- **Local-first privacy boundary** — docs_implementation_plan_local_first_personal_data, docs_implementation_plan_indexeddb_storage, docs_implementation_plan_encrypted_backup, docs_implementation_plan_privacy_model, docs_implementation_plan_public_site_privacy_warning [INFERRED 0.85]
- **Phase 1 foundation deliverables** — docs_implementation_plan_app_shell, docs_implementation_plan_dashboard_screen, docs_implementation_plan_profile_screen, docs_implementation_plan_profile_readiness, docs_implementation_plan_color_tokens [INFERRED 0.85]
- **Public-site guards against leaking data or calling AI services** — docs_security_content_security_policy, docs_security_no_secrets_in_bundle, readme_check_dist, docs_ai_automation_architecture_privacy_boundaries [INFERRED 0.85]

## Communities (75 total, 5 thin omitted)

### Community 0 - "App Shell and IndexedDB Tests"
Cohesion: 0.08
Nodes (48): IndexedDB storage with append-only migrations, fake-indexeddb, @testing-library/react, vitest, storedIdOf(), automationSettingsSchema, exportRecordSchema, storedBriefingSchema (+40 more)

### Community 1 - "context.test.ts"
Cohesion: 0.12
Nodes (18): acme, build(), closed, contact, globex, hidden, hideCompany, initech (+10 more)

### Community 2 - "Scan Workflow (scan.yml)"
Cohesion: 0.05
Nodes (46): if, needs, permissions, runs-on, steps, concurrency, cancel-in-progress, group (+38 more)

### Community 3 - "Pages Deploy Workflow"
Cohesion: 0.05
Nodes (43): concurrency, cancel-in-progress, group, environment, if, needs, permissions, runs-on (+35 more)

### Community 4 - "Job Actions and Reuse Map"
Cohesion: 0.10
Nodes (39): 2. What the existing code gave us (reused as is), ref(), base(), Decision, DECISIONS, hasContent(), Interview, INTERVIEW_KINDS (+31 more)

### Community 5 - "Data Privacy and Backup UI"
Cohesion: 0.12
Nodes (33): Dialog(), TextField(), useAiExports(), useOutreach(), ClearDialog(), DataPrivacySection(), DataPrivacySectionProps, ExportDialog() (+25 more)

### Community 6 - "Referral Leads"
Cohesion: 0.11
Nodes (29): familiesOf(), CompanyFocus, Confidence, CONTACT_LIMITS, contactSchema, httpUrl, LEAD_STATUSES, LeadRank (+21 more)

### Community 7 - "JobsPage.tsx"
Cohesion: 0.18
Nodes (17): LocationInfo, MergeOptions, citiesIn(), CITY_ORDER, CITY_PATTERNS, City, JobWorkMode, DEFAULT_FILTERS (+9 more)

### Community 8 - "AI Result Import"
Cohesion: 0.12
Nodes (24): describe(), extractJson(), fail(), ImportReview, LocalFacts, parseAiResult(), ParsedAiResult, ParseOutcome (+16 more)

### Community 9 - "AI Recommendation Schema"
Cohesion: 0.06
Nodes (32): ACTION_TYPES, ActionType, AI_STAGES, AiResult, AUTOMATION_ID, briefingPrioritySchema, briefingShape, Checkable (+24 more)

### Community 10 - "Routing and Navigation"
Cohesion: 0.16
Nodes (14): react, NAV_ITEMS, NavItem, PROFILE_SECTIONS, ProfileSectionId, AppShell(), Command, CommandPalette() (+6 more)

### Community 11 - "Analytics Engine"
Cohesion: 0.19
Nodes (24): applicationsCsv(), byCompany(), CompanyRow, funnel(), FunnelStep, Metric, OutreachStats, outreachStats() (+16 more)

### Community 12 - "Form Field Primitives"
Cohesion: 0.14
Nodes (14): ChoiceGroupProps, FieldShell(), FieldShellProps, TextAreaField(), TextAreaFieldProps, TextFieldProps, PROFICIENCIES, SENIORITY_OPTIONS (+6 more)

### Community 13 - "Application Pipeline"
Cohesion: 0.22
Nodes (21): applicationsOf(), dueApplicationFollowUps(), findDuplicate(), FollowUp, groupByStage(), manualRef(), norm(), sameRole() (+13 more)

### Community 14 - "feedSchema.ts"
Cohesion: 0.05
Nodes (75): apiUrl(), arr(), Fetcher, fetchSource(), obj(), parseAshby(), parseGreenhouse(), parseLever() (+67 more)

### Community 15 - "Fit Score Factors"
Cohesion: 0.14
Nodes (24): Explained fit score (6 weighted factors), BAND_LABEL, cap(), experienceFactor(), factor(), FactorId, FactorResult, FACTORS (+16 more)

### Community 16 - "AI Integration Options and Roadmap"
Cohesion: 0.11
Nodes (24): Claude Code Routines / scheduled tasks, Claude connectors (Gmail/Calendar/Drive), Subscription token (claude setup-token, CLAUDE_CODE_OAUTH_TOKEN), A1 — Foundation ✅, A2: Local scheduled runs, A3 — Cloud scheduled tasks for the daily briefing, A4 — Company and ATS-board discovery, A5 — Referral research and evidence-based outreach (+16 more)

### Community 17 - "AI Review Lifecycle"
Cohesion: 0.16
Nodes (22): ALLOWED, canTransition(), isPending(), PRIORITY_RANK, sortInbox(), STATUS_HINT, STATUS_LABEL, now (+14 more)

### Community 18 - "AutomationPanel.tsx"
Cohesion: 0.09
Nodes (20): ExportOptions, MAX_TOP_MATCHES, useAutomationSettings(), SYNC_DONE_EVENT, SYNC_NOW_EVENT, AutomationPanel(), DEFAULT_REPO, FRESH (+12 more)

### Community 19 - "Graph Refresh Workflow"
Cohesion: 0.09
Nodes (22): concurrency, cancel-in-progress, group, jobs, refresh, name, on, push (+14 more)

### Community 20 - "syncCycle.ts"
Cohesion: 0.20
Nodes (18): reviewImport(), toStored(), LOW_RISK_ACTIONS, AUTO_ACCEPT_MIN_CONFIDENCE, CONTEXT_PATH, contextFingerprint(), IMPORTED_MEMORY, isAutoAcceptable() (+10 more)

### Community 21 - "Outreach Draft Templates"
Cohesion: 0.13
Nodes (24): aboutMe(), addDays(), allowedStrategies(), askLine(), contextLine(), Draft, DraftInput, DraftJob (+16 more)

### Community 22 - "auto-sources.yml"
Cohesion: 0.10
Nodes (21): concurrency, cancel-in-progress, group, jobs, verify-and-merge, name, on, push (+13 more)

### Community 23 - "App TypeScript Config"
Cohesion: 0.10
Nodes (19): compilerOptions, allowArbitraryExtensions, allowImportingTsExtensions, erasableSyntaxOnly, jsx, lib, module, moduleDetection (+11 more)

### Community 24 - "Feedback Learning"
Cohesion: 0.22
Nodes (13): Read-time learning from decisions, Applied tracking and feedback learning (in-browser re-ranking), assessJob(), clamp(), describeLearning(), hasSignals(), learnFromActions(), LEVELS (+5 more)

### Community 25 - "Match Engine Tests"
Cohesion: 0.16
Nodes (18): bandOf(), isStalePosting(), jobSkills(), similarPostings(), splitRequirements(), backendJob, dev, aliasRegex() (+10 more)

### Community 26 - "Collector TypeScript Config"
Cohesion: 0.11
Nodes (18): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, moduleResolution, noEmit (+10 more)

### Community 27 - "aiContext.tsx"
Cohesion: 0.28
Nodes (11): lucide-react, react-router-dom, countByStatus(), latestBriefing(), Provider, useAiBriefings(), useRecords, AiDashboardPanel() (+3 more)

### Community 28 - "Profile Form Conversion"
Cohesion: 0.18
Nodes (15): DraftErrors, DraftResult, NumberParse, optionalText(), parseOptionalNumber(), ProfileDraft, profileFromDraft(), base (+7 more)

### Community 29 - "Outreach Follow-up Policy"
Cohesion: 0.29
Nodes (9): Follow-up limit (2, a week apart, none after reply), Outreach drafts (copy-only, never sent), FollowUpState, followUpState(), threadOf(), ReminderSummary, reminderSummary(), t (+1 more)

### Community 30 - "Node TypeScript Config"
Cohesion: 0.12
Nodes (16): compilerOptions, allowImportingTsExtensions, erasableSyntaxOnly, lib, module, moduleDetection, noEmit, noFallthroughCasesInSwitch (+8 more)

### Community 31 - "AI Apply Rules"
Cohesion: 0.16
Nodes (16): ApplyContext, normName(), normUrl(), planApply(), refFor(), refuse(), STAGE_RANK, ctx() (+8 more)

### Community 32 - "Job Card and Types"
Cohesion: 0.24
Nodes (13): REJECT_REASONS, Assessment, Job, MatchResult, formatDay(), JobCard(), JobCardProps, NoteEditor() (+5 more)

### Community 33 - "Product Plan Concepts"
Cohesion: 0.19
Nodes (17): Application status lifecycle, Normalization and deduplication, Delivery roadmap (Phases 0-9), Initial discovery configuration target, Public jobs.json feed (public/data/jobs.json), Deterministic match score weights, Product navigation and information architecture, Phase 2 - Job discovery engine (+9 more)

### Community 34 - "Contacts and Reminder Agent"
Cohesion: 0.42
Nodes (9): localDate(), shouldNotify(), ReminderAgent(), RemindersPanel(), notificationsSupported(), useReminderSummary(), readUiPreference(), UiPreferenceKey (+1 more)

### Community 35 - "DashboardPage.tsx"
Cohesion: 0.14
Nodes (19): Where things live (so you can skip exploring), routes, newJobs(), relativeTime(), sortJobs(), matchRank(), DashboardPage(), Kpi (+11 more)

### Community 36 - "E2E AI and Schedule Tests"
Cohesion: 0.24
Nodes (7): ReminderAgent, GitHub Actions least-privilege permissions, nextScheduledScan(), SCAN_TIMES_UTC, scheduleCron(), Phase 7: scheduled automation & reminders, scan-failure issue alert

### Community 37 - "Recovery Runbook"
Cohesion: 0.14
Nodes (13): Import says "newer JobIntel" / unsupported version, Procedure: local data shows an error after update, Local data shows an error after an update, My data is gone (new browser, cleared site data, new device), Procedure: backup from newer JobIntel version, Probe and fix failing board (collector/probe.ts), Recovery guide, Scheduled workflows stop after 60 days inactivity (+5 more)

### Community 38 - "ProfilePage.tsx"
Cohesion: 0.18
Nodes (19): isProfileSection(), ChoiceGroup(), draftFromProfile(), draftsEqual(), calculateReadiness(), createEmptyProfile(), Notice, EditorProps (+11 more)

### Community 39 - "Product Principles"
Cohesion: 0.15
Nodes (13): Analytics metrics and honesty requirements, Candidate profile assumptions, Core product principles, Cost-conscious (free feeds, no paid APIs), Evidence over guesses, Human approval for external actions, Local-first personal data, Automation without secrets in the browser (+5 more)

### Community 40 - "Data Architecture Decisions"
Cohesion: 0.29
Nodes (10): IndexedDB typed repository storage, localStorage for UI preferences only, GitHub Actions Pages deployment workflow (pages.yml), React + TypeScript + Vite SPA, Recommended stack, Suggested repository structure, Responsibility boundaries (layers), Runtime architecture (+2 more)

### Community 41 - "Test Dependencies"
Cohesion: 0.11
Nodes (24): devDependencies, fake-indexeddb@^6.2.7, jsdom@^30.1.3, oxlint@^1.89.0, @testing-library/jest-dom@^7.0.1, @testing-library/react@^16.3.3, @testing-library/user-event@^14.6.8, @types/node@^24.19.2 (+16 more)

### Community 42 - "OutreachPage.tsx"
Cohesion: 0.13
Nodes (21): ExportSource, Channel, CHANNELS, STRATEGIES, StrategyId, Tone, TONES, CHANNEL_IDS (+13 more)

### Community 43 - "Agent Docs and Graph Policy"
Cohesion: 0.26
Nodes (9): graph.yml workflow, JobIntel — agent guide, Project rules that are not derivable from code, Use the knowledge graph first — do NOT read the whole repo, AI automation roadmap, JobIntel architecture (v0.9), JobIntel README, RecordContextValue (+1 more)

### Community 44 - "Readiness Score"
Cohesion: 0.16
Nodes (13): Readiness score weighted checklist, Profile readiness score, CHECKLIST_GROUPS, ChecklistGroupId, MIN_PRIMARY_SKILLS, Readiness, READINESS_RULES, ReadinessRule (+5 more)

### Community 45 - "Profile Schema"
Cohesion: 0.18
Nodes (9): COMPANY_TYPES, Compensation, compensationSchema, Proficiency, shortText, skillList, skillSchema, tag (+1 more)

### Community 46 - "AI Privacy Boundaries"
Cohesion: 0.12
Nodes (13): Consent log and context ids, Exact-bytes preview and per-export consent, AI privacy boundaries (default-off and never-exported fields), Route-level code splitting (React Router lazy), Content-Security-Policy (connect-src 'self'), No secrets in the bundle, npm run check:dist, pages.yml GitHub Pages deployment (+5 more)

### Community 47 - "E2E Smoke and Workflow"
Cohesion: 0.14
Nodes (5): PAGES, @axe-core/playwright@^4.14.0, @playwright/test@^1.64.1, @axe-core/playwright, @playwright/test

### Community 48 - "ExportPanel.tsx"
Cohesion: 0.22
Nodes (12): approxTokens(), chatPrompt(), exportRecordOf(), serializeContext(), AssistantPage(), isTab(), TabId, TABS (+4 more)

### Community 49 - "context.ts"
Cohesion: 0.30
Nodes (12): Allowlist context export (buildAiContext), applicationEntry(), buildAiContext(), candidateSection(), clip(), clipAll(), dayOf(), INSTRUCTIONS (+4 more)

### Community 50 - "AI Output Safety"
Cohesion: 0.16
Nodes (10): Four-action whitelist (shortlist, not-interested, add-note, set-follow-up), Grounding rule (external-only evidence capped at 0.5 confidence), Accept re-checks live record (planApply), Partial import with per-item validation, Prompt injection via job description, Review lifecycle, jobintel-ai-result schema v1 contract, Six AI layers (collect, context, analysis, recommendations, approval, persistence) (+2 more)

### Community 51 - "RecommendationCard.tsx"
Cohesion: 0.32
Nodes (10): ApplyPlan, StoredRecommendation, confidencePct(), confidenceWord(), describeAction(), reasonLabel(), SOURCE_LABEL, KIND_LABEL (+2 more)

### Community 52 - "Dashboard and Backup Features"
Cohesion: 0.27
Nodes (10): Dashboard screen, CandidateProfile data schema, Encrypted backup export/import (Web Crypto AES-GCM + PBKDF2), Dashboard KPI strip, Phase 0 - Repository and architecture verification, Phase 1 - Static app shell, dark UX, local profile, Phase 9 - Reliability, security and polish, Profile readiness / completion score (+2 more)

### Community 53 - "Hosting and Discovery Constraints"
Cohesion: 0.24
Nodes (10): Job-discovery architecture on GitHub Actions, GitHub Actions schedule trade-offs, Definition of success, GitHub Pages architecture constraints, React Router HashRouter, Explicit non-goals (no backend, no LinkedIn scraper, no auto-send), Official GitHub references, GitHub Pages-compatible approach mapping (+2 more)

### Community 54 - "NPM Scripts"
Cohesion: 0.20
Nodes (10): scripts, build, check:dist, dev, lint, preview, test, test:e2e (+2 more)

### Community 55 - "App.tsx"
Cohesion: 0.11
Nodes (14): App(), renderAt(), createAppRouter(), feedSchema, AiProvider(), renderAt(), FeedState, feedUrl() (+6 more)

### Community 56 - "Backup Format and Recovery"
Cohesion: 0.22
Nodes (7): Backup file format v1 (jobintel-backup), Procedure: data gone, restore from encrypted backup, index.html (Vite entry), favicon.svg, no-referrer meta policy, Encrypted backups (AES-256-GCM, PBKDF2 600k), JobIntel (local-first job-search workspace)

### Community 57 - "AI Architecture Sections"
Cohesion: 0.17
Nodes (12): 1. Summary, 3. Architecture, 4. Privacy boundaries, 5. Threat model for AI output, 6. Integration options, limits and cost, 7. Where I departed from the brief's assumptions, 8. Smallest viable implementation (what A1 includes and excludes), 9. Test map (+4 more)

### Community 58 - "Implementation Plan Phases"
Cohesion: 0.22
Nodes (9): JobIntel Product, UX & Implementation Plan, Development workflow and guardrails, Phase 1 end-of-phase report, Phase 1 acceptance checklist, Phase 1 explicit non-goals, Phase 1 implementation specification, Product vision (optimize for relevant interviews), UX_SPEC.md (+1 more)

### Community 59 - "Tag Input"
Cohesion: 0.44
Nodes (6): TagInput(), TagInputProps, LIMITS, splitTagInput(), TagResult, validateTag()

### Community 60 - "Runtime Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, lucide-react@^1.66.0, react@^19.3.1, react-dom@^19.3.1, react-router-dom@^7.18.5, zod@^4.6.7, react-dom, zod

### Community 61 - "syncCycle.test.ts"
Cohesion: 0.21
Nodes (10): AiContextBundle, DEFAULT_EXPORT_OPTIONS, AI_CONTEXT_FORMAT, AutomationSettings, ExportRecord, StoredBriefing, SyncDeps, baseSettings() (+2 more)

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

### Community 71 - "filters.test.ts"
Cohesion: 0.18
Nodes (11): applyFilters(), feedFreshness(), fitsPreferences(), all, blr, closed, hyd, now (+3 more)

### Community 72 - "useNow"
Cohesion: 0.36
Nodes (5): APP_VERSION, Header(), HeaderProps, isMacPlatform(), useNow()

### Community 73 - "useJobActions.ts"
Cohesion: 0.43
Nodes (7): ApplicationDetails, JobRef, RejectReason, Stage, Learned, JobActionsContext, JobActionsContextValue

### Community 74 - "validate-ai-result.ts"
Cohesion: 0.40
Nodes (4): args, ctxIdx, out, problems

## Knowledge Gaps
- **43 isolated node(s):** `IndexedDB storage with append-only migrations`, `Explained fit score (6 weighted factors)`, `Claude connectors (Gmail/Calendar/Drive)`, `Referral leads (derived relationships, verified vs inferred)`, `Applied tracking and feedback learning (in-browser re-ranking)` (+38 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 511 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `JobIntel architecture (v0.9)` connect `Agent Docs and Graph Policy` to `App Shell and IndexedDB Tests`, `E2E AI and Schedule Tests`, `AI Recommendation Schema`, `Analytics Engine`, `Application Pipeline`, `AI Privacy Boundaries`, `Fit Score Factors`, `Outreach Draft Templates`, `Match Engine Tests`, `AI Apply Rules`?**
  _High betweenness centrality (0.073) - this node is a cross-community bridge._
- **What connects `IndexedDB storage with append-only migrations`, `Explained fit score (6 weighted factors)`, `Claude connectors (Gmail/Calendar/Drive)` to the rest of the system?**
  _43 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `App Shell and IndexedDB Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.07847082494969819 - nodes in this community are weakly interconnected._
- **Why does `JobIntel README` connect `Agent Docs and Graph Policy` to `Implementation Plan Phases`, `Recovery Runbook`?**
  _High betweenness centrality (0.070) - this node is a cross-community bridge._
- **Should `context.test.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11695906432748537 - nodes in this community are weakly interconnected._
- **Why does `vitest` connect `App Shell and IndexedDB Tests` to `context.test.ts`, `Job Actions and Reuse Map`, `Data Privacy and Backup UI`, `Referral Leads`, `AI Result Import`, `Analytics Engine`, `Application Pipeline`, `feedSchema.ts`, `AI Review Lifecycle`, `AutomationPanel.tsx`, `syncCycle.ts`, `Outreach Draft Templates`, `Match Engine Tests`, `Profile Form Conversion`, `Outreach Follow-up Policy`, `AI Apply Rules`, `E2E AI and Schedule Tests`, `Test Dependencies`, `Tag Input`, `syncCycle.test.ts`, `filters.test.ts`?**
  _High betweenness centrality (0.052) - this node is a cross-community bridge._
- **Should `Scan Workflow (scan.yml)` be split into smaller, more focused modules?**
  _Cohesion score 0.04717853839037928 - nodes in this community are weakly interconnected._