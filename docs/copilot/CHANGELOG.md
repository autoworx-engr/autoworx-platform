# AI Copilot — Build Changelog

Chronological log of all changes during the AI Copilot feature build.
Most recent at the top. Each phase appends a section.

---

## Phase 3a — Foundation: JWT helper + internal API client + reference route

**Date:** 2026-05-15
**Branch:** taiseer/ai-copilot
**Commit:** [see git log]

### Files created

| File                                            | Purpose                                                                                                                                                                                |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/mobileAuth.ts`                         | Ported from secure-estimate-routes branch. Exposes `getCompanyIdFromBearer(request): Promise<number \| null>`. Used by all new Phase 3 routes for unified Bearer JWT auth.             |
| `src/lib/copilot/internalApiClient.ts`          | Server-side helper for copilot to call its own internal API routes. Mints a 1-hour JWT via `generateAccessToken`, sends Bearer-authed fetch, returns structured result (never throws). |
| `src/app/api/lead/company/[companyId]/route.ts` | First Phase 3 write route. POST creates a lead. Auth: Bearer JWT + URL companyId cross-check. Template for all other Phase 3 routes.                                                   |

### Files modified

None.

### Architecture decisions in this phase

- Bearer JWT for all internal API routes (overrides Tanvir's original X-Internal-Token spec; cleared with Tanvir 2026-05-14)
- Copilot mints JWT for the acting user via `generateAccessToken(user)` — loads real DB User so JWT payload is accurate
- URL companyId is cross-checked against JWT companyId — 403 on mismatch (multi-tenant isolation)
- `getCompanyIdFromBearer` returns `null` on failure (never throws) — simpler route handlers
- Route response envelope: `{ success: boolean, message: string, data?: any, field?: string }` matching AbuBokorprog's convention
- `sendOpeningSms` is caller-configurable (defaults to `true`); dev testing passes `false` to bypass the `ai_personalities.human_handoff_message` column drift (pre-existing issue)

### Key finding: proxy.ts middleware behavior

All `/api/*` routes not in `PUBLIC_API_ROUTES` go through `proxy.ts` middleware which verifies the Bearer JWT before the request reaches the route handler. On invalid token, middleware returns HTTP 200 with `{status: 401, message: "Invalid or expired access token."}` in the body — this is a pre-existing convention. Valid tokens pass through; route-level `getCompanyIdFromBearer` provides the second layer (companyId cross-check).

### Verification

- ✓ yarn tsc --noEmit clean
- ✓ yarn build clean
- ✓ Test 5a (happy path): POST with valid JWT + correct companyId → HTTP 201, `{leadId, clientId, vehicleId}`, DB rows created, audit log written
- ✓ Test 5b (bad JWT): proxy.ts intercepts invalid token → middleware rejects (HTTP 200 with embedded status 401)
- ✓ Test 5c (wrong company in URL): valid JWT, URL companyId 9999 ≠ JWT companyId 1 → HTTP 403 Forbidden (multi-tenant isolation enforced)
- ✓ Test 5d (invalid body): missing required fields → HTTP 400 with field name in response
- ✓ Test 5e (internalApiClient end-to-end): script mints JWT, calls route via fetch → `{ok: true, status: 201, data: {leadId: 9, ...}}`

### Audit log row from test 5a

action: `lead.create`, actor: `api`, success: `true`, latencyMs: populated, PII redacted (clientPhone, clientEmail → `[REDACTED]`)

### Notes

- `src/lib/mobileAuth.ts` will conflict trivially with the same file on `taiseer/secure-estimate-routes` when both PRs merge — files are identical, resolves with theirs or ours.
- `/api/task/*` routes still lack JWT auth (pre-existing). Flagged in REVIEWER_GUIDE for separate security pass.

---

## Phase 2.1 — Bug fixes from team coordination

**Date:** 2026-05-12
**Branch:** taiseer/ai-copilot
**Commit:** 78500b9a

### Bugs fixed

1. **Missing systemCall: true on Twilio/Infobip send calls** inside createLeadRecord. AbuBokorprog (parallel refactor of the same route on origin/development) confirmed this flag is required when no session user is present (webhook flow), otherwise the SMS helper throws an auth error. Our Phase 0a refactor silently broke AI opening SMS delivery from webhook-created leads.
2. **Dropped isCRM zapierToken branch** for automation triggers. AbuBokorprog confirmed CRM mode IS in production use by external websites. Our Phase 0a refactor uniformly used companyWithUser, silently breaking automation triggers for CRM-mode leads.

### Files modified

| File                                 | Change                                                                                                                          |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/leads/createLeadRecord.ts`  | Added systemCall: true to Twilio/Infobip calls; added zapierToken option to CreateLeadOptions; conditional token logic restored |
| `src/app/api/lead-generate/route.ts` | Passes zapierToken through to createLeadRecord                                                                                  |

### Discovery context

These bugs slipped past Phase 0a smoke testing because:

- The local dev DB had a separate schema drift (ai_personalities.human_handoff_message) causing the SMS path to fail for a different reason, masking the missing systemCall bug
- CRM mode is not enabled on any company in the dev DB, so the automation-token branch was never exercised

Caught by coordination with @AbuBokorprog who did a parallel refactor of /api/lead-generate on origin/development and tested both paths.

### Verification

- ✓ yarn tsc --noEmit — 0 errors
- ✓ yarn build — clean (63s)
- Manual: in-platform thunderbolt lead creation still works (non-CRM path, uses companyWithUser via the default branch)
- Note: full CRM-path verification requires a company with isCRMEnabled=true in the DB; not testable locally

---

## Phase 2 — Read-only tools + dispatcher

**Date:** 2026-05-11
**Branch:** taiseer/ai-copilot

### What was built

8 read-only tools that allow the copilot to query live AutoWorx data: revenue summary, payments summary, client search, vehicle lookup, inventory search, estimate lookup, appointments, and tasks. A central tool registry, a permission-checking dispatcher, and SSE events for tool call visibility in the UI.

### Files created

| File                                                            | Purpose                                                                 |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/lib/copilot/tools/registry.ts`                             | ToolDefinition type, registerTool, getTool, allTools, toolsForAnthropic |
| `src/lib/copilot/tools/dispatcher.ts`                           | executeTool — permission → Zod validate → execute → audit               |
| `src/lib/copilot/tools/index.ts`                                | Barrel: imports all handlers (side-effect registration) + re-exports    |
| `src/lib/copilot/tools/handlers/getRevenueSummary.ts`           | Invoice grandTotal + Material cost aggregation                          |
| `src/lib/copilot/tools/handlers/getPaymentsSummary.ts`          | Payment.amount grouped by type                                          |
| `src/lib/copilot/tools/handlers/getClientByName.ts`             | ILIKE search on firstName/lastName/email, top 5                         |
| `src/lib/copilot/tools/handlers/getVehicleByClient.ts`          | Vehicle.findMany scoped to clientId + companyId                         |
| `src/lib/copilot/tools/handlers/getInventoryItemByName.ts`      | InventoryProduct ILIKE search, optional type filter                     |
| `src/lib/copilot/tools/handlers/getEstimateByNumber.ts`         | Invoice.findFirst by id+companyId, returns links                        |
| `src/lib/copilot/tools/handlers/getAppointmentsForDateRange.ts` | Appointment.findMany with date range + optional userId                  |
| `src/lib/copilot/tools/handlers/getTasksForUser.ts`             | Task.findMany; non-admin forced to own userId                           |
| `src/components/copilot/CopilotToolPills.tsx`                   | Animated pill indicators for active tool calls                          |

### Files modified

| File                                            | Change                                                                                                                                               |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/copilot/chat/route.ts`             | Multi-turn tool-use loop (max 5); SSE tool_call_start/tool_result events; persist tool_call CopilotMessage rows; select employeeType for ToolContext |
| `src/lib/copilot/systemPrompt.ts`               | Added TOOL_GUIDE section + prompt injection warning in SECURITY                                                                                      |
| `src/stores/copilotStore.ts`                    | Added activeToolCalls state + addToolCall/resolveToolCall actions                                                                                    |
| `src/components/copilot/CopilotPanel.tsx`       | Handle tool_call_start/tool_result SSE events; pass activeToolCalls to MessageList                                                                   |
| `src/components/copilot/CopilotMessageList.tsx` | Accept and render CopilotToolPills when tool calls are active                                                                                        |

### Key design decisions

- **Side-effect registration pattern**: each handler file calls `registerTool()` at module load time; `tools/index.ts` imports them all so one `import` from the route wires everything up.
- **No new server actions**: all handlers query `db.*` directly within the copilot tool boundary (companyId always from session context).
- **ToolResultBlockParam.is_error**: set correctly on Anthropic's tool_result so the model knows when a tool failed and can tell the user gracefully.
- **Non-admin task enforcement**: `getTasksForUser` ignores AI-provided `assignedUserId` for non-Admin users — always uses session `userId`. Prevents data leakage.
- **Priority enum note**: Prisma's Priority enum has Low/Medium/High (no Urgent). TOOL_REGISTRY.md spec listed Urgent; not added to avoid schema change. Handler returns the actual enum values.
- **Task "completed" heuristic**: Task model has no boolean completed field. Handler uses `date < now` as a proxy. This is approximate; flagged for team awareness.

### Verification

- ✓ `yarn tsc --noEmit` — 0 errors
- ✓ `yarn build` — clean (110s)

---

## Phase 1.2 — Cost tuning

**Date:** 2026-05-11
**Branch:** taiseer/ai-copilot

### Changes

1. **Prompt caching already active (Option B confirmed).** The system prompt was already passed as a content block array with `cache_control: { type: "ephemeral" }` since Phase 1. The system prompt is fully deterministic per user/session context (no timestamps, no per-call randomness) — cache hits fire correctly within the 5-minute TTL window. No format change needed.

2. **Cache token capture wired up.** `finalMessage.usage.cache_read_input_tokens` is now read and persisted as `cachedTokens` on every `CopilotMessage` assistant row. `cache_creation_input_tokens` is logged to console in non-production environments for debugging. The `cachedTokens` field existed in the Prisma schema since Phase 0a but was never populated.

3. **max_tokens already 1024.** Already set correctly in Phase 1 — no change needed. The spec referenced 4096 but the implementation already used 1024.

### Cost impact

- System prompt ≈ 500–700 tokens. At `$3/M` uncached vs `$0.30/M` cached (90% off), that's ~`$0.0002` saved per turn after the first. For a heavy user (20 exchanges/day), caching saves ~`$0.004/day`.
- `max_tokens: 1024` caps worst-case output at `1024 × $15/M = $0.015` per response vs `4096 × $15/M = $0.06`.
- Verified: message 1 `cachedTokens = 0` (cache write), message 2 `cachedTokens > 0` (cache hit). Actual numbers visible in Prisma Studio → CopilotMessage → cachedTokens column, and in server console: `[copilot] tokens — in:X out:Y cached:Z cacheWrite:W`.

### Files modified

| File                                | Change                                                                                                                          |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/copilot/chat/route.ts` | Extract `cache_read_input_tokens` → `cachedTokens`; log `cache_creation_input_tokens`; persist `cachedTokens` on CopilotMessage |

### Verification

- ✓ `yarn tsc --noEmit` — 0 errors
- ✓ `yarn build` — clean (68s)
- ✓ Cache test — message 1 cachedTokens = 0 (write), message 2 cachedTokens > 0 (read)
- ✓ max_tokens = 1024 confirmed in chat route

---

## Phase 1.1 — Bug fixes from smoke testing

**Date:** 2026-05-11
**Branch:** taiseer/ai-copilot

### Bugs fixed

1. **Token streaming was buffering full response.** Root cause: React 18 automatic batching merges all `appendToken()` calls inside the `while` SSE-read loop into a single re-render, so the full assistant response appeared at once rather than token-by-token. Fix: wrapped each `appendToken` call with `flushSync(() => appendToken(event.text))` in `CopilotPanel.tsx`. Tokens now stream character-by-character as expected.

2. **Session summarization never fired on Sheet close.** Root cause: In Next.js 16, dynamic route `params` are Promises and must be awaited. Both `sessions/[id]/route.ts` and `sessions/[id]/close/route.ts` accessed `params` synchronously (`{ params }: { params: { id: string } }`), so `id` was a Promise object, not a string. Every `db.findFirst` silently failed to match any session (returning null), the close endpoint returned 404 on every call, and `generateSessionSummary` never ran. Fix: updated both routes to use `props: { params: Promise<{ id: string }> }` and `await props.params`. Also removed the `messageCount > 0` guard in the close endpoint (replaced by the existing `messages.length === 0` check inside `generateSessionSummary`). Sessions now receive 2-3 sentence summaries on panel close.

3. **AuditLog latencyMs was null.** Root cause: `startTime` was never captured at the top of the `POST /api/copilot/chat` handler, and `writeAuditLog` was called without a `latencyMs` argument. Fix: added `const startTime = Date.now()` at handler entry and `latencyMs: Date.now() - startTime` to the `writeAuditLog` call inside the stream's `start` callback. AuditLog rows now record end-to-end latency for every chat message.

### Files modified

| File                                               | Change                                                                                 |
| -------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/components/copilot/CopilotPanel.tsx`          | Import `flushSync`; wrap `appendToken` call with `flushSync`                           |
| `src/app/api/copilot/sessions/[id]/route.ts`       | Async params (`await props.params`); remove sync destructuring                         |
| `src/app/api/copilot/sessions/[id]/close/route.ts` | Async params; remove `messageCount > 0` guard                                          |
| `src/app/api/copilot/chat/route.ts`                | Add `const startTime = Date.now()` at handler entry; add `latencyMs` to audit log call |

### Verification

- ✓ `yarn tsc --noEmit` — 0 errors
- ✓ `yarn build` — clean (130s)
- ✓ Streaming test — tokens appear progressively
- ✓ Summary test — summary populated after Sheet close
- ✓ Memory test — new chat references prior session
- ✓ Latency test — AuditLog rows show valid latencyMs

---

## Phase 1 — Chat UI, SSE Streaming, Session Persistence, Cross-Conversation Memory

**Date:** 2026-05-11
**Branch:** taiseer/ai-copilot

### Files created

| File                                                  | Purpose                                                                                 |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/lib/copilot/rateLimit.ts`                        | In-memory fixed-window rate limiter (60/hr soft warn, 120/hr hard 429)                  |
| `src/lib/copilot/systemPrompt.ts`                     | `buildSystemPrompt()` — identity, tone, scope, security, user context, memory injection |
| `src/lib/copilot/generateSessionSummary.ts`           | `generateSessionSummary(sessionId)` — Haiku 4.5, 200 tokens, never throws               |
| `src/app/api/copilot/chat/route.ts`                   | POST SSE streaming chat endpoint                                                        |
| `src/app/api/copilot/sessions/route.ts`               | GET last 20 sessions list                                                               |
| `src/app/api/copilot/sessions/[id]/route.ts`          | GET single session + messages                                                           |
| `src/app/api/copilot/sessions/[id]/close/route.ts`    | POST — triggers session summary generation                                              |
| `src/stores/copilotStore.ts`                          | Zustand store: isOpen, sessionId, messages, isStreaming                                 |
| `src/components/copilot/CopilotIcon.tsx`              | Header icon, gated on `hasCopilot`, Bot icon                                            |
| `src/components/copilot/CopilotPanel.tsx`             | Sheet slide-over orchestrator + SSE streaming consumer                                  |
| `src/components/copilot/CopilotChatHeader.tsx`        | Title, new chat, history toggle, close                                                  |
| `src/components/copilot/CopilotMessageList.tsx`       | Scrollable message list, auto-scroll                                                    |
| `src/components/copilot/CopilotMessageCard.tsx`       | User (right, #006D77) / assistant (left, white) bubbles                                 |
| `src/components/copilot/CopilotChatInput.tsx`         | Textarea, send button, Cmd/Ctrl+Enter to send                                           |
| `src/components/copilot/CopilotConversationList.tsx`  | Past sessions dropdown, fetches /api/copilot/sessions                                   |
| `src/components/copilot/CopilotThinkingIndicator.tsx` | Three-dot bounce animation while streaming                                              |

### Files modified

| File                                | Change                                                             |
| ----------------------------------- | ------------------------------------------------------------------ |
| `src/authOptions.ts`                | Added `hasCopilot` to JWT refresh DB select, token, and session    |
| `src/components/TopNavbarIcons.tsx` | Added `<CopilotIcon />` between BugReport and NotificationsPopover |

### Key design decisions

- `hasCopilot` added to the NextAuth JWT refresh path (not login path) — populates on every token rotation. Session type declaration extended in `authOptions.ts`.
- Rate limiter is in-memory Map — safe for Railway single-replica. Redis upgrade needed for multi-replica.
- SSE event types: `text_delta`, `done` (carries `sessionId` + optional `warning`), `error`.
- Cross-conversation memory: prior session summaries (last 5, summary IS NOT NULL) injected into system prompt. Summary generated synchronously on panel close (POST /close). Lazy fallback: if session >30min old and summary is null when next message arrives, summary is generated before streaming.
- Prompt caching: system prompt has `cache_control: { type: "ephemeral" }` — saves tokens on repeated turns within a session.
- `CopilotPanel` renders both `<Sheet>` and the streaming consumer — `CopilotIcon` triggers `setOpen(true)` via Zustand (controlled), not `SheetTrigger`.

### Tests performed

- ✓ `yarn tsc --noEmit` — 0 errors
- ✓ `yarn build` — clean (94s)

---

## Phase 0.5 — Draft estimate path consolidation

**Date:** 2026-05-11
**Branch:** taiseer/ai-copilot

### Files modified

| File                                                                                | Change                                                                                                                                                                               |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/actions/appointment/addAppointment.ts`                                         | Inline draft-estimate creation (lines 106–141) replaced with call to `createDraftEstimate` action                                                                                    |
| `src/actions/appointment/editAppointment.ts`                                        | Inline draft-estimate creation (lines 59–88) replaced with call to `createDraftEstimate` action. Fixes pre-existing bug where edit-appointment created estimates without `columnId`. |
| `src/app/(dashboard)/dashboard/pipeline/sales/pipeline/_components/LeadActions.tsx` | Removed stale `createDraftEstimate` import (no longer used by active handler)                                                                                                        |

### Latent bug fixed

`editAppointment.ts` was creating draft estimates without a `columnId`, meaning the estimates would not appear in any shop pipeline column — invisible in the UI. Users who edited an appointment to add a draft estimate would create an "orphan" estimate. Consolidating to `createDraftEstimate` fixes this by reusing its proper column lookup logic (`title: "Pending", type: "shop"`).

Additionally, `addAppointment.ts` was querying the Pending column without the `type: "shop"` filter, risking matching a non-shop column. This is also corrected by delegation to `createDraftEstimate`.

### Flagged for team review (NOT changed in this commit)

1. **Path 1 vs Path 2 automation asymmetry:** `createLeadDraftEstimate` (used by pipeline) does NOT trigger `updateInvoiceAutomationTrigger`; `createDraftEstimate` (used by client panel and now by appointments) DOES. One is likely incorrect — team should confirm which behavior is canonical.
2. **Non-transactional appointment-then-invoice creation:** `addAppointment` creates the appointment record first, commits, then creates the invoice. If invoice creation fails, the appointment has a dangling `draftEstimate` reference pointing to a non-existent invoice. Out of scope for this PR; flagged for a future cleanup.

### Verification

- ✓ `yarn tsc --noEmit` — 0 errors
- ✓ `yarn build` — clean (139s)
- ✓ Create appointment without estimate — appointment created, no phantom invoice
- ✓ Create appointment with estimate — invoice created with `columnId`, appears in Pending column
- ✓ Edit appointment to add estimate — invoice created with `columnId`, appears in Pending (bug fix verified)
- ✓ Pipeline lead-to-estimate — still works (Path 1 unchanged)
- ✓ Client panel create estimate — still works (Path 2 unchanged)

---

## Phase 0b — Core helper libraries

**Date:** 2026-05-11
**Branch:** taiseer/ai-copilot

### Files created

| File                                           | Purpose                                                             |
| ---------------------------------------------- | ------------------------------------------------------------------- |
| `src/lib/anthropic.ts`                         | Lazy-initialized Anthropic SDK singleton; pinned model ID constants |
| `src/lib/copilot/audit.ts`                     | PII-redacting audit log writer; never throws                        |
| `src/lib/copilot/normalizeActionResult.ts`     | Normalizes all server action response shapes to a single union      |
| `src/lib/copilot/canUserDo.ts`                 | Maps 20 copilot action strings to AWX permission field checks       |
| `src/actions/estimate/invoice/sendEstimate.ts` | Unified estimate/invoice send: email or SMS, with audit log         |

### Packages added

| Package             | Version | Purpose              |
| ------------------- | ------- | -------------------- |
| `@anthropic-ai/sdk` | ^0.95.1 | Anthropic API client |

### Key design decisions

- `canUserDo` uses `compPerm()` helper to safely access `companyPermissions` fields
  across all 5 role variants — `PermissionForTechnician` is missing several fields
  that other role types have (TypeScript union narrowing issue)
- `normalizeError` return type is `Extract<NormalizedResult, { ok: false }>` to allow
  direct `.error` access without an `if (!ok)` guard at call sites
- `sendEstimate` `invoiceId` uses `z.string()` not `z.number()` — Invoice.id is a
  String cuid, not an integer
- `AuditActor` enum values are lowercase (`copilot`, not `COPILOT`)
- Client phone field is `mobile` not `phone` in the Prisma model

### Tests performed

- ✓ `yarn tsc --noEmit` — 0 errors
- ✓ `yarn build` — passes (99s)
- ✓ Smoke test: `normalizeActionResult`, `normalizeError`, `redactPii` all pass

---

## Phase 0a — Schema additions + lead creation refactor

**Date:** 2026-05-11
**Branch:** taiseer/ai-copilot
**Commit:** cd1b7408

### Files created

| File                                                             | Purpose                                                              |
| ---------------------------------------------------------------- | -------------------------------------------------------------------- |
| `prisma/migrations/20260510000000_add_copilot_and_audit_log.sql` | Migration: User.hasCopilot, CopilotSession, CopilotMessage, AuditLog |
| `src/lib/leads/createLeadRecord.ts`                              | Pure DB logic for creating a lead (callable from any auth context)   |
| `src/actions/lead/createLead.ts`                                 | Session-authenticated server action wrapping createLeadRecord        |

### Files modified

| File                                     | Change                                         | Why                            |
| ---------------------------------------- | ---------------------------------------------- | ------------------------------ |
| `prisma/schema.prisma`                   | Added 1 boolean field, 2 enums, 3 models       | Foundation for copilot feature |
| `src/app/api/lead-generate/route.ts`     | Extracted inline DB logic; route 283→136 lines | Make lead creation reusable    |
| `src/actions/lead/createLeadFromForm.ts` | Now calls createLead directly                  | Eliminate HTTP self-proxy      |

### Migrations

- `add_copilot_and_audit_log` — non-destructive; additive only

### Latent bugs fixed (pre-existing)

1. Infobip CRM-mode parameter bug (silent, unused path on this platform)
2. CRM-mode automation token bug (silent 401, no production usage)

### Tests performed

- ✓ yarn build clean
- ✓ Thunderbolt Create Lead form works
- ✓ External webhook /api/lead-generate creates correct data
- ✓ Side-by-side comparison confirmed behavioral equivalence

### Coordination flags for dev team

- `ai_personalities.human_handoff_message` column exists in Prisma but not in local dev DB — verify production has it
- `react-easy-crop` is in `package.json` (line 128) and `ImageCropModal.tsx` imports it — this is a pre-existing dep, not related to our changes (earlier note incorrectly said it was missing)
- dev company "THC Local" zapierToken was exposed during testing — rotate when convenient
