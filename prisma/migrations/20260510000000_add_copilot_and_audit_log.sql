-- Migration: add_copilot_and_audit_log
-- Generated: 2026-05-10

-- CreateEnum
CREATE TYPE "CopilotMessageRole" AS ENUM ('user', 'assistant', 'tool_call', 'tool_result', 'system_summary');

-- CreateEnum
CREATE TYPE "AuditActor" AS ENUM ('user', 'copilot', 'system', 'api');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "hasCopilot" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "CopilotSession" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "title" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" TEXT,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "tokenCount" INTEGER NOT NULL DEFAULT 0,
    "cachedTokenCount" INTEGER NOT NULL DEFAULT 0,
    "pendingConfirmations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CopilotSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CopilotMessage" (
    "id" SERIAL NOT NULL,
    "sessionId" TEXT NOT NULL,
    "role" "CopilotMessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "toolName" TEXT,
    "toolCallId" TEXT,
    "model" TEXT,
    "inputTokens" INTEGER NOT NULL DEFAULT 0,
    "outputTokens" INTEGER NOT NULL DEFAULT 0,
    "cachedTokens" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CopilotMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "companyId" INTEGER NOT NULL,
    "actor" "AuditActor" NOT NULL,
    "action" TEXT NOT NULL,
    "resourceType" TEXT,
    "resourceId" TEXT,
    "inputJson" TEXT,
    "outputJson" TEXT,
    "success" BOOLEAN NOT NULL,
    "errorMessage" TEXT,
    "latencyMs" INTEGER,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "copilotSessionId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CopilotSession_userId_lastMessageAt_idx" ON "CopilotSession"("userId", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "CopilotSession_companyId_lastMessageAt_idx" ON "CopilotSession"("companyId", "lastMessageAt" DESC);

-- CreateIndex
CREATE INDEX "CopilotSession_userId_summary_idx" ON "CopilotSession"("userId", "summary");

-- CreateIndex
CREATE INDEX "CopilotMessage_sessionId_createdAt_idx" ON "CopilotMessage"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "CopilotMessage_toolCallId_idx" ON "CopilotMessage"("toolCallId");

-- CreateIndex
CREATE INDEX "AuditLog_companyId_createdAt_idx" ON "AuditLog"("companyId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_userId_createdAt_idx" ON "AuditLog"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_resourceType_resourceId_idx" ON "AuditLog"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "AuditLog_copilotSessionId_idx" ON "AuditLog"("copilotSessionId");

-- CreateIndex
CREATE INDEX "AuditLog_success_createdAt_idx" ON "AuditLog"("success", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "CopilotSession" ADD CONSTRAINT "CopilotSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CopilotMessage" ADD CONSTRAINT "CopilotMessage_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "CopilotSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_copilotSessionId_fkey" FOREIGN KEY ("copilotSessionId") REFERENCES "CopilotSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
