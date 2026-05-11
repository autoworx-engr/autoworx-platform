# AI Copilot — Dev Team Status

**Date:** 2026-05-11  
**Branch:** `taiseer/ai-copilot` (branched from `development`)  
**Build phases complete:** 0a, 0.5, 1, 1.1, 1.2, 2  
**Next phase:** Phase 3 — blocked on architecture decision (see below)

---

## What shipped

### Phase 0a — Schema + lead creation refactor

- Added `User.hasCopilot Boolean DEFAULT false` — feature gate for the entire UI
- Added `CopilotSession`, `CopilotMessage`, `AuditLog` tables + two Prisma enums
- Extracted `createLeadRecord.ts` pure DB function; `createLead.ts` wraps it for session-auth callers; `/api/lead-generate` route calls the pure function directly (no self-HTTP proxy)
- Migration: `prisma/migrations/20260510000000_add_copilot_and_audit_log.sql` — additive only, all columns have defaults, safe to run on live DB

### Phase 0.5 — Draft-estimate refactor

- `addAppointment.ts` and `editAppointment.ts` now delegate to `createDraftEstimate` instead of inline invoice creation
- **Latent bug fixed:** edited appointments previously created invoice rows with `columnId = null`, making them invisible in every pipeline column view. Now delegates to `createDraftEstimate` which looks up the `Pending` column first.

### Phase 0b — Core helpers

- `src/lib/anthropic.ts` — Anthropic SDK singleton; pinned model constants (`COPILOT_MODELS.default = claude-sonnet-4-6`, `.summarizer = claude-haiku-4-5-20251001`)
- `src/lib/copilot/audit.ts` — PII-redacting audit log writer (never throws)
- `src/lib/copilot/canUserDo.ts` — permission check for all copilot actions; `EmployeeType.Admin` bypasses all checks
- `src/lib/copilot/normalizeActionResult.ts` — server action response normalizer
- `src/actions/estimate/invoice/sendEstimate.ts` — unified email/SMS send with audit log

### Phase 1 — Chat UI + SSE streaming

- `CopilotIcon` in top navbar (between Bug Report and Notifications), gated on `hasCopilot`
- `CopilotPanel` — sheet slide-over with SSE consumer, message list, input
- `src/app/api/copilot/chat/route.ts` — POST endpoint; streams Anthropic responses token-by-token via SSE
- `src/app/api/copilot/sessions/` — GET last 20 sessions; GET session detail + messages; POST close + summarize
- `src/stores/copilotStore.ts` — Zustand: `isOpen`, `sessionId`, `messages`, `isStreaming`
- `src/authOptions.ts` — added `hasCopilot` to JWT refresh DB select, token, and session
- Rate limiter: soft warning at 60 messages/session, hard 429 at 120

### Phase 1.1 — Streaming fixes

- `flushSync` per `appendToken` call — unblocks React 18 batching so tokens appear character-by-character
- Async params (`await props.params`) in dynamic route handlers — Next.js 16 requirement
- Removed `messageCount > 0` guard on session close — summaries now generated for any session
- Added `latencyMs` capture on audit log entries

### Phase 1.2 — Cost optimisation

- Prompt caching on system prompt block (`cache_control: { type: "ephemeral" }`) — 90% discount on cached input tokens across turns in the same session
- `max_tokens` capped at 1024 for chat responses
- `cachedTokens` persisted on every assistant `CopilotMessage` row
- Server console logs `[copilot] iter:N in:X out:Y cached:Z cacheWrite:W` per tool loop iteration

### Phase 2 — Read-only tools

8 tools shipped, all permission-checked, Zod-validated, audited, and scoped to `companyId` from session (never from AI-provided input):

| Tool                              | Permission required    | What it queries                                          |
| --------------------------------- | ---------------------- | -------------------------------------------------------- |
| `get_revenue_summary`             | `report.revenue.read`  | Invoice totals + material costs for a date range         |
| `get_payments_summary`            | `report.payments.read` | Payment totals grouped by method (card/cash/check/other) |
| `get_client_by_name`              | `client.read`          | Fuzzy client search (up to 5 matches)                    |
| `get_vehicle_by_client`           | `client.read`          | Vehicles for a given client ID                           |
| `get_inventory_item_by_name`      | `inventory.read`       | Fuzzy inventory search (up to 10 matches)                |
| `get_estimate_by_number`          | `estimate.read`        | Estimate detail by invoice ID                            |
| `get_appointments_for_date_range` | `appointment.read`     | Appointments for a date range (max 50)                   |
| `get_tasks_for_user`              | `task.read`            | Tasks; non-Admin users always see only their own tasks   |

Tool calls appear as animated blue pills in the chat UI while in-flight, resolve to green ✓ or red ✗ on completion.

Multi-turn tool-use loop capped at 5 iterations to bound worst-case API cost.

---

## What's blocked

### Phase 3 — Write tools (create_lead, create_appointment, create_task, create_draft_estimate)

**Blocked on a team architecture decision.** The issue: the copilot's route handler is server-side and needs to invoke write operations, but the existing server actions use `getServerSession()` which expects HTTP request context and returns null when called server-to-server. Three options:

