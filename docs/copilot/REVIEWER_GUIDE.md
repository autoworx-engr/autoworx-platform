# AI Copilot — Reviewer Guide

For the AutoWorx dev team. Read top-to-bottom before reviewing the PR.

---

## TL;DR

Phases 0a–2: Adds an AI Copilot to AutoWorx — a sliding panel in the dashboard header (gated on `User.hasCopilot`) that streams chat responses via SSE, persists conversation history, generates cross-session memory summaries, and can look up live shop data (revenue, payments, clients, vehicles, inventory, estimates, appointments, tasks) using 8 read-only tools backed by the Anthropic API.

---

## What this feature does

- **Chat panel**: Bot icon in top navbar opens a `<Sheet>` slide-over. Users can send messages, see streaming responses token-by-token, and switch between past sessions.
- **Session memory**: Each session is summarized on close (Haiku 4.5, 200 tokens). Last 5 summaries are injected into the system prompt of the next session.
- **8 read-only tools (Phase 2)**: The AI can call tools to fetch live data — revenue summaries, payment breakdowns, client/vehicle lookup, inventory search, estimate details, appointments, and tasks. Tool calls are permission-checked, Zod-validated, audited, and shown as animated pills in the UI while in progress.
- **Security**: `companyId` always from session. AI-provided IDs are ignored. Tool results treated as data, not instructions (anti-prompt-injection rule in system prompt).
- **Cost controls**: Prompt caching (90% discount on cached tokens), `max_tokens: 1024`, Haiku for summarization.

---

## Scope boundaries — NOT in this PR

- Mobile integration
- Billing/seat licensing (gated only on User.hasCopilot for now)
- Cross-conversation embedding-based RAG
- Voice input
- Audit log viewer UI
- Cost tracking dashboard

---

## Risk assessment

### Files modified that touch existing functionality

