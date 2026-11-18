# Implementation roadmap

Phases are coarse and will be refined before each starts.

## Phase 0: Foundation (status: Done, verified locally: install, lint, format, typecheck, tests, build, e2e, dev start)

Goal: a clean monorepo that builds, tests and runs. Delivered: npm workspaces, Fastify API with `GET /api/health` backed by SQLite/Prisma, `AuditEvent` model, React command workspace (`help`, `status`), shared Zod contracts, lint/format/typecheck/test, Playwright smoke test, CI.
Acceptance: format, lint, typecheck, tests, build and e2e pass; `npm run dev` serves the workspace and `status` reports database ok.

## Phase 1: Execution engine (status: Done, verified locally: format, lint, typecheck, tests, build, e2e)

Goal: a persistent, in-process execution engine in `apps/api`. Plans of tasks with dependencies run under a state machine; the queue, leases and pause state live in SQLite; the engine recovers after a restart; the command workspace drives it and shows live events. Depends on Phase 0 (database, API).

Acceptance:

- `/plans demo` runs the four-task diamond to COMPLETED, and a task never starts before all of its dependencies have completed.
- A task whose dependency fails is cancelled with `DEPENDENCY_FAILED`; its unaffected branches still complete.
- Retryable failures are retried up to `maxAttempts`, then end FAILED; a timed-out idempotent task is retried.
- A running task can be cancelled; the cancel is reported as requested and then ends CANCELLED.
- Hard-killing the API while a task runs, then restarting, recovers it: an idempotent task is re-run, a non-idempotent task ends FAILED with `INTERRUPTED` and is not re-run, and completed tasks are untouched.
- `/pause` leaves queued tasks queued, including across a restart; `/resume` runs them to completion.
- Two claimers never run the same task; a stale executor cannot change a task's state.
- Plan creation with the same `Idempotency-Key` returns the same plan; a different command with that key is rejected with 409.
- Plan create, task cancel, pause and resume each write an `AuditEvent`.
- Natural-language input is rejected with `NOT_A_COMMAND`; only the documented command grammar runs.
- The workspace shows live events, reconnects after a server restart, and does not duplicate lines.
- On SIGINT or SIGTERM the engine stops claiming, aborts or settles running tasks within the shutdown timeout, and exits.
- Format, lint, typecheck, tests, build and e2e pass.

## Phase 2: Discovery pipeline

Goal: collect and store jobs from a few sources. Depends on Phase 0 (database, API). Acceptance: a command runs discovery, jobs are stored deduplicated with source and time, each fetch is audited.

## Phase 3: Evaluation and scoring

Goal: score jobs against a candidate profile. Depends on Phase 2 and a profile model. Acceptance: each job has a score with a readable explanation; works with no LLM configured, with an optional local provider.

## Phase 4: Resume engine

Goal: tailored LaTeX resume per job. Depends on Phase 3 and the master resume. Acceptance: PDF produced; every statement traces to the master resume; nothing fabricated.

## Phase 5: Application automation

Goal: apply via Playwright within policy. Depends on Phases 2-4 and the autonomy policy. Acceptance: submissions recorded with answers and resume version; CAPTCHA/MFA stops and asks the user; every action audited.

## Phase 6: Research

Goal: company and role research attached to jobs. Depends on Phase 2. Acceptance: research notes stored with sources.

## Phase 7: Tracking and follow-ups

Goal: status history and follow-up reminders. Depends on Phase 5. Acceptance: a command lists what needs attention and follow-ups are scheduled.

## Phase 8: Orchestration and autonomy loop

Goal: workers and an orchestrator that run the loop unattended under user policy, built on the Phase 1 task queue and scheduler (introduces `workers/`, `packages/core`, `packages/agents`, `packages/ai`, `packages/browser` as needed). Depends on Phases 2-7. Acceptance: loop survives restarts, honours limits and approvals, pauses on request.

## Phase 9: Hardening

Goal: reliability and safety. Acceptance: failure recovery, rate limits, backups of the local database, security review, broader e2e coverage.
