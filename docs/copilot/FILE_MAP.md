# AI Copilot — File Map

Index of every file created or modified during the copilot build.

---

## New files

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

| Path                | Purpose                              |
| ------------------- | ------------------------------------ |
| `ARCHITECTURE.md`   | System design                        |
| `PRISMA_SCHEMA.md`  | Prisma model designs                 |
| `TOOL_REGISTRY.md`  | Specification for every copilot tool |
| `BUILD_PHASES.md`   | Phased build plan                    |
| `RECON_REPORT.md`   | Initial codebase recon               |
| `CHANGELOG.md`      | Chronological build log              |
| `FILE_MAP.md`       | This file                            |
| `REVIEWER_GUIDE.md` | For dev team's PR review             |
| `MERGE_NOTES.md`    | Deployment notes                     |
| `README.md`         | Entry point                          |

---

## Modified files

| Path                                                                                | Phase | Change                                                               |
| ----------------------------------------------------------------------------------- | ----- | -------------------------------------------------------------------- |
| `prisma/schema.prisma`                                                              | 0a    | Added User.hasCopilot + 3 models + 2 enums                           |
| `src/app/api/lead-generate/route.ts`                                                | 0a    | Extracted DB logic to helper                                         |
| `src/actions/lead/createLeadFromForm.ts`                                            | 0a    | Direct createLead call                                               |
| `src/actions/appointment/addAppointment.ts`                                         | 0.5   | Replaced inline draft-estimate logic with `createDraftEstimate` call |
| `src/actions/appointment/editAppointment.ts`                                        | 0.5   | Replaced inline draft-estimate logic; fixes invisible-estimate bug   |
| `src/app/(dashboard)/dashboard/pipeline/sales/pipeline/_components/LeadActions.tsx` | 0.5   | Removed stale `createDraftEstimate` import                           |
| `src/authOptions.ts`                                                                | 1     | Added `hasCopilot` to JWT refresh DB select, token, and session      |
| `src/components/TopNavbarIcons.tsx`                                                 | 1     | Added `<CopilotIcon />` between BugReport and NotificationsPopover   |

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
