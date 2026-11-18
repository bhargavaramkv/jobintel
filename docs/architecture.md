# Architecture

Status key: **[present]** exists in the repo, **[planned]** is future work with no code yet.

## Overview

JobIntel is local-first. A browser workspace talks to a local API on `127.0.0.1`; state lives in a local SQLite file. Nothing requires a hosted service. The API process also runs the execution engine, so there is one process and one SQLite writer.

## Frontend [present]

`apps/web`: React 19, TypeScript, Vite. A command workspace (header with connection state, output log, command input) and a status panel (engine state with pause/resume, plans, tasks with cancel buttons, and task detail). Every command typed in the workspace is sent to `POST /api/commands`; the browser does not interpret commands. The workspace subscribes to `GET /api/events` and appends one line per execution event. The Vite dev server proxies `/api` to the API. No router or UI kit.

## Backend [present]

`apps/api`: Fastify 5 on `127.0.0.1` (port `API_PORT`, default 3000). Source layout:

- `src/server.ts`: process entry point. Starts listening, then starts the engine, and handles shutdown.
- `src/app.ts`: Fastify instance, host check, error envelope, body limit (64 KB).
- `src/routes/engine.ts`: JSON endpoints. `src/routes/events.ts`: SSE endpoint.
- `src/engine/`: the execution engine (see below).
- `src/config.ts`: engine defaults and environment overrides.

Every request must carry a `Host` of `127.0.0.1` or `localhost`; anything else gets `403 FORBIDDEN_HOST`. Errors use one envelope: `{ "error": { "code", "message", "details?" } }`.

## Execution engine [present]

Phase 1 engine, in `apps/api/src/engine/`. It runs in-process inside the API. Plans are sets of tasks with dependencies; the engine runs them under a state machine, and the state survives restarts because every transition is written to SQLite.

### Components

- **State machine** (`state-machine.ts`): the task transition table, plan status derivation, retry backoff, and the pure decisions for failures and interrupted attempts.
- **Repository** (`repository.ts`): the only code that writes `Task.status` and `Plan.status`. Each write runs in one Prisma transaction and appends an `ExecutionEvent` in the same transaction.
- **Task queue**: the `Task` table itself. A task in `QUEUED` is eligible; there is no external broker.
- **Scheduler** (`scheduler.ts`): the orchestrator loop. Each tick: re-queues due `RETRYING` tasks, resolves dependencies, recovers tasks whose lease expired, and, unless paused, claims `QUEUED` tasks up to the free concurrency slots (priority descending, then id ascending).
- **Executor** (`executor.ts`): runs one claimed task, heartbeats its lease, enforces the timeout, and writes the outcome through a fenced transition.
- **Handler registry** (`handlers.ts`): maps a task type to a handler with an input schema, an `idempotent` flag, default timeout and max attempts, and a `run(input, ctx)` function. Handlers receive an `AbortSignal` and a logger.
- **Plan validation** (`plan-validation.ts`): pure checks on a `PlanSpec` before anything is written.
- **Event bus** (`event-bus.ts`): an in-process notification after each committed write. It only wakes SSE streams; the database is the source of truth.
- **Command layer** (`commands.ts`): the pure parser and the command runner.

### Task state machine

Allowed transitions (from `TRANSITIONS`; any other transition is rejected):

| From       | To                                             |
| ---------- | ---------------------------------------------- |
| `PENDING`  | `BLOCKED`, `QUEUED`, `CANCELLED`               |
| `BLOCKED`  | `QUEUED`, `CANCELLED`                          |
| `QUEUED`   | `RUNNING`, `CANCELLED`                         |
| `RUNNING`  | `RETRYING`, `COMPLETED`, `FAILED`, `CANCELLED` |
| `RETRYING` | `QUEUED`, `CANCELLED`                          |

`COMPLETED`, `FAILED` and `CANCELLED` are terminal. When a task ends `FAILED` or `CANCELLED`, every non-terminal dependent is cancelled with `DEPENDENCY_FAILED`, recursively.

