# Execution engine design (Phase 1)

Status: design, not yet implemented. Baseline: commit `27bb248` (Phase 0). This document is the single source for the Phase 1 build. Where it disagrees with the brief, the reason is given in place.

## 0. Baseline facts and deviations from the brief

Facts from the code at `27bb248`:

- `apps/api/src/app.ts` exports `buildApp(prisma)`, logger off, one route (`GET /api/health`). `server.ts` listens on `127.0.0.1:API_PORT` with top-level await. No shutdown handling.
- Prisma 7, `prisma-client` generator to `src/generated/prisma`, SQLite through `PrismaBetterSqlite3`. One model, `AuditEvent`, with JSON stored as `String` (`detail`). One migration, `20261118173239_init`.
- Tests: `apps/api/test/**/*.test.ts`, each test migrates a temp DB with `prisma migrate deploy` (see `test/health.test.ts`).
- Web: `App.tsx` runs `help` and `status` client-side; `status` calls `/api/health`. Vite proxies `/api` to the API.
- E2E: `playwright.config.ts` starts `npm run dev` (tsx **watch** + vite) and reuses an existing server outside CI.
- `docs/implementation-roadmap.md` calls Phase 1 "Discovery pipeline" and `docs/architecture.md` plans a separate `workers/` process and `packages/agents`.

Deviations, decided:

1. **The engine runs in-process inside `apps/api`**, not in `workers/` or `packages/agents`. One process, one SQLite writer, no IPC. A separate worker package would be an empty abstraction today. The roadmap gets a new Phase 1 "Execution engine" and the later phases shift by one; `architecture.md` is updated (step 12).
2. **No separate "planner" or "recovery" module.** Planning is plan validation plus `/plans create`. Recovery is a pure decision function in the state machine, a repository query, and a call in the scheduler's start sequence.
3. **Integer ids for plans and tasks**, not UUIDs, so commands like `/tasks cancel 7` are easy to type and e2e ids are deterministic on a fresh DB.
4. **Status and JSON columns are `String`**, matching the existing `AuditEvent.detail` style, and are validated by Zod in contracts. This avoids depending on Prisma's SQLite enum/Json emulation and keeps migrations plain.
5. **Phase 0 client-side commands move to the server.** Every command goes through `POST /api/commands`; the web app becomes a thin terminal.
6. **The fencing token is `(leaseOwner, attempts)`**, not a separate token column, because `attempts` is incremented by every claim.
7. **Plan creation syntax is JSON** (`/plans create {...}`) plus a fixed `/plans demo`. A custom mini-language would be a parser to maintain, with no benefit over the Zod schema.

## 1. Prisma schema

New migration `apps/api/prisma/migrations/<timestamp>_execution_engine`, created with `npm run db:migrate -- --name execution_engine` after stopping `npm run dev`. The `init` migration is never edited.

```prisma
model Plan {
  id             Int       @id @default(autoincrement())
  name           String?
  status         String    // PlanStatus: ACTIVE | COMPLETED | FAILED | CANCELLED (derived cache, see 2.4)
  idempotencyKey String?   @unique
  requestHash    String?   // sha256 of the command text, for idempotency-key conflict detection
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt
  completedAt    DateTime?
  tasks          Task[]
}

model Task {
  id                Int       @id @default(autoincrement())
  planId            Int
  plan              Plan      @relation(fields: [planId], references: [id], onDelete: Cascade)
  key               String    // plan-local id from the plan spec, e.g. "fetch-a"
  type              String    // handler type, e.g. "system.echo"
  status            String    // TaskStatus
  priority          Int       // 0..9, higher runs first
  input             String    // JSON text, validated against the handler schema
  result            String?   // JSON text
  error             String?   // JSON text: { code, message }
  attempts          Int       @default(0)
  maxAttempts       Int
  timeoutMs         Int
  idempotencyKey    String    @unique // `${planId}:${key}`
  leaseOwner        String?   // instance id of the claiming process
  leaseExpiresAt    DateTime?
  availableAt       DateTime? // earliest time a RETRYING task may be re-queued
  cancelRequestedAt DateTime?
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  startedAt         DateTime? // start of the latest attempt
  completedAt       DateTime? // set on any terminal state
  dependsOn         TaskDependency[] @relation("dependent")
  dependents        TaskDependency[] @relation("dependency")

  @@index([status, priority, id])
  @@index([planId])
}

model TaskDependency {
  taskId      Int
  dependsOnId Int
  task        Task @relation("dependent", fields: [taskId], references: [id], onDelete: Cascade)
  dependsOn   Task @relation("dependency", fields: [dependsOnId], references: [id], onDelete: Cascade)

  @@id([taskId, dependsOnId])
  @@index([dependsOnId])
}

model ExecutionEvent {
  id        Int      @id @default(autoincrement()) // SSE event id
  createdAt DateTime @default(now())
  type      String
  planId    Int?
  taskId    Int?
  data      String   // JSON text

  @@index([planId])
  @@index([taskId])
}

model SystemState {
  id        Int      @id // always 1
  paused    Boolean  @default(false)
  updatedAt DateTime @updatedAt
}
```

Decisions:

- **Explicit `TaskDependency` join model**, not an implicit self-relation: it gives a named reverse index (`dependsOnId`) for cascade lookups and a readable table. Dependencies are only within one plan.
- **New `ExecutionEvent` model; `AuditEvent` is not extended.** AuditEvent is the append-only record of operator and external actions under the autonomy policy. Execution events are high-volume engine telemetry and the SSE replay log, and need a dense monotonic id. Mixing them would flood the audit log and make SSE ids skip. AuditEvent's existing `target` (`plan:3`, `task:7`) already identifies the subject, so no `planId`/`taskId` columns are added to it.
- **`ExecutionEvent.id` is the SSE id.** SQLite `AUTOINCREMENT` never reuses ids, and SQLite has a single writer, so ids become visible in commit order. A reader can never see id N+1 before id N, which is what makes "replay `id > lastId`" correct without gaps.
- **`SystemState` is a single row with `id = 1`**, created by an `upsert` in engine start (not hand-written SQL in the migration), so tests and fresh DBs need no seeding.
- **Indexes:** `Task(status, priority, id)` serves the claim query and status filters. `Task(planId)` serves plan views and cascades. `TaskDependency(dependsOnId)` serves "who depends on X". `ExecutionEvent` has the primary key for replay plus `planId`/`taskId` for task detail views. `Plan.idempotencyKey` and `Task.idempotencyKey` are unique. Nothing else; the data is local and small.
- **No raw SQL against `DateTime` columns.** The Prisma client handles their encoding; raw comparisons risk format mismatches.

## 2. State machine

### 2.1 Task states and transitions

