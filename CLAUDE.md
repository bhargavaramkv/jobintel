# JobIntel agent guide

Local-first autonomous job-search agent. Current scope: Phase 0 foundation only (see docs/implementation-roadmap.md).

## Layout

| Path                 | Purpose                                              |
| -------------------- | ---------------------------------------------------- |
| `apps/api`           | Fastify + TypeScript + Prisma (SQLite)               |
| `apps/web`           | React + Vite command workspace                       |
| `packages/contracts` | Zod schemas and types shared by api and web          |
| `docs/`              | Architecture, requirements, autonomy policy, roadmap |
| `e2e/`               | Playwright smoke test (root `playwright.config.ts`)  |

## Commands

`npm run dev`, `build`, `typecheck`, `lint`, `format`, `format:check`, `test`, `test:e2e`, `db:generate`, `db:migrate`. Before finishing work run format:check, lint, typecheck, test, build.

## Rules

- No paid services or mandatory LLM APIs. No secrets in the repo; `.env` stays ignored.
- Audit every external action with an `AuditEvent`.
- Never fabricate candidate data. Never bypass CAPTCHA or MFA; stop and ask the user.
- Respect phase boundaries: do not build later-phase features or empty abstractions early.
- Stop `npm run dev` before `db:migrate` (SQLite file lock on Windows).
- Use npm only. Keep changes minimal and match existing style.