| File                                                                                | Risk                                                                            | Mitigation                                                                                                                                     |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/lead-generate/route.ts`                                                | **HIGH** — called by every customer's external website contact form via webhook | Behavioral equivalence verified via curl regression test; 283→136 lines but identical output                                                   |
| `src/actions/lead/createLeadFromForm.ts`                                            | **MEDIUM** — powers the thunderbolt "Add Lead" form in the header               | Manually tested via UI; now calls `createLead` directly instead of HTTP self-proxy                                                             |
| `src/actions/appointment/addAppointment.ts`                                         | **MEDIUM** — used by calendar and client panel appointment creation             | Inline draft-estimate logic replaced with `createDraftEstimate` call; behavior preserved + one pre-existing bug fixed                          |
| `src/actions/appointment/editAppointment.ts`                                        | **MEDIUM** — used when editing existing appointments                            | Same refactor; fixes pre-existing bug where edited estimates had no `columnId` (were pipeline-invisible)                                       |
| `src/app/(dashboard)/dashboard/pipeline/sales/pipeline/_components/LeadActions.tsx` | **LOW** — pipeline card button component                                        | Only change: removed stale `createDraftEstimate` import (no longer used by this component)                                                     |
| `src/components/TopNavbarIcons.tsx`                                                 | **LOW** — adds one component between existing icons                             | Adds `<CopilotIcon />` between BugReport and NotificationsPopover. `CopilotIcon` is gated on `hasCopilot`, invisible to users without the flag |
| `src/authOptions.ts`                                                                | **LOW** — JWT token refresh path only                                           | Adds `hasCopilot` to DB select + token + session. No behavior change for existing auth; only adds a field                                      |
| `prisma/schema.prisma`                                                              | **LOW** — additive only                                                         | Non-destructive migration; new tables + one boolean column (default false) on User                                                             |

### Files added (isolated, low review burden)

**Phase 2 — tools (all new, no existing code touched):**

| File                                               | Notes                                                        |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `src/lib/copilot/tools/registry.ts`                | Pure in-memory Map. No side effects.                         |
| `src/lib/copilot/tools/dispatcher.ts`              | Calls canUserDo + writeAuditLog — both never-throw wrappers. |
| `src/lib/copilot/tools/index.ts`                   | Barrel import only.                                          |
| `src/lib/copilot/tools/handlers/get*.ts` (8 files) | Read-only DB queries scoped to companyId.                    |
| `src/components/copilot/CopilotToolPills.tsx`      | Presentational only — pure React, no data fetching.          |

**Phases 0b–1 — copilot infrastructure (all new):** See FILE_MAP.md for the full list.

---

## Bugs introduced by Phase 0a refactor and fixed in Phase 2.1 (coordination catch)

Caught by coordination with @AbuBokorprog who did a parallel refactor of /api/lead-generate on origin/development.

1. **Missing systemCall: true** on Twilio/Infobip calls inside createLeadRecord. AI opening SMS would have silently failed to send for webhook-generated leads.
2. **CRM zapierToken branch dropped** for automation triggers. External website leads (CRM mode) would have lost automation triggers.

These slipped past Phase 0a smoke testing due to local dev environment limitations (no CRM-enabled company in dev DB; ai_personalities schema drift masked the systemCall issue with a different failure). Caught before merge by parallel-refactor coordination.

The Phase 0a "latent bug fixes" section below previously credited us with these fixes — that credit was incorrect; we actually re-introduced them. Phase 2.1 restores correct behavior.

---

## Latent bugs fixed (pre-existing, incidental to refactor)

1. **`editAppointment.ts` missing `columnId` on draft estimate creation (Phase 0.5):**
   When a user edited an appointment to add or change a draft estimate, the server action
   created the `Invoice` row without a `columnId`. Since every shop pipeline column view
   filters by `columnId`, these estimates were invisible in the UI — users could not find
   or access them from the pipeline. Fixed by delegating to `createDraftEstimate`, which
   performs a proper `title: "Pending", type: "shop"` column lookup before creating the
   invoice. Pre-existing orphan Invoice rows (from before this fix) will remain in the DB
   with `columnId = null`; a one-time backfill migration could fix them but is out of scope.

See CHANGELOG.md for full details.

---

## Pre-existing issues flagged (separate team decisions needed)

These were noticed during the build and deliberately NOT changed. Each requires a team decision.

### 1. Automation trigger asymmetry — draft estimate creation

`createLeadDraftEstimate` (pipeline card button) does **NOT** call `updateInvoiceAutomationTrigger`. `createDraftEstimate` (client panel, appointments) **DOES**.

Automation rules on estimate creation will fire for client-panel flows but NOT pipeline card clicks. One path is wrong. Team should confirm canonical behavior and align the other.

### 2. Non-transactional appointment + invoice creation in `addAppointment.ts`

Appointment is committed to DB first, then `createDraftEstimate` runs as a separate operation. If the estimate creation fails (e.g., Pending column not found), the appointment record has a non-null `draftEstimate` pointing to an invoice that was never created. Fix requires wrapping in a transaction or adding a reconciliation read. Out of scope for this PR.

### 3. `ai_personalities.human_handoff_message` column drift

Field exists in `prisma/schema.prisma` but was absent from local dev DB during testing. Production DB may or may not have it. Should be verified before merging.

### 4. `Task.completed` field doesn't exist

The `get_tasks_for_user` copilot tool uses `date < now` as a proxy for task completion. If the team wants accurate completion tracking via the copilot, a `completed: Boolean` field needs to be added to the `Task` model (schema change + migration).

### 5. `Priority` enum missing `Urgent`

The TOOL_REGISTRY.md spec called for tasks to have `Low | Medium | High | Urgent` priority. The Prisma schema only has `Low | Medium | High`. The copilot tool returns actual enum values. Team should decide whether to add `Urgent` to the schema.

### 6. `Task` API routes have no JWT Bearer auth (future security pass needed)

`src/app/api/task/route.ts` (POST) and `src/app/api/task/[id]/route.ts` (PATCH) read `companyId` directly from the request body without any token verification. Any caller that can reach these endpoints can pass an arbitrary `companyId` and write tasks for another company. This was pre-existing before this PR and is **not introduced by the copilot feature**.

Phase 3 write tools will call these routes from server-side copilot code only (never client-exposed), which limits the immediate blast radius. However, a team security pass should add JWT Bearer verification and cross-check the body `companyId` against the token claim — the same pattern used by `src/app/api/estimate/[companyId]/route.ts`. **Do not fix as part of this PR; flag for a dedicated security pass.**

---

## How to test locally

### Prerequisites

- Node 20+, `yarn`
- PostgreSQL running locally (matching the dev database)
- An Anthropic API key — ask Taiseer for the AWX shared dev key, or create a personal key at console.anthropic.com

### Setup

```bash
git checkout taiseer/ai-copilot
yarn install
cp .env.example .env.local   # then add real values
```

Add to `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Run the copilot migration (if not already applied):

```bash
yarn prisma migrate deploy
```

Enable copilot access for your test user (Prisma Studio or psql):

```sql
UPDATE "User" SET "hasCopilot" = true WHERE email = 'your-test@email.com';
```

### Starting the app

```bash
yarn dev
```

