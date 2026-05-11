# AI Copilot — File Map

Index of every file created or modified during the copilot build.

---

## New files

### Phase 2

| Path                                                            | Purpose                                              |
| --------------------------------------------------------------- | ---------------------------------------------------- |
| `src/lib/copilot/tools/registry.ts`                             | ToolDefinition type, registry Map, toolsForAnthropic |
| `src/lib/copilot/tools/dispatcher.ts`                           | executeTool — permission → Zod → execute → audit     |
| `src/lib/copilot/tools/index.ts`                                | Barrel that registers all handlers as side effects   |
| `src/lib/copilot/tools/handlers/getRevenueSummary.ts`           | Revenue + cost aggregation                           |
| `src/lib/copilot/tools/handlers/getPaymentsSummary.ts`          | Payment totals by method                             |
| `src/lib/copilot/tools/handlers/getClientByName.ts`             | Fuzzy client search                                  |
| `src/lib/copilot/tools/handlers/getVehicleByClient.ts`          | Vehicles for a client                                |
| `src/lib/copilot/tools/handlers/getInventoryItemByName.ts`      | Inventory fuzzy search                               |
| `src/lib/copilot/tools/handlers/getEstimateByNumber.ts`         | Estimate by ID                                       |
| `src/lib/copilot/tools/handlers/getAppointmentsForDateRange.ts` | Appointments date range                              |
| `src/lib/copilot/tools/handlers/getTasksForUser.ts`             | Tasks for user (non-admin enforced)                  |
| `src/components/copilot/CopilotToolPills.tsx`                   | Animated tool-call status pills                      |

---

### Phase 1

| Path                                                  | Purpose                                           |
| ----------------------------------------------------- | ------------------------------------------------- |
| `src/lib/copilot/rateLimit.ts`                        | In-memory fixed-window rate limiter               |
| `src/lib/copilot/systemPrompt.ts`                     | System prompt builder with memory injection       |
| `src/lib/copilot/generateSessionSummary.ts`           | Haiku-based session summarizer                    |
| `src/app/api/copilot/chat/route.ts`                   | SSE streaming chat endpoint                       |
| `src/app/api/copilot/sessions/route.ts`               | Sessions list (GET last 20)                       |
| `src/app/api/copilot/sessions/[id]/route.ts`          | Session detail + messages                         |
| `src/app/api/copilot/sessions/[id]/close/route.ts`    | Close + summarize session                         |
| `src/stores/copilotStore.ts`                          | Zustand: isOpen, sessionId, messages, isStreaming |
| `src/components/copilot/CopilotIcon.tsx`              | Header icon, hasCopilot gate                      |
| `src/components/copilot/CopilotPanel.tsx`             | Sheet + SSE consumer orchestrator                 |
| `src/components/copilot/CopilotChatHeader.tsx`        | Panel header                                      |
| `src/components/copilot/CopilotMessageList.tsx`       | Scrollable message list                           |
| `src/components/copilot/CopilotMessageCard.tsx`       | Single message bubble                             |
| `src/components/copilot/CopilotChatInput.tsx`         | Textarea + send                                   |
| `src/components/copilot/CopilotConversationList.tsx`  | History list                                      |
| `src/components/copilot/CopilotThinkingIndicator.tsx` | Streaming dots indicator                          |

---

### src/lib/

| Path                                       | Purpose                                                     |
| ------------------------------------------ | ----------------------------------------------------------- |
| `src/lib/leads/createLeadRecord.ts`        | Pure DB logic for lead creation (Phase 0a)                  |
| `src/lib/anthropic.ts`                     | Anthropic SDK singleton + pinned model constants (Phase 0b) |
| `src/lib/copilot/audit.ts`                 | PII-redacting audit log writer (Phase 0b)                   |
| `src/lib/copilot/normalizeActionResult.ts` | Server action response normalizer (Phase 0b)                |
| `src/lib/copilot/canUserDo.ts`             | Permission check for all copilot actions (Phase 0b)         |

### src/actions/

| Path                                           | Purpose                                          |
| ---------------------------------------------- | ------------------------------------------------ |
| `src/actions/lead/createLead.ts`               | Session-auth wrapper for createLeadRecord (0a)   |
| `src/actions/estimate/invoice/sendEstimate.ts` | Unified email/SMS send with audit log (Phase 0b) |

### prisma/

| Path                                                             | Purpose            |
| ---------------------------------------------------------------- | ------------------ |
| `prisma/migrations/20260510000000_add_copilot_and_audit_log.sql` | Phase 0a migration |

### docs/copilot/

| Path                | Purpose                                                                           |
| ------------------- | --------------------------------------------------------------------------------- |
| `README.md`         | Entry point — reading order for reviewers                                         |
| `ARCHITECTURE.md`   | System design (phases 0–2 reflected; design-only sections for 3+)                 |
| `BUILD_PHASES.md`   | Phased build plan — phases 0a–2 complete, 3+ design only                          |
| `TOOL_REGISTRY.md`  | Spec for every copilot tool — read-only tools shipped, write/external design only |
| `PRISMA_SCHEMA.md`  | DB model design — migration applied in Phase 0a                                   |
| `RECON_REPORT.md`   | Initial codebase recon (historical, read once)                                    |
| `CHANGELOG.md`      | Chronological build log — one entry per phase                                     |
| `FILE_MAP.md`       | This file — index of every file touched                                           |
| `REVIEWER_GUIDE.md` | PR reviewer guide — TL;DR, risk, how to test                                      |
| `MERGE_NOTES.md`    | Deployment and migration checklist                                                |

