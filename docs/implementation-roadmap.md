# Implementation roadmap

Phases are coarse and will be refined before each starts.

## Phase 0: Foundation (status: Done, verified locally: install, lint, format, typecheck, tests, build, e2e, dev start)

Goal: a clean monorepo that builds, tests and runs. Delivered: npm workspaces, Fastify API with `GET /api/health` backed by SQLite/Prisma, `AuditEvent` model, React command workspace (`help`, `status`), shared Zod contracts, lint/format/typecheck/test, Playwright smoke test, CI.
Acceptance: format, lint, typecheck, tests, build and e2e pass; `npm run dev` serves the workspace and `status` reports database ok.

## Phase 1: Discovery pipeline

Goal: collect and store jobs from a few sources. Depends on Phase 0 (database, API). Acceptance: a command runs discovery, jobs are stored deduplicated with source and time, each fetch is audited.

## Phase 2: Evaluation and scoring

Goal: score jobs against a candidate profile. Depends on Phase 1 and a profile model. Acceptance: each job has a score with a readable explanation; works with no LLM configured, with an optional local provider.

## Phase 3: Resume engine

Goal: tailored LaTeX resume per job. Depends on Phase 2 and the master resume. Acceptance: PDF produced; every statement traces to the master resume; nothing fabricated.

## Phase 4: Application automation

Goal: apply via Playwright within policy. Depends on Phases 1-3 and the autonomy policy. Acceptance: submissions recorded with answers and resume version; CAPTCHA/MFA stops and asks the user; every action audited.

## Phase 5: Research

Goal: company and role research attached to jobs. Depends on Phase 1. Acceptance: research notes stored with sources.

## Phase 6: Tracking and follow-ups

Goal: status history and follow-up reminders. Depends on Phase 4. Acceptance: a command lists what needs attention and follow-ups are scheduled.

## Phase 7: Orchestration and autonomy loop

Goal: persistent local task queue, workers and an orchestrator that run the loop unattended under user policy (introduces `workers/`, `packages/core`, `packages/agents`, `packages/ai`, `packages/browser` as needed). Depends on Phases 1-6. Acceptance: loop survives restarts, honours limits and approvals, pauses on request.

## Phase 8: Hardening

Goal: reliability and safety. Acceptance: failure recovery, rate limits, backups of the local database, security review, broader e2e coverage.
