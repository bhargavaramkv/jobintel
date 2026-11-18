-- CreateTable
CREATE TABLE "Plan" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT,
    "status" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "requestHash" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME
);

-- CreateTable
CREATE TABLE "Task" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "planId" INTEGER NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "input" TEXT NOT NULL,
    "result" TEXT,
    "error" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL,
    "timeoutMs" INTEGER NOT NULL,
    "idempotencyKey" TEXT NOT NULL,
    "leaseOwner" TEXT,
    "leaseExpiresAt" DATETIME,
    "availableAt" DATETIME,
    "cancelRequestedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "startedAt" DATETIME,
    "completedAt" DATETIME,
    CONSTRAINT "Task_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TaskDependency" (
    "taskId" INTEGER NOT NULL,
    "dependsOnId" INTEGER NOT NULL,

    PRIMARY KEY ("taskId", "dependsOnId"),
    CONSTRAINT "TaskDependency_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "TaskDependency_dependsOnId_fkey" FOREIGN KEY ("dependsOnId") REFERENCES "Task" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ExecutionEvent" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,
    "planId" INTEGER,
    "taskId" INTEGER,
    "data" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "SystemState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "paused" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "Plan_idempotencyKey_key" ON "Plan"("idempotencyKey");

-- CreateIndex
CREATE UNIQUE INDEX "Task_idempotencyKey_key" ON "Task"("idempotencyKey");

-- CreateIndex
CREATE INDEX "Task_status_priority_id_idx" ON "Task"("status", "priority", "id");

-- CreateIndex
CREATE INDEX "Task_planId_idx" ON "Task"("planId");

-- CreateIndex
CREATE INDEX "TaskDependency_dependsOnId_idx" ON "TaskDependency"("dependsOnId");

-- CreateIndex
CREATE INDEX "ExecutionEvent_planId_idx" ON "ExecutionEvent"("planId");

-- CreateIndex
CREATE INDEX "ExecutionEvent_taskId_idx" ON "ExecutionEvent"("taskId");