---

## Modified files

| Path                                                                                | Phase | Change                                                                  |
| ----------------------------------------------------------------------------------- | ----- | ----------------------------------------------------------------------- |
| `prisma/schema.prisma`                                                              | 0a    | Added User.hasCopilot + 3 models + 2 enums                              |
| `src/app/api/lead-generate/route.ts`                                                | 0a    | Extracted DB logic to helper                                            |
| `src/actions/lead/createLeadFromForm.ts`                                            | 0a    | Direct createLead call                                                  |
| `src/actions/appointment/addAppointment.ts`                                         | 0.5   | Replaced inline draft-estimate logic with `createDraftEstimate` call    |
| `src/actions/appointment/editAppointment.ts`                                        | 0.5   | Replaced inline draft-estimate logic; fixes invisible-estimate bug      |
| `src/app/(dashboard)/dashboard/pipeline/sales/pipeline/_components/LeadActions.tsx` | 0.5   | Removed stale `createDraftEstimate` import                              |
| `src/authOptions.ts`                                                                | 1     | Added `hasCopilot` to JWT refresh DB select, token, and session         |
| `src/components/TopNavbarIcons.tsx`                                                 | 1     | Added `<CopilotIcon />` between BugReport and NotificationsPopover      |
| `src/components/copilot/CopilotPanel.tsx`                                           | 1.1   | `flushSync` per `appendToken` call to unblock React 18 batching         |
| `src/app/api/copilot/sessions/[id]/route.ts`                                        | 1.1   | Async params (`await props.params`) for Next.js 16                      |
| `src/app/api/copilot/sessions/[id]/close/route.ts`                                  | 1.1   | Async params; removed `messageCount > 0` guard                          |
| `src/app/api/copilot/chat/route.ts`                                                 | 1.1   | `startTime` capture + `latencyMs` on audit log                          |
| `src/app/api/copilot/chat/route.ts`                                                 | 1.2   | Capture `cache_read_input_tokens` → `cachedTokens`; log cacheWrite      |
| `docs/copilot/REVIEWER_GUIDE.md`                                                    | 1.2   | Added cost optimization section                                         |
| `package.json`                                                                      | 0b    | Added `@anthropic-ai/sdk ^0.95.1`                                       |
| `yarn.lock`                                                                         | 0b    | Lockfile updated for new SDK dep                                        |
| `.env.example`                                                                      | 0b    | Added `ANTHROPIC_API_KEY=` placeholder (commit cd095b27)                |
| `src/app/api/copilot/chat/route.ts`                                                 | 2     | Multi-turn tool-use loop; SSE tool events; employeeType for ToolContext |
| `src/lib/copilot/systemPrompt.ts`                                                   | 2     | TOOL_GUIDE section + prompt injection warning                           |
| `src/stores/copilotStore.ts`                                                        | 2     | activeToolCalls + addToolCall/resolveToolCall                           |
| `src/components/copilot/CopilotPanel.tsx`                                           | 2     | Handle tool SSE events; pass activeToolCalls to MessageList             |
| `src/components/copilot/CopilotMessageList.tsx`                                     | 2     | Render CopilotToolPills during streaming tool calls                     |

---

## Module dependency graph

### Phase 0a — Lead creation paths

In-platform (thunderbolt form):

```
createLeadFromForm.ts → createLead.ts → createLeadRecord.ts → DB
```

External webhook:

```
/api/lead-generate route → createLeadRecord.ts → DB
```

### Phase 0b — Helper dependency graph

```
sendEstimate.ts → sendInvoiceEmail.ts / sendInvoiceSms.ts
              → normalizeActionResult.ts
              → audit.ts → db
              → getEssentials() → getServerSession

canUserDo.ts → getPermissions.ts → db

anthropic.ts  (leaf — no local dependencies, reads ANTHROPIC_API_KEY at runtime)
```

### Phase 1–2 — Chat route + tool dispatch

```
/api/copilot/chat  (POST)
  → getServerSession() → hasCopilot check
  → checkRateLimit()
  → db.copilotSession (find or create)
  → generateSessionSummary() [lazy fallback]     → anthropic.ts (Haiku)
  → db.copilotSession.findMany (prior summaries)
  → buildSystemPrompt()                          → systemPrompt.ts
  → tools/index.ts (imports all handlers)        → tools/registry.ts
  │                                              → tools/handlers/*.ts → db
  → anthropic.messages.stream()                  → anthropic.ts (Sonnet)
  │
  ├── [stop_reason: text] → stream text_delta SSE events → client
  │
  └── [stop_reason: tool_use] →
        tools/dispatcher.ts
          → canUserDo()    → canUserDo.ts → getPermissions.ts → db
          → Zod validate
          → handler.execute() → db
          → writeAuditLog()   → audit.ts → db
        → tool_result → back to Anthropic (next loop iteration)

/api/copilot/sessions/[id]/close  (POST)
  → generateSessionSummary()                    → anthropic.ts (Haiku)
  → db.copilotSession.update (summary)
```