A plan's status is derived from its tasks: `ACTIVE` while any task is non-terminal; otherwise `COMPLETED` if all tasks completed, `FAILED` if any failed, and `CANCELLED` otherwise. `Plan.status` is a cache of this value.

### Claiming, fencing and leases

- A claim is a single conditional update: `QUEUED` to `RUNNING`, setting the lease owner (the engine instance id), a lease expiry 30 s ahead, and `attempts + 1`. Only one claimer can win a row.
- Every later write from an executor is fenced on `status = RUNNING`, the lease owner and the attempt number. A stale executor's result matches zero rows and is discarded, so it cannot change state.
- The executor heartbeats every 10 s to extend its lease. A heartbeat that finds the fence no longer matches aborts the local run (`lease-lost`); a heartbeat that sees a cancel request aborts it with `cancel`.

### Retries, timeouts and cancellation

- A failed attempt is retried only if the failure is retryable and attempts are below `maxAttempts`. Retry delay is `retryBaseMs * 2^(attempt-1)`, capped at 60 s, without jitter (default base 1 s).
- A timeout (`timeoutMs`) is retryable only for idempotent handlers.
- `TaskError` carries an explicit `retryable` flag. Any other handler exception is `HANDLER_ERROR`, retryable only for idempotent handlers.
- A `RUNNING` task cannot be moved by the API directly. A cancel request sets `cancelRequestedAt`; the executor aborts the handler, and the task ends `CANCELLED`. A task in `PENDING`, `BLOCKED`, `QUEUED` or `RETRYING` is cancelled at once.
- A handler that ignores its signal gets a grace period (2 s). After that, the executor writes the outcome implied by the abort reason (`CANCELLED`, or a timeout failure) through the fence and stops waiting; a late result from that handler is discarded. A handler that completes before its outcome is written wins, even after a cancel request.
- Results are stored as JSON and must be at most 64 KB. Each attempt keeps at most 100 log lines of up to 500 characters.

### Recovery on restart

Startup order in `server.ts`: the port is bound first, then `engine.start()` runs. `start()` ensures the `SystemState` row exists, then recovers every `RUNNING` task whose lease belongs to another instance. The decision for each is `decideInterrupted`:

1. cancel was requested: `CANCELLED`;
2. the handler type is no longer registered: `FAILED` with `UNKNOWN_HANDLER`;
3. the handler is not idempotent: `FAILED` with `INTERRUPTED`, and the work is not re-run;
4. attempts are exhausted: `FAILED` with `INTERRUPTED`;
5. otherwise: `RETRYING`, then re-queued.

If anything was recovered, one `AuditEvent` (`engine.recover`, actor `system`) is written. During normal ticks the same recovery applies to `RUNNING` tasks with an expired lease.

### Pause state

`SystemState` (row id 1) holds the paused flag, so pause survives restarts. While paused, the scheduler keeps doing its bookkeeping (retries, dependencies, recovery) but claims nothing. A running task is not interrupted by a pause.

### Graceful shutdown

On `SIGINT` or `SIGTERM`, `server.ts` calls `engine.stop()`, which stops claiming and waits for the current tick. It then waits up to `ENGINE_SHUTDOWN_TIMEOUT_MS` (default 10 000) for running tasks. Tasks still running are aborted with reason `shutdown` and then handled by the recovery rules: an idempotent task with attempts left goes to `RETRYING`; a non-idempotent one ends `FAILED` with `INTERRUPTED`. After that the server closes the HTTP app (which ends open SSE streams), disconnects Prisma and exits. A second signal exits immediately with code 1. Windows does not deliver `SIGTERM` reliably; hard kills are handled by the recovery path above, not by shutdown.

### Handlers [present]

| Type                  | Input                                       | Idempotent | Default timeout | Default max attempts |
| --------------------- | ------------------------------------------- | ---------- | --------------- | -------------------- |
| `system.echo`         | `{ message }` (1 to 1000 chars)             | yes        | 5 s             | 3                    |
| `system.delay`        | `{ ms }` (0 to 60 000)                      | yes        | 65 s            | 3                    |
| `system.health-check` | `{}`; checks the database and `/api/health` | yes        | 5 s             | 2                    |