**Important:** Do a full logout → login after enabling `hasCopilot`. The JWT refresh path populates the flag; an existing session won't see the new value until the token rotates.

### What to verify

1. **Bot icon appears** in top navbar (between Bug Report and Notifications icons)
2. **Panel opens** on click — shows empty state "Ask me anything about AutoWorx"
3. **Basic chat** — ask "What can you help me with?" — should get a streaming response
4. **Streaming** — tokens appear character-by-character (not all at once)
5. **Read tool** — ask "What's my revenue for this month?" — should see a blue "Looking up Revenue summary" pill while the tool runs, then a revenue answer
6. **Client lookup** — ask "Do you have a client named Smith?" — should call `get_client_by_name` and return matches
7. **Multi-tool chain** — ask "Show me vehicles for client [ID]" — should chain `get_client_by_name` → `get_vehicle_by_client`
8. **Session persistence** — close panel, reopen, click History icon — prior session should appear
9. **Session memory** — start a new session, send a message — prior session summary should influence the system context (check server console for `[copilot] tokens`)
10. **Rate limit** — send 60 messages rapidly — should see soft warning at 60, hard 429 at 120
11. **AuditLog** — Prisma Studio → AuditLog — entries should appear with valid `latencyMs` and `copilotSessionId`
12. **Cache hits** — server console: `cached:N` should be > 0 after the first message in a session

### Server console signals

```
[copilot] iter:1 in:X out:Y cached:Z cacheWrite:W   ← token usage per tool loop iteration
[copilot] stream error: ...                           ← only appears on actual errors
```

---

## Phase 3b.4 — Tool execution discipline

During smoke testing, the copilot was observed saying "task created" and "tag added to lead" without actually calling the corresponding write tools. Audit log + DB inspection confirmed the writes never happened — pure overclaim.

**Test 4e**: zero `task.create` audit entries, zero Task rows. The model composed a success reply without a tool call.

**Test 4j**: `create_tag` was called and wrote to DB; `add_lead_tag` was never called. No LeadTags row. The model treated tag creation as completing a tag-application request.

Fix: three system prompt rules enforcing that (1) success language requires actual tool invocation in the same turn, (2) multi-step chains must complete all steps before claiming done, and (3) final messages must reflect actual tool returns. Explicit step-by-step chains provided for tag application and other multi-tool flows.

Limitation noted: prompt-based fixes for AI overclaiming are mitigation, not elimination. Flagged for Phase 5+ structural enforcement review if it persists in production.

---

## Phase 3b.3 — Lead update removed; tag management added; client search fixed

### Product decision

Owner (Taiseer) decided the copilot does NOT update leads. Lead data integrity (pipeline column, creation date, source attribution) is preserved by keeping edits a deliberate UI action. When the user asks to edit lead fields, the copilot responds with a fixed redirect message and does nothing else.

Tag management on leads IS allowed because tagging is operational organization, not content editing.

### What was removed

- `update_lead` tool — file deleted, barrel import removed. The `/api/lead/company/[companyId]/[id]` PUT route remains (mobile/future use) but is no longer called by the copilot.

### What was added

| Tool              | Permission    | Notes                                                                    |
| ----------------- | ------------- | ------------------------------------------------------------------------ |
| `get_lead_tags`   | `lead.read`   | Lists all company tags; no mutation                                      |
| `add_lead_tag`    | `lead.update` | Verifies lead + tag ownership before join; idempotent                    |
| `remove_lead_tag` | `lead.update` | Verifies ownership; idempotent                                           |
| `create_tag`      | `lead.update` | Case-insensitive duplicate guard; defaults to SALES type; default colors |

All write tools follow the existing restate-and-confirm pattern.

### What was fixed

- **`get_client_by_name` full-name search** — split-and-AND replaces single-column `contains`. "Jane Phase3bTest" now matches firstName="Jane" AND lastName="Phase3bTest".
- **`get_client_by_name` leads inline** — each returned client now includes its originating Lead (id, vehicleInfo, services). AI can obtain a leadId in one call without a separate lookup tool.

### What to review

1. **New tool files** — all in `src/lib/copilot/tools/handlers/`. Each follows the established pattern: Zod schema, `execute(input, ctx)`, `registerTool(...)`. No new routes or server actions.
2. **Multi-tenant isolation** — `addLeadTagTool` and `removeLeadTagTool` verify both `leadId` and `tagId` against `companyId` before any write. The `leadTags` join-table create/delete is unscoped by design (IDs already verified upstream).
3. **`createTagTool` color defaults** — Tag model requires `textColor` and `bgColor` (both non-nullable strings). Defaults: `#374151` / `#F3F4F6`. User can override via input.
4. **System prompt** — decline message for lead edits, tag fuzzy-match workflow, multi-lead disambiguation by vehicle, updated tool lists.

