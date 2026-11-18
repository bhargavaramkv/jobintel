# Architecture

Status key: **[present]** exists in the repo, **[planned]** is future work with no code yet.

## Overview

JobIntel is local-first. A browser workspace talks to a local API on `127.0.0.1`; state lives in a local SQLite file. Nothing requires a hosted service.

## Frontend [present]

`apps/web`: React 19, TypeScript, Vite. A single command workspace (header, output log, command input). Phase 0 commands: `help`, `status`. The Vite dev server proxies `/api` to the API. No router or UI kit.

## Backend [present]

`apps/api`: Fastify 5 on `127.0.0.1` (port `API_PORT`, default 3000). Phase 0 route: `GET /api/health`, which runs `SELECT 1` through Prisma and validates its response against a schema from `@jobintel/contracts`.

## Shared contracts [present]

`packages/contracts`: Zod schemas and inferred types used by both apps. Consumed directly from TypeScript source (no build step), which keeps dev, test, typecheck and build simple.

## Data: SQLite and Prisma [present]

Prisma 7 with the better-sqlite3 driver adapter. The database file (`apps/api/prisma/dev.db`) is git-ignored; migrations in `apps/api/prisma/migrations` are source. The only model is `AuditEvent` (actor, action, target, outcome, JSON detail), the base of the audit requirement in [autonomy-policy.md](autonomy-policy.md).

## Planned components [planned]

None of these exist yet; they are described so Phase 1+ stays consistent.

- `workers/`: background process that runs queued tasks.
- `packages/core`: domain types and logic (profile, job, application).
- `packages/agents`: orchestrator and task agents over a local persistent task queue (a database table), not an external broker.
- `packages/ai`: AI provider abstraction. Ollama is an optional local provider; Claude is used on demand only; no LLM API is mandatory and the system must degrade gracefully without one.
- `packages/browser`: browser automation. Playwright is the primary driver; OpenBrowser is an optional alternative. Claude Code and Claude in Chrome are not runtime dependencies.
- `packages/resume-engine`: tailoring from the master LaTeX resume.

## Security and privacy boundaries

- No paid APIs required; no secrets in the repo (`.env` is ignored, `.env.example` holds defaults only).
- Data stays on the local machine unless the user directs an external action.
- Every external action writes an `AuditEvent`.
- CAPTCHA and MFA are never bypassed; the agent stops and asks the user.
- The API binds to `127.0.0.1` only.