| From \ To | PENDING | BLOCKED | QUEUED | RUNNING | RETRYING | COMPLETED | FAILED | CANCELLED |
| --------- | ------- | ------- | ------ | ------- | -------- | --------- | ------ | --------- |
| PENDING   | -       | yes     | yes    | -       | -        | -         | -      | yes       |
| BLOCKED   | -       | -       | yes    | -       | -        | -         | -      | yes       |
| QUEUED    | -       | -       | -      | yes     | -        | -         | -      | yes       |
| RUNNING   | -       | -       | -      | -       | yes      | yes       | yes    | yes       |
| RETRYING  | -       | -       | yes    | -       | -        | -         | -      | yes       |
| COMPLETED | -       | -       | -      | -       | -        | -         | -      | -         |
| FAILED    | -       | -       | -      | -       | -        | -         | -      | -         |
| CANCELLED | -       | -       | -      | -       | -        | -         | -      | -         |

Meaning of each allowed transition:

- PENDING is the creation state. The scheduler's resolve step moves it to QUEUED (no dependencies, or all COMPLETED), BLOCKED (some dependency not terminal), or CANCELLED (some dependency FAILED/CANCELLED).
- BLOCKED → QUEUED when all dependencies are COMPLETED; → CANCELLED by cascade or user cancel.
- QUEUED → RUNNING only by an atomic claim (section 3).
- RUNNING → COMPLETED (handler success), RETRYING (retryable failure or recoverable interruption with attempts left), FAILED (non-retryable, attempts exhausted, or a non-idempotent interruption), CANCELLED (cancel acknowledged).
- RETRYING → QUEUED when `availableAt <= now`.
- Any non-terminal state → CANCELLED on user cancel or dependency cascade (RUNNING only through the executor; see 8.3).

Forbidden, in particular: any transition out of a terminal state; any transition into PENDING; self-transitions; QUEUED → COMPLETED/FAILED (no result without running); PENDING/BLOCKED/RETRYING → RUNNING (only QUEUED can be claimed); RUNNING → QUEUED (a retry must pass through RETRYING so the attempt is recorded and backoff is applied); RUNNING → BLOCKED/PENDING.

### 2.2 Enforcement

- `apps/api/src/engine/state-machine.ts` is pure (no I/O). It exports `TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]>`, `canTransition`, `assertTransition` (throws `InvalidTransitionError`), `isTerminal`, `derivePlanStatus`, `decideFailure`, `decideInterrupted` and `backoffMs`. Status string unions come from `@jobintel/contracts`.
- `apps/api/src/engine/repository.ts` is the **only** module that writes `Task.status` or `Plan.status`. Every write goes through `transitionTask(tx, { taskId, from, to, fence?, patch })`, which:
  1. calls `assertTransition(from, to)`;
  2. runs `tx.task.updateMany({ where: { id, status: from, ...fence }, data: { status: to, ...patch } })` and returns `false` if `count !== 1` (the state changed under us; the caller re-reads);
  3. appends a `task.status` ExecutionEvent;
  4. if `to` is FAILED or CANCELLED, cascades to dependents (2.3);
  5. re-derives the plan status and, if it changed, updates `Plan.status`/`completedAt` and appends a `plan.status` event.
     All of this runs in one `$transaction`.
- Creation (`createPlan`) inserts tasks as PENDING. That is the only status write outside `transitionTask`, and it is in the same file.
- Guard test `apps/api/test/architecture.test.ts` scans `apps/api/src/**/*.ts` and fails if `.task.update(`, `.task.updateMany(`, `.plan.update(` or `.plan.updateMany(` appears outside `engine/repository.ts`.

### 2.3 Dependency failure propagation

When a task becomes FAILED or CANCELLED, every **transitive** dependent that is not terminal becomes **CANCELLED** with `error = { code: "DEPENDENCY_FAILED", message: "dependency <key> (#id) ended FAILED|CANCELLED" }`, in the same transaction. Dependents can only be PENDING or BLOCKED at that moment (a task is never QUEUED while a dependency is unfinished), so the cascade uses PENDING/BLOCKED → CANCELLED only.

The cascade uses CANCELLED, not FAILED, so that FAILED always means "this task's own execution failed". The plan still derives FAILED from the root cause.

### 2.4 Plan status derivation

`derivePlanStatus(taskStatuses)` (pure):

- some task is not terminal → `ACTIVE`;
- all tasks are COMPLETED → `COMPLETED`;
- all are terminal and any is FAILED → `FAILED`;
- otherwise (all terminal, some CANCELLED, none FAILED) → `CANCELLED`.

`Plan.status` is a persisted cache of this function. It is written only by `transitionTask`, so it is always consistent with the tasks, and listing plans needs no aggregation. A failed branch does not stop independent branches; the plan becomes FAILED once everything has settled. Plans have four states. A separate "plan PENDING" state adds nothing for the user.

## 3. Atomic claiming and fencing

Claim, for each free executor slot:

```ts
const candidates = await prisma.task.findMany({
  where: { status: 'QUEUED' },
  orderBy: [{ priority: 'desc' }, { id: 'asc' }],
  take: freeSlots,
  select: { id: true },
});
for (const { id } of candidates) {
  const claimed = await prisma.$transaction(async (tx) => {
    // The first statement in the transaction is a write, so the SQLite RESERVED lock is
    // taken at once (no read-to-write lock upgrade, so no SQLITE_BUSY deadlock).
    const r = await tx.task.updateMany({
      where: { id, status: 'QUEUED' },
      data: {
        status: 'RUNNING',
        leaseOwner: instanceId,
        leaseExpiresAt: now + leaseMs,
        attempts: { increment: 1 },
        startedAt: now,
      },
    });
    if (r.count !== 1) return null; // someone else won
    const task = await tx.task.findUniqueOrThrow({ where: { id } });
    /* append task.status event, re-derive plan status */
    return task;
  });
}
```

(In the implementation this goes through `transitionTask` with `from: 'QUEUED'`; it is shown expanded here for clarity.)

Why two claimers cannot both win: the `UPDATE ... WHERE id = ? AND status = 'QUEUED'` is a single statement executed under SQLite's database-wide write lock. Within one process, better-sqlite3 runs statements one at a time on one connection. Across processes (only in the concurrency test), the write lock serializes them. The second claimer's predicate no longer matches, `count` is 0, and it moves on. The candidate read is outside the transaction on purpose: it may be stale, and the conditional update corrects that.

**Fencing.** A claim produces the token `(leaseOwner = instanceId, attempts = N)`. Every later write for that execution (heartbeat, complete, fail, retry, cancel-ack) uses `transitionTask` with `fence: { leaseOwner: instanceId, attempts: N }` and `from: 'RUNNING'`. If recovery, a cancel or another instance has moved the task on, the update matches 0 rows. The executor then **discards** the handler's result, writes nothing, and logs `stale result discarded for task N` to the console. A completed task can therefore never be overwritten, and a stale executor can never complete a re-run attempt.