Input schemas are strict: unknown fields are rejected. These demo handlers are the only handlers registered in Phase 1.

### Plan validation

A plan spec is `{ name?, tasks: [...] }` with 1 to 50 tasks. A task has a `key` (lowercase, digits and hyphens, up to 32 characters), a `type`, an `input`, `dependsOn` (keys), `priority` (0 to 9, default 5), and optional `maxAttempts` (1 to 5) and `timeoutMs` (100 to 300 000). Validation rejects duplicate keys, unknown or self dependencies, duplicate dependencies, unknown types, inputs that fail the handler schema, inputs over 16 KB, and dependency cycles. All errors are returned together, each with a path.

### Idempotent plan creation

`POST /api/commands` accepts an optional `Idempotency-Key` header (`[A-Za-z0-9_-]`, up to 100 characters). For `/plans create` and `/plans demo`, the same key with the same command text returns the original plan; the same key with different text returns `409 IDEMPOTENCY_CONFLICT`. The web workspace sends a new key with each command.

## Data: SQLite and Prisma [present]

Prisma 7 with the better-sqlite3 driver adapter. The database file (`apps/api/prisma/dev.db`) is git-ignored; migrations in `apps/api/prisma/migrations` are source. The models are:

| Model            | Role                                                                                                                                                                                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Plan`           | A named set of tasks created from one spec. Holds the derived `status`, an optional `idempotencyKey` and `requestHash`.                                                                                                                                                                              |
| `Task`           | One unit of work: handler `type`, `key` within its plan, `status`, `priority`, JSON `input`/`result`/`error`, `attempts`, `maxAttempts`, `timeoutMs`, lease fields, `availableAt` for retries, and `cancelRequestedAt`. Its `idempotencyKey` is `${planId}:${key}`. This row is also the task queue. |
| `TaskDependency` | An edge from a task to a task it depends on (composite primary key). Cascades on delete.                                                                                                                                                                                                             |
| `ExecutionEvent` | Append-only log of plan and task status changes, task log lines, and pause/resume. Its `id` is the SSE event id.                                                                                                                                                                                     |
| `SystemState`    | Singleton row (`id = 1`) holding the paused flag.                                                                                                                                                                                                                                                    |
| `AuditEvent`     | Append-only record of actions with actor, action, target, outcome and JSON detail. Written for `plan.create`, `task.cancel`, `system.pause`, `system.resume` and `engine.recover`. Plan and task details contain counts and ids, not task input.                                                     |

`AuditEvent` is the base of the audit requirement in [autonomy-policy.md](autonomy-policy.md).

## Commands [present]

All commands go through `POST /api/commands` with a JSON body `{ "command": "..." }`. Parsing is pure; there is no LLM and no natural-language interpretation.

| Command                            | Effect                                                                           |
| ---------------------------------- | -------------------------------------------------------------------------------- |
| `/help`                            | List commands                                                                    |
| `/status`                          | Engine state (running or paused), active slots, task counts, database            |
| `/tasks`, `/tasks list [<status>]` | List up to 50 tasks, newest first; optional status filter (for example `queued`) |
| `/tasks show <id>`                 | One task with its recent events                                                  |
| `/tasks cancel <id>`               | Cancel a task (or request cancellation of a running one)                         |
| `/plans`, `/plans list`            | List plans with task counts                                                      |
| `/plans show <id>`                 | One plan with its tasks                                                          |
| `/plans create <json>`             | Create a plan from a `PlanSpec` JSON object                                      |
| `/plans demo`                      | Create the fixed demo plan (a four-task diamond)                                 |
| `/pause`                           | Stop starting new tasks                                                          |
| `/resume`                          | Start tasks again                                                                |

Rules:

- The command word is case-insensitive. Ids must be positive integers.
- Only `help` and `status` are accepted without a leading slash, for Phase 0 compatibility.
- Any other input that does not start with `/` is rejected with `400 NOT_A_COMMAND`: "JobIntel only understands commands, and they start with '/'. Natural-language requests are not supported. Type /help."
- An unknown `/word` gives `400 UNKNOWN_COMMAND`. Wrong or missing arguments give `400 INVALID_ARGUMENTS` with the usage line.
- `/tasks cancel` gives `404 NOT_FOUND` for an unknown id and `409 INVALID_TRANSITION` for a completed or failed task.
- A command response is `{ "output": string, "data"?: unknown }`.

## HTTP endpoints [present]

| Method | Path                    | Notes                                                                                                           |
| ------ | ----------------------- | --------------------------------------------------------------------------------------------------------------- |
| GET    | `/api/health`           | Database check and version                                                                                      |
| POST   | `/api/commands`         | Body `{ command }`; requires `Content-Type: application/json`; optional `Idempotency-Key`                       |
| GET    | `/api/plans`            | `?limit=` (1 to 200); plan summaries with task counts by status                                                 |
| GET    | `/api/plans/:id`        | Plan and its tasks                                                                                              |
| GET    | `/api/tasks`            | `?status=`, `?planId=`, `?limit=` (default 50, max 200)                                                         |
| GET    | `/api/tasks/:id`        | Task and up to 50 recent events                                                                                 |
| POST   | `/api/tasks/:id/cancel` | `200` when cancelled or already cancelled; `202` when a running task was flagged; `409` for completed or failed |
| POST   | `/api/system/pause`     | Returns the system status                                                                                       |
| POST   | `/api/system/resume`    | Returns the system status                                                                                       |
| GET    | `/api/system/status`    | Paused flag, concurrency, active count, task counts, last event id                                              |
| GET    | `/api/events`           | Server-Sent Events stream (see below)                                                                           |

Unknown paths return `404 NOT_FOUND`. Invalid ids or queries return `400 VALIDATION_FAILED`. Bodies over 64 KB return `413`.

## Server-Sent events [present]

`GET /api/events` is `text/event-stream`. The server sends `retry: 2000`, then one message per execution event:

```
id: <event id>
data: <ExecutionEvent JSON>
```

Event types: `plan.created`, `plan.status`, `task.status` (with `from`, `to`, `attempt` and any `error`), `task.log`, and `system.status`. A `: ping` comment is sent every 15 s.

Replay: events are read from the database, not from memory. If the request has a numeric `Last-Event-ID` header (which `EventSource` sends on reconnect), the stream resumes after that id. Without the header, the stream starts after the newest existing event, so a new client receives only later events. Each event is sent once per connection, in id order. The web workspace also ignores any event whose id it has already shown.

Limits: at most 10 open streams; the 11th gets `503 TOO_MANY_STREAMS`. Streams are closed when the server shuts down.

## Shared contracts [present]

`packages/contracts`: Zod schemas and inferred types used by both apps (task, plan, plan spec, event, system status, command request and response, error envelope, and the handler input schemas). Consumed directly from TypeScript source (no build step), which keeps dev, test, typecheck and build simple.

## Planned components [planned]

None of these exist yet; they are described so later phases stay consistent.

- `workers/`: a separate worker process. Not planned for the engine, which runs in `apps/api`.
- `packages/core`: domain types and logic (profile, job, application).
- `packages/agents`: task agents on top of the existing engine. The queue and orchestrator are already in `apps/api/src/engine`.
- `packages/ai`: AI provider abstraction. Ollama is an optional local provider; Claude is used on demand only; no LLM API is mandatory and the system must degrade gracefully without one.
- `packages/browser`: browser automation. Playwright is the primary driver; OpenBrowser is an optional alternative. Claude Code and Claude in Chrome are not runtime dependencies.
- `packages/resume-engine`: tailoring from the master LaTeX resume.

## Security and privacy boundaries

- No paid APIs required; no secrets in the repo (`.env` is ignored, `.env.example` holds defaults only).
- Data stays on the local machine unless the user directs an external action.
- Every external action writes an `AuditEvent`.
- CAPTCHA and MFA are never bypassed; the agent stops and asks the user.
- The API binds to `127.0.0.1` only, and rejects requests whose `Host` is not `127.0.0.1` or `localhost`.
- Command input is never interpreted as natural language; only the fixed grammar above runs.