**Option A — Pass `forceCompanyId` / `forceUserId` through action signatures**  
Already started: `addAppointment.ts` accepts `forceCompanyId` and `forceUserId`. Requires updating each action to accept override params when called from copilot context. Medium refactor, contained to each action file.

**Option B — Extract pure DB functions (the `createLeadRecord` pattern)**  
The same pattern used in Phase 0a: extract a pure async function, wrap it with a session-auth server action for browser callers, and have the copilot call the pure function directly. Cleanest separation, most work, best long-term.

**Option C — Thin internal API routes for each write operation**  
Create `POST /api/copilot/internal/create-lead` etc. that the chat route calls directly. Avoids touching server actions. Most explicit about the copilot's write surface.

**Team must pick A, B, or C before Phase 3 starts.**

---

## Team decisions still needed

These are not blockers for merging the current PR, but should be resolved before Phase 3 or before wider rollout.

| #   | Decision                                                                                                                                                                                                                                                | Where it matters                                                      |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | **Phase 3 architecture** (A/B/C above)                                                                                                                                                                                                                  | Blocks Phase 3 entirely                                               |
| 2   | **Automation trigger asymmetry** — `createLeadDraftEstimate` does NOT call `updateInvoiceAutomationTrigger`; `createDraftEstimate` does. Which path is canonical?                                                                                       | Determines whether automation fires consistently on estimate creation |
| 3   | **Non-transactional appointment + invoice** — if `createDraftEstimate` fails after the appointment is inserted, the appointment row has a non-null `draftEstimate` pointing to an invoice that was never created. Accept this or wrap in a transaction? | Data integrity in appointment creation                                |
| 4   | **`Task.completed` field** — the `get_tasks_for_user` tool uses `date < now` as a proxy for completion. If the team wants accurate completed/pending status via the copilot, add `completed: Boolean` to the `Task` model.                              | Copilot tool accuracy                                                 |
| 5   | **`Priority` enum** — TOOL_REGISTRY.md spec called for `Low\|Medium\|High\|Urgent`. The Prisma enum only has `Low\|Medium\|High`. Add `Urgent` or update the spec?                                                                                      | Task priority in copilot responses                                    |
| 6   | **`hasCopilot` seat management process** — currently must be flipped manually via DB. Phase 5 adds billing/licensing. What is the interim process and who owns it?                                                                                      | Onboarding pilot users                                                |
| 7   | **`ai_personalities.human_handoff_message` column** — exists in `schema.prisma` but was absent from local dev DB during build. Confirm it exists in production before merge.                                                                            | Safe to merge                                                         |

---

## Pre-existing issues fixed (incidental to this build)

1. **`editAppointment.ts` missing `columnId`** — draft estimates created via appointment edit had `columnId = null`, making them invisible in the pipeline. Fixed.
2. **Infobip CRM-mode parameter bug** — fixed.
3. **CRM-mode automation token format** — was sent as wrong format, causing silent 401s. Fixed.

---

## Pre-existing issues flagged but NOT fixed (require team decision)

The three items above that were fixed were clear bugs. The following are intentionally left as-is because they need a team call:

- Automation trigger asymmetry (item 2 above)
- Non-transactional appointment + invoice (item 3 above)
- `Task.completed` field missing (item 4 above)

Orphan `Invoice` rows with `columnId = null` from before the `editAppointment` fix will remain in the DB. A one-time backfill migration could clean them up, but it's out of scope for this PR.

---

## How to enable for a test user

1. Run the migration if not already applied:  
   `yarn prisma migrate deploy`

2. Set the flag (Prisma Studio or psql):  
   `UPDATE "User" SET "hasCopilot" = true WHERE email = 'your-test@email.com';`

3. Do a full **logout → login** after flipping the flag — the JWT refresh path propagates the value; an existing session won't see it until the token rotates.

4. Add to `.env.local` (or Railway Variables for staging/prod):  
   `ANTHROPIC_API_KEY=sk-ant-...`

The bot icon appears between the Bug Report and Notifications icons in the top navbar once the flag is set and the session is fresh.

---

## Deferred to later phases

| Item                                                                                      | Phase                                |
| ----------------------------------------------------------------------------------------- | ------------------------------------ |
| Phase 3 write tools (create_lead, create_appointment, create_task, create_draft_estimate) | 3 — blocked on architecture decision |
| Billing / seat licensing                                                                  | 5                                    |
| Hardening, audit log viewer UI, cost dashboard                                            | 6                                    |
| Mobile integration                                                                        | TBD                                  |
| Haiku routing for simple read-only tool calls                                             | 3+ candidate                         |
| Conversation context trimming for sessions > 20 messages                                  | 6                                    |
| Per-seat usage caps                                                                       | 5                                    |

---

## Branch stats

```
10 commits ahead of development
1 migration file
1 new npm package (@anthropic-ai/sdk ^0.95.1)
1 new environment variable (ANTHROPIC_API_KEY)
~30 new files (all additive)
8 existing files modified (see REVIEWER_GUIDE.md risk table)
```

Full file inventory: [FILE_MAP.md](./FILE_MAP.md)  
Merge checklist: [MERGE_NOTES.md](./MERGE_NOTES.md)  
Reviewer guide: [REVIEWER_GUIDE.md](./REVIEWER_GUIDE.md)