---

## Phase 3 — Write tools via API wrappers

### What changed

The team decided (Tanvir, AbuBokorprog) that all copilot write operations go through API routes for stable contracts and mobile reuse. Phase 3a builds the foundation: a unified Bearer JWT auth helper and an internal API client so the copilot can mint JWTs and call its own routes server-to-server.

### What to review

1. **`src/lib/mobileAuth.ts`** — ported from secure-estimate-routes branch. Same content. Once both branches merge to development, this becomes one file across both.

2. **`src/lib/copilot/internalApiClient.ts`** — the copilot's HTTP client to its own API. Verify:
   - JWT minting loads a real DB `User` record (not synthesized) — payload matches what routes expect
   - Token expires in 1 hour via `generateAccessToken`
   - Internal call uses absolute URL (`NEXTAUTH_URL` env var, falls back to `localhost:3000`)
   - Error handling returns structured `{ ok, error, status }` result — never throws

3. **`src/app/api/lead/company/[companyId]/route.ts`** — the template route for Phase 3. All subsequent Phase 3 routes mirror this shape. Verify:
   - Bearer JWT auth via `getCompanyIdFromBearer` (returns null → 401)
   - URL `companyId` cross-checked against JWT claim → 403 on mismatch (multi-tenant isolation)
   - Zod schema validates body → 400 with `field` name on failure
   - Business logic calls `createLeadRecord` (pure function, no session needed)
   - Audit log fires on both success AND failure paths
   - Response envelope: `{ success, message, data?, field? }`

### Middleware interaction

`proxy.ts` middleware runs before all `/api/*` routes (except `PUBLIC_API_ROUTES`). It verifies the Bearer JWT — invalid tokens are rejected at the middleware level (HTTP 200 with embedded `{status: 401}` in body — pre-existing convention). Valid tokens pass through to the route, where `getCompanyIdFromBearer` extracts the companyId claim and the route performs the URL vs JWT companyId cross-check.

---

## Phase 3b — Write tools: leads, appointments, tasks

### What changed

Six reversible-write copilot tools backed by authenticated API routes:

| Tool                 | Route                                             |
| -------------------- | ------------------------------------------------- |
| `create_lead`        | POST `/api/lead/company/{companyId}`              |
| `update_lead`        | PUT `/api/lead/company/{companyId}/{leadId}`      |
| `create_appointment` | POST `/api/appointment/company/{companyId}`       |
| `update_appointment` | PATCH `/api/appointment/company/{companyId}/{id}` |
| `create_task`        | POST `/api/task/company/{companyId}`              |
| `update_task`        | PUT `/api/task/company/{companyId}/{id}`          |

All routes follow the Phase 3a template: Bearer JWT → companyId cross-check → Zod validate → server action (or DB-direct for task create) → audit log on all paths.

### What to review

1. **Multi-tenant isolation** — every `db.*` query in the new server actions (`updateAppointment.ts`, `updateTask.ts`, `updateLead.ts`) scopes by `companyId` in BOTH the ownership `findFirst` AND the `update` WHERE clause. Cross-company writes are rejected at two layers.

2. **`updateAppointment.ts` `as any` cast** — required because spreading `rest` (which includes nullable FK fields like `clientId: number | null | undefined`) trips Prisma's union type checker. Zod validates the shape upstream; the cast is safe.

3. **Task create is DB-direct** — `createTask` server action is coupled to Google Calendar + notifications; rather than adding force params, Phase 3b uses a DB-direct insert in the task POST route (same pattern as estimate POST).

4. **`assignedUsers` defaults** — `createAppointmentTool` and `createTaskTool` default `assignedUsers` to `[ctx.userId]` when empty, matching the web UI behavior.

---

## Phase 3b.2 — UX hardening: restate-and-confirm

### What changed

`src/lib/copilot/systemPrompt.ts` — the 4-line "Write tool guidance" section was replaced with a 9-step enforced "Workflow for write operations" that applies to all 6 reversible-write tools.

### What to review

1. **No code changes** — this is a prompt-only change. No routes, actions, or tool handlers were modified.

2. **The new workflow gate** — before any write tool fires, the model must:
   - Restate intent as a structured summary with labelled fields
   - End with `Confirm? (yes / no / change [field])`
   - Wait for explicit confirmation before calling the tool

