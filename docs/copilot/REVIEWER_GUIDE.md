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

## Latent bugs fixed (pre-existing, incidental to refactor)

1. Infobip CRM-mode parameter bug
2. CRM-mode automation token sent as wrong format (silent 401s)
3. **`editAppointment.ts` missing `columnId` on draft estimate creation (Phase 0.5):**
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

## Architecture decision needed before Phase 3

**This is the single biggest open question. Phase 3 (write tools) is blocked on the team's answer.**

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
