# JobIntel

JobIntel is a fully autonomous, local-first AI job-search and application agent. It runs on your own machine, keeps your data in a local SQLite database, and is operated primarily through a command workspace in the browser.

## Vision

Find relevant roles, evaluate fit, tailor a resume from a master LaTeX resume, apply, research companies and track every follow-up, with the agent doing the work and the user setting the policy. Every external action is recorded in an audit log. No paid APIs are required.

## Capabilities

All of the following are **planned**. Only the Phase 0 foundation and the Phase 1 execution engine exist today.

- Job discovery across sources
- Evaluation and scoring of roles against the candidate profile
- Resume intelligence: tailoring from a master LaTeX resume, never inventing facts
- Application automation through browser automation
- Company and role research
- Application tracking and follow-ups

## Current status

Phases 0 and 1: monorepo, API with a health route backed by SQLite, the execution engine with its command workspace, shared contracts, CI. There is no job discovery, resume tailoring or application automation yet. See [docs/implementation-roadmap.md](docs/implementation-roadmap.md).

## Phase 1: execution engine

The API runs a persistent task engine in-process. A plan is a set of tasks with dependencies; the engine runs them, retries and recovers them after a restart, and can pause and resume. The only task types are the demo handlers `system.echo`, `system.delay` and `system.health-check`.

Commands, typed in the workspace (natural language is rejected):

| Command                                | Purpose                                           |
| -------------------------------------- | ------------------------------------------------- |
| `/help`                                | List commands                                     |
| `/status`                              | Engine state, active slots, task counts, database |
| `/tasks list` / `/tasks list <status>` | List tasks, optionally filtered by status         |
| `/tasks show <id>`                     | One task with its recent events                   |
| `/tasks cancel <id>`                   | Cancel a task                                     |
| `/plans demo`                          | Create the demo plan (a four-task diamond)        |
| `/plans create <json>`                 | Create a plan from a JSON plan spec               |
| `/plans list`                          | List plans                                        |
| `/plans show <id>`                     | One plan with its tasks                           |
| `/pause`                               | Stop starting new tasks                           |
| `/resume`                              | Start tasks again                                 |

Run locally (Node 22 or newer):

```
npm ci
npm run db:generate
npm run db:migrate
npm run dev
```

Then open http://localhost:5173 and type `/help`. Stop `npm run dev` before running `db:migrate` again.

## Technology

| Area      | Choice                                       |
| --------- | -------------------------------------------- |
| Monorepo  | npm workspaces                               |
| API       | Fastify 5, TypeScript, tsx                   |
| Database  | SQLite via Prisma 7 (better-sqlite3 adapter) |
| Web       | React 19, TypeScript, Vite                   |
| Contracts | Zod 4 (`@jobintel/contracts`)                |
| Tests     | Vitest, Testing Library, Playwright          |
| Quality   | oxlint, Prettier, `tsc --noEmit`             |

## Local setup

Requires Node 22 or newer.

```
npm ci
npx playwright install chromium   # optional, only for e2e
npm run db:generate
npm run db:migrate
npm run dev
```

Open http://localhost:5173 and type `help`. Copy `.env.example` to `.env` only if you need to change the defaults (`API_PORT`, `DATABASE_URL`).

## Commands

| Command                                   | Purpose                                      |
| ----------------------------------------- | -------------------------------------------- |
| `npm run dev`                             | API (127.0.0.1:3000) and web (5173) together |
| `npm run build`                           | Typecheck, then build all workspaces         |
| `npm run typecheck`                       | `tsc --noEmit` in each workspace             |
| `npm run lint`                            | oxlint with warnings denied                  |
| `npm run format` / `npm run format:check` | Prettier write / check                       |
| `npm test`                                | Vitest in every workspace                    |
| `npm run test:e2e`                        | Playwright smoke test                        |
| `npm run db:generate`                     | Generate the Prisma client                   |
| `npm run db:migrate`                      | `prisma migrate dev` for the API database    |

## Windows notes

- npm scripts run in cmd.exe, so scripts avoid bash-only syntax.
- `better-sqlite3` ships prebuilt binaries; if install falls back to compiling, install the Visual Studio C++ build tools.
- Stop `npm run dev` before running `db:migrate`; a running API can hold the SQLite file open.
- The first `db:migrate` asks for a migration name only when the schema changed.