3. **Smoke test re-run needed** — test 4a (create lead, verify confirmation fires) should be re-run against this build. The prior run revealed the copilot skipping confirmation; this build enforces it.

---

## Architecture decision needed before Phase 3

**RESOLVED — team chose Path 1 (thin API wrappers) with JWT Bearer auth. See PHASE_3_PLAN.md for full decision record.**

### Background

Phase 2 tools query the DB directly (read-only, safe). Phase 3 write tools (create_lead, create_appointment, create_task, create_draft_estimate) need to call existing server actions. Two problems:

1. **Server actions are "use server" and use `getServerSession()`** — they're designed for browser-to-server calls, not internal server-to-server calls. The copilot route (already server-side) can call them but gets a null session, because `getServerSession()` needs the HTTP request context.

2. **Server action signatures weren't designed for copilot use** — they often take `FormData` or have implicit session assumptions that don't work when called from a route handler.

### The three paths forward

**Option A — Pass `forceCompanyId` / `forceUserId` through action signatures**

- Already started in `addAppointment.ts` (PR includes `forceCompanyId`, `forceUserId` params)
- Requires updating each action signature to accept override params when called from copilot context
- Medium refactor, contained to each action file

**Option B — Extract pure DB functions (the `createLeadRecord` pattern)**

- What we did in Phase 0a: extract `createLeadRecord.ts` as a pure async function, then `createLead.ts` wraps it with session auth
- Copilot calls the pure function directly, bypassing the server action
- Cleanest separation, most work, but pays dividends long-term

**Option C — Thin internal API routes for each write operation**

- Create `POST /api/copilot/internal/create-lead` etc. that the chat route calls directly
- Avoids touching server actions at all
- Most explicit about the copilot's write surface

The team's choice here determines how Phase 3 is structured. **Decision needed before Phase 3 starts.**

---

## Open questions deferred to team

1. **Phase 3 write architecture** (see "Architecture decision" section above — blocks Phase 3)

2. **Automation trigger asymmetry** — `createLeadDraftEstimate` does NOT trigger `updateInvoiceAutomationTrigger`; `createDraftEstimate` does. Which is canonical? (See pre-existing issues section)

3. **Non-transactional appointment + invoice** — if `createDraftEstimate` fails after the appointment is created, you get a dangling reference. Accept this or wrap in a transaction?

4. **`Task.completed` field** — the Task model has no boolean `completed` field; the copilot `get_tasks_for_user` tool uses `date < now` as a proxy. Should we add the field to the schema (and a migration), or live with the heuristic?

5. **Priority enum missing `Urgent`** — TOOL_REGISTRY.md spec called for `Urgent` in task priority. The Prisma enum only has `Low | Medium | High`. Add it, or change the tool spec?

6. **`hasCopilot` seat management** — currently set manually via DB. Phase 5 will add billing/seat licensing. In the interim, who owns flipping the flag and what's the process?

7. **`ai_personalities.human_handoff_message` column** — exists in `schema.prisma` but reportedly absent from some dev DBs. Confirm it exists in production before merging.

8. **Task API route auth gap** — `/api/task/route.ts` POST and `/api/task/[id]/route.ts` PATCH have no JWT Bearer auth; `companyId` accepted from body unverified (see Pre-existing issues §6). Needs a dedicated security pass — not in scope for this PR.

---

## Cost optimization (active in current build)

- **Prompt caching on system prompt block** — `cache_control: { type: "ephemeral" }` applied to the system prompt content block. Anthropic charges 90% less for cached input tokens. The cache window is 5 minutes; the system prompt is stable across turns, so multi-turn conversations benefit fully. First message in a session writes the cache; all subsequent messages read it.
- **max_tokens capped at 1024** for chat responses — limits worst-case output cost. Normal conversational replies are well under this cap. Users asking for very long outputs get a clean truncation.
- **Haiku 4.5 for session summarization** — `claude-haiku-4-5-20251001` is used in `generateSessionSummary.ts` (200 max tokens). Approximately 1/3 the cost of Sonnet for these short, structured tasks.
- **Cache token visibility** — `cachedTokens` is persisted on every `CopilotMessage` assistant row. Query Prisma Studio → CopilotMessage → `cachedTokens` to confirm cache is hitting. Dev console also logs: `[copilot] tokens — in:X out:Y cached:Z cacheWrite:W`.

Future optimizations not yet active:

- Haiku 4.5 routing for simple read-only tool calls (Phase 3 candidate — currently all tool-use turns use Sonnet)
- Conversation context trimming for sessions > 20 messages (Phase 6)
- Per-seat usage caps and billing integration (Phase 5)