SQLite settings: no WAL (single process; avoids `-wal`/`-shm` files and Windows migrate friction). better-sqlite3's default 5000 ms busy timeout covers the multi-client test. Keep transactions short: only DB calls inside, never a handler call.

## 4. Leases and recovery

- `instanceId = crypto.randomUUID()`, created once per process start.
- Lease 30 s (`leaseMs`), heartbeat every 10 s (`leaseMs / 3`). The heartbeat is a fenced `updateMany` that sets `leaseExpiresAt = now + leaseMs` and returns whether it matched. It also reads `cancelRequestedAt`. If the heartbeat matches 0 rows, the lease is lost and the executor aborts the handler with reason `lease-lost` and writes nothing.
- **Single engine per database file** is the operating assumption. The practical guard is that the engine starts only after `app.listen` succeeds on the fixed port. Fencing keeps state correct even if that assumption is broken.

**Abandoned task:** `status = RUNNING AND leaseOwner != currentInstanceId AND (atStartup OR leaseExpiresAt < now)`. At startup, every RUNNING task owned by another instance is abandoned: the previous process is gone, because we hold the port. The periodic sweep in each scheduler tick catches only expired leases of other owners, which covers an overlapping instance that died later.

**Decision** (`decideInterrupted`, pure, in `state-machine.ts`), applied in this order:

1. `cancelRequestedAt` is set → CANCELLED (`code: CANCELLED`).
2. handler type is no longer registered → FAILED (`code: UNKNOWN_HANDLER`).
3. handler `idempotent === false` → FAILED (`code: INTERRUPTED`, message "interrupted during execution; not re-run because the handler is not idempotent").
4. `attempts >= maxAttempts` → FAILED (`code: INTERRUPTED`, "retries exhausted").
5. otherwise → RETRYING with `availableAt = now` (no backoff; the interruption was not the task's fault). The next tick re-queues it.

The interrupted attempt counts toward `maxAttempts`. That is simpler and bounds crash loops.

Each recovery write is fenced against the **old** owner: `fence: { leaseOwner: oldOwner, attempts: oldAttempts }`. A still-alive old process loses, not the recovery.

**Duplicate-execution guarantees:** only QUEUED tasks can be claimed, and terminal states have no outgoing transitions, so a COMPLETED task is never run again. A task that finished its side effects but crashed before writing COMPLETED is re-run only if its handler declares itself idempotent. Otherwise it fails safe as FAILED/INTERRUPTED.

**Startup sequence (`server.ts`):**

1. `createPrisma()`; `upsert` the `SystemState` row with id 1.
2. Create `instanceId`, the registry and the engine (scheduler not started); `buildApp(prisma, engine)`.
3. `await app.listen({ host: '127.0.0.1', port })`. If this fails, exit with code 1 without touching tasks.
4. `engine.start()`, which runs `repository.recoverAbandoned({ instanceId, atStartup: true })`, writes one `AuditEvent` (`actor: system`, `action: engine.recover`, detail `{ recovered, retried, failed, cancelled }`) when the count is above 0, then starts the scheduler loop. The first tick re-queues the RETRYING tasks.
5. Register `SIGINT` and `SIGTERM` to call graceful shutdown (section 7.4).

## 5. Handler registry

`apps/api/src/engine/handlers.ts`:

```ts
export interface TaskLogger { info(msg: string): void; warn(msg: string): void; error(msg: string): void }
export interface TaskContext {
  taskId: number; planId: number; attempt: number; idempotencyKey: string;
  idempotent: boolean; signal: AbortSignal; logger: TaskLogger;
}
export interface TaskHandler<TInput, TResult> {
  type: string;
  input: z.ZodType<TInput>;   // imported from @jobintel/contracts
  idempotent: boolean;
  defaults: { timeoutMs: number; maxAttempts: number };
  run(input: TInput, ctx: TaskContext): Promise<TResult>;
}
export function defineHandler<I, R>(h: TaskHandler<I, R>): AnyTaskHandler; // erases generics for the map
export type Registry = ReadonlyMap<string, AnyTaskHandler>;
export function createRegistry(handlers: AnyTaskHandler[]): Registry; // throws on duplicate type
export function createDefaultRegistry(deps: { prisma: PrismaClient; apiBaseUrl: string }): Registry;
export class TaskError extends Error { constructor(code: string, message: string, readonly retryable: boolean) }
```

- **Input schemas live in `packages/contracts/src/engine.ts`** as `taskInputSchemas` (a record keyed by type), all `z.strictObject`. They are validated twice: (a) during plan validation, so bad plans are rejected before any row is written, and (b) by the executor immediately before `run`, on the stored JSON. A failure at (b) gives FAILED `INVALID_INPUT`, never retried; it protects against schema changes between creation and execution.
- `logger` writes `task.log` ExecutionEvents (`{ level, message }`). Messages are truncated to 500 chars, with at most 100 log events per attempt; further calls are dropped and one `warn` notes the drop.
- Tests build their own registry with test-only handlers (`test/helpers/handlers.ts`: `test.fail`, `test.flaky` (fails the first N calls), `test.side-effect` (non-idempotent, counts calls), `test.wait` (resolves when released or aborted)). These are never registered in production.

Demonstration handlers:

| type                  | input (strict)                | idempotent | defaults (timeout / attempts) | behaviour                                                                                                                                                                                             |
| --------------------- | ----------------------------- | ---------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `system.echo`         | `{ message: string 1..1000 }` | true       | 5 000 ms / 3                  | returns `{ message }`                                                                                                                                                                                 |
| `system.delay`        | `{ ms: int 0..60000 }`        | true       | 65 000 ms / 3                 | `await setTimeout(ms, undefined, { signal })` from `node:timers/promises`; abort rejects at once; returns `{ sleptMs }`                                                                               |
| `system.health-check` | `{}`                          | true       | 5 000 ms / 2                  | `SELECT 1` through Prisma, then `fetch(apiBaseUrl + '/api/health', { signal })`. `apiBaseUrl` is built by the server as `http://127.0.0.1:${port}` and is never user input. Returns `{ database: 'ok' | 'error', api: 'ok' | 'error' }`; throws a retryable `TaskError` if either fails |

No handler reaches any host other than 127.0.0.1.

## 6. Command grammar and plan validation

### 6.1 Grammar

Parsing is in `engine/commands.ts`, `parseCommand(text): Command | CommandError`. It is pure and needs no LLM. Input is trimmed. The command word and subcommand are case-insensitive. Tokens are separated by whitespace, except the JSON tail of `/plans create`.

```
/help
/status
/pause
/resume
/tasks                      same as /tasks list
/tasks list [<status>]      status is one of the 8 task states (case-insensitive)
/tasks show <id>
/tasks cancel <id>
/plans                      same as /plans list
/plans list
/plans show <id>
/plans create <json>        rest of the line is a PlanSpec JSON object
/plans demo                 creates the fixed demo plan below
```

- `<id>` is a positive integer; anything else gives `INVALID_ARGUMENTS`.
- `/plans` list and show are a small addition to the brief. They are the command form of the brief's `GET /api/plans` endpoints, and the e2e test needs them.
- **Natural language is rejected.** If the input does not start with `/` and is not exactly `help` or `status` (kept bare for Phase 0 compatibility), the response is `400 NOT_A_COMMAND`: "JobIntel only understands commands, and they start with '/'. Natural-language requests are not supported. Type /help." A `/word` that is not in the grammar gives `UNKNOWN_COMMAND`. Extra or missing arguments give `INVALID_ARGUMENTS` with the correct usage line.

PlanSpec (contracts `planSpecSchema`, strict at every level):

```json
{
  "name": "optional, 1..100 chars",
  "tasks": [
    {
      "key": "a",
      "type": "system.echo",
      "input": { "message": "hi" },
      "dependsOn": [],
      "priority": 5,
      "maxAttempts": 3,
      "timeoutMs": 5000
    }
  ]
}
```

`key` matches `^[a-z0-9][a-z0-9-]{0,31}$`. `dependsOn` defaults to `[]`, `priority` defaults to 5, and `maxAttempts`/`timeoutMs` default to the handler defaults.

Demo plan (`/plans demo`), a diamond: `hello` (echo "hello") → `wait-a` (delay 2000) and `wait-b` (delay 1000) → `check` (health-check, depends on both).

### 6.2 Validation rules (`engine/plan-validation.ts`, pure)

`validatePlan(spec: unknown, registry): { ok: true; plan: NormalizedPlan } | { ok: false; errors: { path: string; message: string }[] }`. It collects all errors, not only the first:

1. Structure is valid against `planSpecSchema` (strict, so unknown fields are rejected).
2. 1..50 tasks.
3. Task keys are unique.
4. Every `dependsOn` entry names an existing key; no self-dependency; no duplicate entries.
5. No cycles. Kahn's algorithm; the error lists the keys left in the cycle.
6. `type` is registered.
7. `input` passes that type's schema.
8. `priority` is an integer 0..9; `maxAttempts` is an integer 1..5; `timeoutMs` is an integer 100..300 000.
9. The serialized `input` is at most 16 KB per task.

Errors return `400 PLAN_INVALID` with `details: errors`. Valid plans are inserted in one transaction: the Plan as ACTIVE, the tasks as PENDING with `idempotencyKey = ${planId}:${key}`, the dependency rows, a `plan.created` event, and an AuditEvent. Then `scheduler.wake()` is called.

## 7. Modules, scheduler, pause and shutdown

### 7.1 Layout (new files marked +)

```
apps/api/src/
  app.ts                      buildApp(prisma, engine): body limit, host check, error envelope, routes
  server.ts                   startup and shutdown sequence (4, 7.4)
  config.ts            +      EngineConfig defaults + env parsing (ENGINE_CONCURRENCY, ENGINE_SHUTDOWN_TIMEOUT_MS)
  engine/
    state-machine.ts   +      pure: transitions, plan derivation, failure/interrupt decisions, backoff
    plan-validation.ts +      pure
    commands.ts        +      parseCommand (pure) + runCommand(engine, cmd) -> { output, data }
    handlers.ts        +      types, registry, three demo handlers, TaskError
    repository.ts      +      every engine DB write and read; transitionTask, claim, heartbeat, recovery
    event-bus.ts       +      EventEmitter wrapper: notify() after commit, subscribe/unsubscribe
    executor.ts        +      runs one claimed task: validate, timers, abort, classify outcome
    scheduler.ts       +      tick loop, active map, start/stop/wake, shutdown drain
    engine.ts          +      createEngine(...) facade used by routes and server
  routes/
    engine.ts          +      commands, plans, tasks, system routes
    events.ts          +      SSE
packages/contracts/src/engine.ts + schemas and types
```

No other layers. `engine.ts` exposes `start()`, `stop()`, `wake()`, `pause()`, `resume()`, `cancelTask(id)`, `createPlan(spec, idemKey, requestHash)`, `status()`, the queries, and `bus`.

### 7.2 Scheduler loop

There is one loop per process. It is a `setTimeout` chain, never `setInterval`, so ticks cannot overlap. The poll interval is 500 ms, and `wake()` runs a tick at once (debounced to one pending tick) after plan creation, resume, cancel and every task settlement. Each tick does:

1. Re-queue RETRYING tasks with `availableAt <= now` → QUEUED.
2. Resolve PENDING/BLOCKED tasks: for each, read dependency statuses → QUEUED, BLOCKED or CANCELLED (a PENDING task with unfinished dependencies → BLOCKED; a BLOCKED task with unfinished dependencies stays as it is).
3. Sweep abandoned tasks (other owner, expired lease) → recovery decision.
4. If not paused and not stopping: claim up to `concurrency - active.size` tasks (default concurrency 2, so the claim batch is the number of free slots) and start an executor for each without awaiting it.

Steps 1 to 3 still run while paused, because they are bookkeeping and not execution. A tick error is logged to the console and the loop continues.

### 7.3 Pause and resume

`SystemState.paused` is persisted, so a pause survives restarts. Pause stops step 4 only. RUNNING tasks are not aborted; they finish normally. Pause and resume each write `SystemState`, a `system.status` event and an AuditEvent in one transaction. Both are idempotent (pausing while paused returns 200 and changes nothing).

### 7.4 Graceful shutdown (`engine.stop()` + `server.ts`)

1. Set `stopping`; clear the tick timer; claim nothing more.
2. Wait for all active executions up to `shutdownTimeoutMs` (env `ENGINE_SHUTDOWN_TIMEOUT_MS`, default 10 000).
3. Abort the executions still running with reason `shutdown`, then wait a grace period of 2 000 ms.
4. For every execution still owned by this instance, apply `decideInterrupted` through a fenced `transitionTask`, so idempotent tasks go to RETRYING and non-idempotent ones to FAILED/INTERRUPTED. A handler that settled during the grace period because of the abort is classified the same way. Shutdown is an interruption, not a task failure.
5. End all SSE streams (Fastify `preClose` hook; see 10), `app.close()`, `prisma.$disconnect()`, exit 0. A second signal exits 1 at once.

Windows note: `child.kill()` and tsx-watch restarts do not deliver SIGTERM on Windows; they terminate the process. Only Ctrl+C (SIGINT) and in-process `stop()` are graceful. Startup recovery (4) is the main safety net and is what the e2e test exercises.

## 8. Timeouts, retries, cancellation

### 8.1 Executor outcome classification

The executor has one `AbortController` per execution. The abort reason is one of `timeout | cancel | lease-lost | shutdown`.

| Outcome                                        | Result                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------- |
| `run` resolves (even if a cancel arrived late) | COMPLETED with `result` (if JSON is over 64 KB: FAILED `RESULT_TOO_LARGE`) |
| abort reason `cancel`                          | CANCELLED (`code: CANCELLED`)                                              |
| abort reason `lease-lost`                      | nothing written (someone else owns the outcome)                            |
| abort reason `shutdown`                        | `decideInterrupted` (7.4)                                                  |
| abort reason `timeout`                         | `decideFailure` with `retryable = idempotent`, code `TIMEOUT`              |
| throws `TaskError`                             | `decideFailure` with `retryable = err.retryable`, the error's code         |
| throws anything else                           | `decideFailure` with `retryable = idempotent`, code `HANDLER_ERROR`        |
| stored input fails schema                      | FAILED `INVALID_INPUT` (no retry)                                          |

`decideFailure({ retryable, attempts, maxAttempts })` gives RETRYING with `availableAt = now + backoffMs(attempts)` if `retryable && attempts < maxAttempts`, and FAILED otherwise. Non-idempotent handlers retry only when they throw `TaskError(..., retryable: true)` explicitly, which asserts that no side effect happened. `error.message` is truncated to 1 000 chars and never includes a stack. Stacks go to the console only.

### 8.2 Timeout and backoff

`timeoutMs` is per task (handler default, overridable in the PlanSpec within 100..300 000). On timeout the executor aborts with reason `timeout`. If the handler has not settled within the 2 000 ms grace period, the executor writes the outcome anyway and abandons the promise (JavaScript cannot kill it; see risk R2).

`backoffMs(attempt) = min(retryBaseMs * 2^(attempt-1), 60 000)`, with `retryBaseMs` 1 000 by default and set to 10 in tests. There is no jitter: one process, and deterministic tests.

### 8.3 Cancellation

`engine.cancelTask(id)`:

- PENDING, BLOCKED, QUEUED, RETRYING → CANCELLED at once via `transitionTask` (and cascade). If the conditional update loses a race, re-read and apply the rule for the new state (at most 3 loops).
- RUNNING → set `cancelRequestedAt` (a repository write that does not change status); if the execution is active in this process, `abort('cancel')`. The handler cooperates through `signal`; the executor writes CANCELLED when it settles, or after the 2 000 ms grace period. If the owner is a dead instance, recovery sees `cancelRequestedAt` and goes to CANCELLED. The response is `202` with the task (status still RUNNING, `cancelRequested: true`). The final state arrives over SSE.
- CANCELLED → `200` no-op (idempotent). COMPLETED or FAILED → `409 INVALID_TRANSITION`.

Every accepted cancel writes an AuditEvent (`action: task.cancel`, `target: task:<id>`).

## 9. HTTP API

All bodies are JSON. Requests are validated with contracts schemas through `safeParse` in the route (no extra Fastify plugin). Responses are built from contracts types.

| Method and path                     | Request                                                             | Success                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `POST /api/commands`                | `{ command: string (1..32768) }`, optional header `Idempotency-Key` | `200 { output: string, data?: unknown }`; `/tasks cancel` on RUNNING still 200 (the output says cancellation was requested) |
| `GET /api/plans`                    | `?limit=1..200` (default 50)                                        | `200 { plans: PlanSummary[] }` (newest first, with task counts by status)                                                   |
| `GET /api/plans/:id`                |                                                                     | `200 { plan: Plan, tasks: Task[] }`                                                                                         |
| `GET /api/tasks`                    | `?status=&planId=&limit=`                                           | `200 { tasks: Task[] }` (newest first)                                                                                      |
| `GET /api/tasks/:id`                |                                                                     | `200 { task: Task, events: ExecutionEvent[] }` (last 50 for the task)                                                       |
| `POST /api/tasks/:id/cancel`        | empty body                                                          | `200` (cancelled or already cancelled) or `202` (running, cancel requested) `{ task }`                                      |
| `POST /api/system/pause` / `resume` | empty body                                                          | `200 { status: SystemStatus }`                                                                                              |
| `GET /api/system/status`            |                                                                     | `200 SystemStatus = { paused, concurrency, active, counts: Record<TaskStatus, number>, lastEventId }`                       |
| `GET /api/events`                   | header `Last-Event-ID`                                              | `200 text/event-stream`                                                                                                     |
| `GET /api/health`                   |                                                                     | unchanged                                                                                                                   |

The `Task` DTO is `{ id, planId, key, type, status, priority, attempts, maxAttempts, timeoutMs, input, result, error, dependsOn: number[], cancelRequested, createdAt, updatedAt, startedAt, completedAt }`. Lease fields are internal and not exposed.

**Error envelope** (every non-2xx response, set by `app.setErrorHandler` and `setNotFoundHandler`): `{ error: { code, message, details? } }`.

| HTTP | codes                                                                                                                                      |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| 400  | `VALIDATION_FAILED` (body/query/params, including unknown fields), `NOT_A_COMMAND`, `UNKNOWN_COMMAND`, `INVALID_ARGUMENTS`, `PLAN_INVALID` |
| 403  | `FORBIDDEN_HOST`                                                                                                                           |
| 404  | `NOT_FOUND`                                                                                                                                |
| 409  | `INVALID_TRANSITION`, `IDEMPOTENCY_CONFLICT`                                                                                               |
| 413  | `PAYLOAD_TOO_LARGE` (Fastify `bodyLimit: 65536`)                                                                                           |
| 415  | `UNSUPPORTED_MEDIA_TYPE` (non-JSON body)                                                                                                   |
| 503  | `TOO_MANY_STREAMS` (SSE limit)                                                                                                             |
| 500  | `INTERNAL`, generic message; details only to the console                                                                                   |

**Idempotency.** `Idempotency-Key` (1..100 chars, `[A-Za-z0-9_-]`, otherwise 400) only affects plan-creating commands (`/plans create`, `/plans demo`). The other commands are reads or naturally idempotent, and the header is ignored for them. On plan creation: if a Plan with that key exists and its `requestHash` equals `sha256(command)`, return the original plan with `200` and `data.replayed = true`; if the hash differs, return `409 IDEMPOTENCY_CONFLICT`. A unique-constraint race on insert (P2002) is handled the same way, by re-reading. The web client sends `crypto.randomUUID()` per submission.

## 10. Server-Sent Events

- Every committed engine change writes an ExecutionEvent, and then (after the `$transaction` resolves) `bus.notify()`.
- Each event is sent with no `event:` line (so clients use `onmessage`):
  ```
  id: 42
  data: {"id":42,"at":"2026-11-18T10:00:00.000Z","type":"task.status","planId":3,"taskId":7,"data":{"key":"wait-a","from":"QUEUED","to":"RUNNING","attempt":1}}
  ```
  Types: `plan.created` `{ name, taskCount }`, `plan.status` `{ from, to }`, `task.status` `{ key, from, to, attempt, error? }`, `task.log` `{ level, message }`, `system.status` `{ paused }`. Events never carry task input or result.
- **One delivery path for replay and live.** On connect, `cursor = Number(Last-Event-ID)` if it is valid; otherwise the current max id (live only). A per-connection `pump()` reads `id > cursor ORDER BY id LIMIT 100`, writes, advances the cursor, and repeats until the page is empty. `pump` runs on connect, on every `bus` notify, and on every heartbeat. Because the database is the source and ids are committed in order, there are no gaps and no duplicates within a connection.
- The stream starts with `retry: 2000`. A heartbeat comment `: ping` is sent every 15 s (`heartbeatMs`, configurable for tests).
- Reconnect is client-side: the browser's `EventSource` reconnects by itself and sends `Last-Event-ID`; the server replays from there. The client also drops any id at or below its last seen id.
- **Backpressure:** if `reply.raw.write()` returns false, the pump stops until `'drain'`. The cursor lives in the database, so a slow client costs no server memory beyond one page. At most 10 concurrent streams; the 11th gets `503 TOO_MANY_STREAMS`.
- Implementation: `reply.hijack()`; `writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'x-accel-buffering': 'no' })`. On `request.raw` `'close'`: unsubscribe and clear timers. All open streams are kept in a set and ended in a Fastify **`preClose`** hook; otherwise `app.close()` waits forever on the hijacked connections.

## 11. Frontend

`apps/web/src/App.tsx` stays a single component (and may get one small helper module `api.ts` if `App.tsx` passes about 200 lines).

- Submitting a line POSTs to `/api/commands` with `Idempotency-Key: crypto.randomUUID()` and prints `output`. On an error it prints `error.message` plus one line per `details` entry, styled as an error. On a network failure it prints "API unreachable". The local `help`/`status` switch is removed; the server's `/status` output keeps the `database: ok` line so the smoke test still passes.
- In `useEffect`, it opens one `EventSource('/api/events')`. `onmessage` parses with `executionEventSchema`, ignores ids at or below `lastEventIdRef`, and appends a compact line, for example `task 7 wait-a QUEUED -> RUNNING (attempt 1)`, `plan 3 COMPLETED`, `engine paused`, `task 7 log: ...`. `onopen`/`onerror` set the connection state. The stream is closed on unmount.
- State: `lines` (component state, capped at 500, oldest dropped), `connection: 'live' | 'reconnecting'` (component state, shown as small text in the header), `lastEventIdRef` (ref, so updates do not re-render). Nothing else: no store, no router, no task table. Task state is fetched with `/tasks` and `/plans show`.
- Phase 0 visual style is unchanged.

## 12. Security and privacy

- The bind stays `127.0.0.1`. **Host check** in an `onRequest` hook: reject with `403 FORBIDDEN_HOST` unless the `Host` hostname is `127.0.0.1` or `localhost` (any port, because the Vite proxy forwards `127.0.0.1:5173`). This blocks DNS rebinding. No CORS plugin, so cross-origin pages cannot read responses, and the JSON content-type requirement forces a preflight that fails.
- Size limits: request body 64 KB; command 32 KB; task input 16 KB; result 64 KB; error message 1 000 chars; log message 500 chars and 100 per attempt; at most 50 tasks per plan; at most 10 SSE streams; list `limit` at most 200.
- All request and PlanSpec schemas are `z.strictObject`; unknown fields are rejected with 400.
- What is persisted in events and audit: ids, keys, handler types, statuses, error codes and truncated messages, counts. Never task input or result, raw command text (only its sha256), headers, or stack traces. Fastify's logger stays off. Console logs carry ids and codes only.
- Handlers do no network egress except `system.health-check` to the server-configured `127.0.0.1` URL. No URL is ever taken from user input. No LLM calls.

## 13. Test plan

Shared helper `apps/api/test/helpers/db.ts` holds the temp-DB-plus-`migrate deploy` code from `health.test.ts` (that test is updated to use it). `test/helpers/engine.ts` builds an engine with test config: poll 20 ms, lease 300 ms, `retryBaseMs` 10, grace 100 ms, heartbeat 50 ms.

| Category                                  | File                                     | Asserts                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Transitions valid/invalid                 | `apps/api/test/state-machine.test.ts`    | all 64 pairs match the table in 2.1; terminal states have no exits; `assertTransition` throws `InvalidTransitionError`; `derivePlanStatus` cases; `decideFailure`/`decideInterrupted` truth tables; `backoffMs` values and 60 s cap                                                                                                                                                                   |
| Command parsing                           | `apps/api/test/commands.test.ts`         | each grammar form parses to the expected command; case-insensitivity; bare `help`/`status`; "find me jobs" → `NOT_A_COMMAND`; `/foo` → `UNKNOWN_COMMAND`; `/tasks show x` and `/tasks cancel` → `INVALID_ARGUMENTS`; bad JSON → `INVALID_ARGUMENTS`                                                                                                                                                   |
| Plan validation                           | `apps/api/test/plan-validation.test.ts`  | duplicate keys; missing dependency; self-dependency; 2-node and 3-node cycles (keys listed); unknown type; invalid input; unknown field at plan, task and input level; 50 tasks ok, 51 rejected; priority -1/10 rejected; timeout/attempts bounds; several errors reported together                                                                                                                   |
| Dependencies, success/failure             | `apps/api/test/engine-execution.test.ts` | demo diamond: `check.startedAt` is at or after both waits' `completedAt`, plan COMPLETED; `test.fail` (non-retryable) → FAILED and its transitive dependents CANCELLED with `DEPENDENCY_FAILED`, independent branch COMPLETED, plan FAILED; invalid stored input → FAILED `INVALID_INPUT`                                                                                                             |
| Retry limits, timeouts                    | `apps/api/test/engine-execution.test.ts` | `test.flaky` failing 2 times with maxAttempts 3 → COMPLETED with attempts 3; failing 5 times → FAILED with attempts 3; non-idempotent plain error → FAILED after 1 attempt; delay 1000 with timeoutMs 100 → TIMEOUT, retried up to max, then FAILED                                                                                                                                                   |
| Cancellation                              | `apps/api/test/engine-control.test.ts`   | cancel QUEUED/BLOCKED/RETRYING → CANCELLED at once, dependents cascade; cancel RUNNING `system.delay` → 202, then CANCELLED within grace, handler signal aborted; cancel non-cooperative `test.wait` → CANCELLED after grace; COMPLETED → 409; CANCELLED → 200 no-op                                                                                                                                  |
| Pause/resume                              | `apps/api/test/engine-control.test.ts`   | paused: QUEUED tasks stay QUEUED over 10 ticks; RUNNING task still completes; resume → run to completion; a new engine on the same DB starts paused                                                                                                                                                                                                                                                   |
| Duplicate prevention, concurrent claiming | `apps/api/test/claiming.test.ts`         | two PrismaClients on one temp DB file, 20 QUEUED tasks, two claimer loops run concurrently: union = 20, intersection empty, every task attempts = 1; fenced completion with a stale `(owner, attempts)` returns false and status is unchanged; claiming a COMPLETED task returns null; plan creation replay with the same key → same plan id, one plan row; different command with the same key → 409 |
| Restart recovery                          | `apps/api/test/recovery.test.ts`         | seeded RUNNING rows with `leaseOwner: 'dead'`: idempotent echo, attempts 1/3 → RETRYING → COMPLETED (attempts 2); `test.side-effect` (non-idempotent) → FAILED `INTERRUPTED` and its call count stays 0; attempts 3/3 → FAILED; `cancelRequestedAt` set → CANCELLED; COMPLETED rows untouched and handler never called; one `engine.recover` AuditEvent                                               |
| Graceful shutdown                         | `apps/api/test/shutdown.test.ts`         | `test.wait` released within the timeout → COMPLETED and `stop()` resolves; delay 5 000 with shutdown timeout 100 → aborted, RETRYING (idempotent); `test.side-effect` blocking → FAILED `INTERRUPTED`; no claims after `stop()` begins; `stop()` resolves within timeout + grace + margin                                                                                                             |
| Audit creation                            | `apps/api/test/engine-control.test.ts`   | AuditEvent rows for `plan.create`, `task.cancel`, `system.pause`, `system.resume` with `target`, outcome `ok`, and no input in `detail`                                                                                                                                                                                                                                                               |
| HTTP API                                  | `apps/api/test/routes.test.ts`           | every endpoint's status code and envelope; unknown body field → 400 `VALIDATION_FAILED`; 64 KB+ body → 413; `Host: evil.example` → 403; unknown task id → 404; idempotency replay/conflict over HTTP; NL command → 400 `NOT_A_COMMAND`                                                                                                                                                                |
| SSE connect/reconnect                     | `apps/api/test/sse.test.ts`              | `app.listen({ port: 0 })`, read the stream with `fetch`: events arrive with strictly increasing ids, `retry:` line first; with `Last-Event-ID: n` only ids > n arrive and none are duplicated; heartbeat comment arrives with `heartbeatMs` 50; the 11th stream → 503; `app.close()` resolves with a stream open                                                                                      |
| Status write guard                        | `apps/api/test/architecture.test.ts`     | no `task.update*`/`plan.update*` outside `engine/repository.ts`                                                                                                                                                                                                                                                                                                                                       |
| Handlers                                  | `apps/api/test/handlers.test.ts`         | echo result; delay rejects quickly on abort; delay schema rejects 60 001; health-check ok against a listening app on port 0                                                                                                                                                                                                                                                                           |
| Contracts                                 | `packages/contracts/src/engine.test.ts`  | strictness, bounds, status enums                                                                                                                                                                                                                                                                                                                                                                      |
| Web                                       | `apps/web/src/App.test.tsx`              | stubbed `fetch` and a fake `EventSource` on `globalThis` (jsdom lacks it): a command posts and renders output; an error envelope renders message and details; an SSE message renders a line; a duplicate id is ignored; the indicator switches between live and reconnecting                                                                                                                          |

**E2E** (`e2e/engine.spec.ts`; `smoke.spec.ts` kept). Playwright changes: `workers: 1`. The `webServer` runs only Vite (`npm run dev -w @jobintel/web -- --port 5174`, env `API_PORT=3100`, `reuseExistingServer: false`), and `baseURL` becomes `http://127.0.0.1:5174`. The API is managed by a worker-scoped fixture, `e2e/api-process.ts`, which:

- creates a temp dir and runs `prisma migrate deploy` with `DATABASE_URL` pointing there;
- spawns `process.execPath --import tsx src/server.ts` directly (no npm or shell wrapper, so `kill()` hits the real process on Windows) with `cwd: apps/api`, `API_PORT=3100`, `ENGINE_SHUTDOWN_TIMEOUT_MS=2000`;
- polls `/api/health`;
- exposes `restart()` (hard kill with `SIGKILL`, which is `TerminateProcess` on Windows, wait for exit, spawn again on the same DB) and teardown (kill, then `rm` the dir with retries for Windows file locks).

Scenario steps:

1. Open `/`; the header shows `live`.
2. `/help` → the output lists `/plans create`.
3. `find me some jobs` → the NL rejection message is shown.
4. `/plans create {"tasks":[{"key":"a","type":"system.echo","input":{"message":"hi"}},{"key":"b","type":"system.delay","input":{"ms":4000},"dependsOn":["a"]},{"key":"c","type":"system.echo","input":{"message":"done"},"dependsOn":["b"]}]}` → `plan 1 created (3 tasks)`.
5. Expect the SSE lines `task 1 a RUNNING -> COMPLETED` and `task 2 b QUEUED -> RUNNING`.
6. `restart()` while task 2 is RUNNING. The header shows `reconnecting`, then `live` again.
7. Expect the replayed and live lines `task 2 b RUNNING -> RETRYING` (INTERRUPTED), `-> QUEUED`, `-> RUNNING (attempt 2)`, `-> COMPLETED`, then `task 3 c ... COMPLETED` and `plan 1 COMPLETED`.
8. `/tasks show 2` → shows `attempts: 2/3` and `COMPLETED`.
9. `/pause` → `engine paused`; `/plans demo` → plan 2; wait 2 s; `/tasks list queued` lists `hello`; `/resume`; expect `plan 2 COMPLETED`.
10. `/plans create` with one delay of 30000; wait for RUNNING; `/tasks cancel <id>` → "cancellation requested"; expect `-> CANCELLED` within 5 s.
11. `/status` → `database: ok` and `engine: running`.

## 14. Implementation steps

Each step must leave `npm run typecheck` and `npm test` green. Stop `npm run dev` before any migrate.

1. **Contracts.** Add `packages/contracts/src/engine.ts` (status enums, `taskInputSchemas`, `planSpecSchema`, command request/response, Task/Plan/Event/SystemStatus DTOs, error envelope) and export it from the index; add tests. Check: `npm test -w @jobintel/contracts && npm run typecheck`.
2. **Schema and migration.** Add the models in section 1; `npm run db:migrate -- --name execution_engine`; `npm run db:generate`. Move the temp-DB code into `test/helpers/db.ts` and update `health.test.ts`. Check: a new folder exists next to `init` (the `init` diff is empty); `npm test -w @jobintel/api` passes on a fresh temp DB.
3. **State machine.** `engine/state-machine.ts` + `state-machine.test.ts`. Check: the 64-pair matrix test passes.
4. **Validation and parsing.** `engine/plan-validation.ts`, `parseCommand` in `engine/commands.ts`, and their tests. Check: `commands.test.ts`, `plan-validation.test.ts`.
5. **Handlers.** `engine/handlers.ts`, `test/helpers/handlers.ts`, `handlers.test.ts`. Check: tests pass; delay aborts in under 50 ms.
6. **Repository and event bus.** `transitionTask` (fence, events, cascade, plan derivation), `createPlan` (idempotency), claim, heartbeat, `requestCancel`, `setPaused`, `recoverAbandoned`, queries; `event-bus.ts`; `architecture.test.ts`; `claiming.test.ts`. Check: those tests pass.
7. **Executor, scheduler and facade.** `executor.ts`, `scheduler.ts`, `engine.ts`, `config.ts`. Check: `engine-execution`, `engine-control`, `recovery` and `shutdown` tests pass, run 3 times in a row with no flakes (`npx vitest run --repeat 3` or a loop).
8. **HTTP routes.** `app.ts` (signature `buildApp(prisma, engine)`, `bodyLimit`, host hook, error and not-found handlers), `routes/engine.ts`, `runCommand` output formatting. Check: `routes.test.ts`, `health.test.ts`.
9. **SSE.** `routes/events.ts` + `preClose` hook. Check: `sse.test.ts`; `app.close()` does not hang.
10. **Server wiring.** Startup and shutdown sequence in `server.ts`; add `ENGINE_CONCURRENCY=2` and `ENGINE_SHUTDOWN_TIMEOUT_MS=10000` to `.env.example`. Check: `npm run dev`; `curl -s -X POST localhost:3000/api/commands -H 'content-type: application/json' -d '{"command":"/plans demo"}'` returns plan 1; `curl -N localhost:3000/api/events` streams the transitions; Ctrl+C exits cleanly.
11. **Web.** `App.tsx` per section 11; update `App.test.tsx`. Check: `npm test -w @jobintel/web`; manually run `/plans demo` in the browser and see live lines. Screenshot at 1280/1600/1920.
12. **E2E and docs.** Update `playwright.config.ts`; add `e2e/api-process.ts` and `e2e/engine.spec.ts`. Update `docs/architecture.md` (engine in-process, ExecutionEvent, SystemState, endpoints), `docs/implementation-roadmap.md` (insert Phase 1 Execution engine; renumber the rest), and `CLAUDE.md` (layout, commands). Check, all from the repo root: `npm run format:check && npm run lint && npm run typecheck && npm test && npm run build && npm run test:e2e`.

Steps 3, 4, 5 and 11 suit Sonnet. The doc edits in step 12 suit Haiku. Steps 6, 7 and 9 should get an Opus review before step 8 builds on them.

## 15. Risks and decisions

| #   | Risk or open question                                                                                                       | Decision                                                                                                                                                                                                                              |
| --- | --------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1  | The roadmap and architecture docs describe a different Phase 1 and a separate worker process.                               | Insert Phase 1 "Execution engine" (in-process in `apps/api`), shift later phases by one, and update both docs in step 12.                                                                                                             |
| R2  | JavaScript cannot kill a handler that ignores `signal`; after the grace period its promise keeps running in the background. | All handlers must honor `signal` (review rule; the demo handlers do). Fencing makes any late result harmless to state. Worker threads are not in Phase 1.                                                                             |
| R3  | Two engines on one DB file (two ports, or tsx-watch overlap).                                                               | Single engine per DB is the contract; the port bind is the guard; fencing protects state. Startup takeover is immediate, and an overlapping old process loses its fenced writes.                                                      |
| R4  | Windows does not deliver SIGTERM; tsx-watch restarts hard-kill the process.                                                 | Recovery is the primary path. In dev, interrupted non-idempotent tasks end FAILED/INTERRUPTED, which is the intended fail-safe.                                                                                                       |
| R5  | `SQLITE_BUSY` with several connections (tests only).                                                                        | Keep better-sqlite3's 5 s busy timeout; a write as the first statement in every transaction; no handler calls inside transactions. If the adapter does not pass `timeout` through, run `PRAGMA busy_timeout = 5000` after connecting. |
| R6  | Prisma interactive transactions have a default 5 s timeout.                                                                 | Transactions contain only a few small statements; keep the default.                                                                                                                                                                   |
| R7  | The ExecutionEvent table grows without bound.                                                                               | No retention in Phase 1 (a few rows per task, local disk). Retention belongs to hardening.                                                                                                                                            |
| R8  | Interrupted attempts count toward `maxAttempts`, so a crash loop can fail an idempotent task.                               | Accepted: it bounds crash loops. Defaults allow 3 attempts.                                                                                                                                                                           |
| R9  | Late success after a cancel request.                                                                                        | COMPLETED wins: the work really happened. The cancel response says "requested", and SSE reports the truth.                                                                                                                            |
| R10 | Paused state across restarts.                                                                                               | Persisted in `SystemState`; the engine starts paused if it was paused.                                                                                                                                                                |
| R11 | The JSON plan syntax is clumsy to type.                                                                                     | Accepted for Phase 1 because it is exact and schema-checked; `/plans demo` covers quick use. No NL or mini-language.                                                                                                                  |
| R12 | SSE through the Vite dev proxy may buffer.                                                                                  | `x-accel-buffering: no` and no compression. The e2e test goes through the proxy, so it verifies this. If it buffers, set `proxy['/api'].headers` and `ws: false`; do not add a proxy dependency.                                      |
| R13 | `loadEnv` in `vite.config.ts` must see the `API_PORT=3100` passed by Playwright.                                            | Vite's `loadEnv` with an empty prefix includes `process.env`. Check this in step 12; if it does not work, read `process.env.API_PORT` first in `vite.config.ts`.                                                                      |
| R14 | Concurrency default.                                                                                                        | 2. Configurable through `ENGINE_CONCURRENCY` (1..8).                                                                                                                                                                                  |
| R15 | Lease and heartbeat values.                                                                                                 | 30 s lease, 10 s heartbeat, 500 ms poll, 2 s abort grace, 10 s shutdown timeout. Only concurrency and the shutdown timeout are env-configurable; the rest are `EngineConfig` fields that tests override.                              |
