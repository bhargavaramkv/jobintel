# UI V2: Phase 1 prototype

Status: Prototype. Rollback point: git tag `ui-v1-final` (= `a44d84d`). Task list: [`TODO.md`](../TODO.md).

The prototype revamps the UI with mock data. Code lives in `src/prototype/` (state, data, selectors) and in the
feature folders below. It is in-memory only. IndexedDB data is untouched in Phase 1.

## Screens and routes

Hash routes, defined in `src/app/router.tsx` and `src/app/navigation.ts`.

| Screen | Route | Folder |
|---|---|---|
| Dashboard | `#/` | `src/features/dashboard` |
| Onboarding | `#/onboarding` | `src/features/onboarding` |
| Resumes | `#/resumes/:resumeId?` | `src/features/resumes` |
| Discovery | `#/jobs/:jobId?` | `src/features/discovery` |
| Applications | `#/applications/:appId?` | `src/features/applications` |
| Activity | `#/activity` | `src/features/activity` |
| Settings | `#/settings` | `src/features/settings` |

Unknown routes redirect to the Dashboard. Screens other than the Dashboard load lazily.

## Mode semantics

Each application has one of three modes, shown with `src/components/ui/ModeBadge.tsx`.

| Mode | Badge | Meaning |
|---|---|---|
| `auto` | Automatic (accent) | Score meets the auto-apply threshold, auto-apply is on, and the screening-question rule passes. |
| `approval` | Needs approval (amber) | Waits for your review before anything is submitted. Every application not Automatic lands here. |
| `blocked` | Blocked (red) | The agent cannot continue. A blocker is listed in Activity and must be resolved. |

`modeFor()` in `src/prototype/store.ts` sets Automatic versus Needs approval. Blocked comes from the seed data (for
example, a stop at a CAPTCHA). Resolving a blocker moves the application back to the queue as Needs approval.

## Design tokens

Dark-first. Tokens are defined on `:root` in `src/styles/tokens.css`.

- Surfaces: near-black blue background (`--bg` `#05080f`), with elevated and sunken surfaces and blue-grey borders.
- Accent: cyan (`--accent` `#22b8ff`, `--accent-strong` `#5cccff`) for focus, active navigation and Automatic.
- Approval: amber (`--warning` `#f5b84b`) for Needs approval.
- Blocked and failure: red (`--danger` `#ff6b78`).
- Success: green (`--success` `#35d39a`). Live status: teal (`--live` `#36e0e0`).
- Text: `--text-primary`, `--text-secondary`, `--text-muted`. Reduced motion sets all durations to 0.

## Mock data and scenarios

- Seed data lives in `src/prototype/data/` (profile, jobs, resumes, applications, activity, settings). It is typed by
  `src/prototype/types.ts`.
- The reducer in `src/prototype/store.ts` owns all state. `initialState(scenario)` builds it from a seed.
- Scenario selector in the header (`src/components/layout/Header.tsx`):
  - **Demo**: the full seed (`SEED`).
  - **New user (empty)**: `EMPTY_SEED`, not onboarded, no jobs, applications or events.
  - **Simulate error**: data as in Demo, but list screens show the error state with retry (`useSimulatedQuery`).
- **Reset** rebuilds the current scenario's seed.
- Loading is simulated with `LOAD_MS` (400 ms) and `ACTION_MS` (1000 ms) in `src/prototype/usePrototype.ts`. Both are 0 in tests.
- The simulated run is a fixed script (`RUN_SCRIPT` in `src/prototype/data/activity.ts`) advanced by `agent/tick` every 1.5 s.
- The clock is fixed (`PROTOTYPE_NOW` in `src/prototype/clock.ts`), so every screen and test is deterministic.

## What is simulated

- The agent run, its steps and events. Nothing runs in the background.
- Application submission and verification. "Submitted" and "Confirmation found" are labels set by the reducer.
- Resume tailoring and generation. Uploaded master resumes are kept in memory and never sent anywhere.
- Onboarding, settings and profile saves. They update memory and are lost on reload.
- Match scores come from the existing `src/domain/match/score.ts`, computed on mock jobs.

Nothing is sent, submitted or stored. The header badge, toasts and event titles are labelled "simulated".

## Phase 2 wiring points

1. **Prototype store first.** Keep `Action` and `reducer` in `src/prototype/store.ts` as the single place for state
   changes, and keep the selectors in `src/prototype/selectors.ts`. Fix the behaviour here, with tests in
   `store.test.ts`, before any persistence work.
2. **Then storage repositories.** Back the reducer's collections with repositories in `src/storage/` (IndexedDB, with
   schema versions and Zod validation, as in Phases 1 to 9). Each seed in `src/prototype/data/` becomes a repository
   read. Each action becomes a write.
3. **Keep the hooks.** Screens read through `usePrototype` and `useSimulatedQuery`. Swapping their source keeps the
   screen code unchanged.
4. **Do not reuse the A-track UI.** Its domain code in `src/domain/ai/` is kept for reference, but the inbox and
   sync screens are retired.
