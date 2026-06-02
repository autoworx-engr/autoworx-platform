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

## Phase 3c.5 — Inventory-aware materials

When a user names a material for an estimate or add-materials flow, the copilot now searches the shop's inventory before asking for a sell price.

**`getInventoryItemByName.ts`** — two changes:

- Search upgraded from single `contains` to word-by-word AND query. Each keyword must appear independently (any order) in the product name. Pattern mirrors `getClientByName`. "3M vinyl" now finds "3M High Gloss Black Vinyl"; "ceramic kit" finds "Ceramic Coating Kit".
- `price` renamed to `costPrice` in the return shape. This is an important semantic clarification: `InventoryProduct.price` is the shop's acquisition cost (confirmed by three sources: materials/route.ts, estimate/create/page.tsx, virtual-shop page). It is NOT the customer sell price. The `Material` model has separate `cost` and `sell` fields; `InventoryProduct.price` maps to `cost`.

System prompt adds a full inventory-aware flow: search → present candidates with stock/cost/unit → confirm match → ask sell price (dollar or % markup) → soft stock warning if qty > stock. Free-text fallback when no match. Free-text pass-through when user provides price directly.

No new tools, no new routes, no DB migrations.

---

## Phase 3c.4 — Shop-supplies and tax toggles on create_estimate

Completes the original `create_estimate` spec. Both shop supplies (serviceFee) and tax can be toggled off per estimate without changing company defaults.

Two optional booleans added to the tool input: `applyShopSupplies` and `applyTax`. Semantics: omitted or `true` applies the company rate; `false` stores the effective rate as 0 for that estimate only. The stored `Invoice.tax` / `Invoice.serviceFee` are therefore 0 (not the company rate) when toggled off, exactly matching the UI's toggle behavior.

The system prompt guides the copilot to present toggles at restate — not during gather — with dollar amounts computed from the company rates injected into the user-context line (`Company tax rate: X%. Company shop-supplies rate: Y%.`). Tax line is omitted entirely for labor-only estimates. Pre-stated preferences are honored without re-asking.

Math layer unchanged. `taxRateToUse` and `serviceFeeRateToUse` variables replace the flat rate lookups in `execute()`.

No DB migrations.

---

## Phase 3c.3 — Materials on estimates + add-to-existing + line-item reads

**`create_estimate`** extended with optional `materials[]` per service (name, quantity, sellPrice, optional costPrice/discount/productId). Tax math now live: `taxAdd = Σ(sell × qty) × (taxRate/100)`. `material.discount` is a dollar amount flowing into invoice-level discount (not subtracted from tax base). Shared `estimateMath.ts` helper extracted for `round2` and `MaterialInput`.

**`add_materials_to_estimate`** — new tool. Direct DB write path (PATCH route doesn't support items). Transaction: new `InvoiceItem` + `Material` rows + `Invoice` totals update. Refuses if `type !== "Estimate"`. New `estimate.add_materials` action in `CopilotAction` + `PERMISSION_MAP`. Multi-tenant: `InvoiceItem` scoped via `invoiceId → Invoice.companyId`; `Material` has explicit `companyId: ctx.companyId`.

**`get_estimate_by_number`** — now returns `invoiceItems` with nested `labor` and `materials`. Copilot can answer "what's on this estimate?" directly.

No DB migrations.

---

## Phase 3c.2 — create_estimate (services + labor)

New `create_estimate` write tool. Creates a draft estimate (type="Estimate") for a client with one or more services and labor line items.

**Total computation lives in `execute()`, not in the route.** Pre-build recon confirmed `POST /api/estimate/[companyId]/` stores caller-supplied totals verbatim — it computes only `profit`. The tool's `execute()` therefore owns all money math:

- `subtotal = Σ (laborHours × laborRate)` across all services
- `taxAdd = 0` — tax applies to materials only; no materials in this phase
- `serviceFeeRate` and `taxRate` fetched from `Company` using `ctx.companyId` — never from AI input
- `suppliesFeeAdd = subtotal × (serviceFeeRate / 100)`
- `grandTotal = subtotal + suppliesFeeAdd`
- `Invoice.tax` and `Invoice.serviceFee` are stored as **percentage rates** (not dollar amounts), matching the app's own BillSummary behavior

**serviceDesc free-text**: The route creates Labor records inline from the item payload. No pre-existing Service row is required — the AI passes the user's plain-language service name as `serviceDesc`, which the route stores on `InvoiceItem.serviceDesc`.

**columnId omitted**: The route auto-resolves the "Pending" column when `columnId` is absent.

**Permission**: `estimate.create` (already in `CopilotAction` enum and `PERMISSION_MAP`, gated on `estimatesInvoices`).

**System prompt additions**: duplicate soft guard (check `get_estimates_for_client` before creating), estimates-only guard (copilot cannot create invoices — redirects to estimate workflow), and updated write-discipline rules.

Services + labor only. Materials → 3c.3. Supply/tax toggles → 3c.4. No DB migrations.

---

## Phase 3c.1 — Estimate read tools completed

Two tools read estimates and invoices:

- **`get_estimates_for_client`** — lists up to 20 most recent estimates/invoices for a given client (by `clientId`). Returns `id`, `type`, `status`, `grandTotal`, `vehicleId`, `vehicleInfo`, `publicLink`, `editLink`, and `createdAt`. Requires `get_client_by_name` first to resolve the `clientId`.
- **`get_estimate_by_number`** — fetches one specific estimate by its `id`. Returns full line-item detail.

Both are gated on the `estimate.read` permission (`estimatesInvoices` AWX field). `companyId` is always from session — the AI cannot read estimates for another company.

Every estimate and invoice result includes a `publicLink` (client-facing digital link: `${APP_URL}/public-invoice/${id}`) and an `editLink` (internal route: `/dashboard/estimate/edit/${id}`). The system prompt instructs the copilot to include `publicLink` whenever presenting estimates to users. No DB changes in this phase.

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

### Phase 3b.7 — Appointment confirmation messages

The copilot can now send appointment confirmation messages. After gathering appointment details it asks the user whether to send a confirmation and, if yes, which template (via the new `get_confirmation_templates` read tool). The confirmation fields were already supported by `addAppointment` and the appointment route — only the copilot tool, a new read tool, and the system prompt changed. Reminders were already working and are untouched.

---

### Phase 3b.6 — Lead creation refinements

create_lead now requires at least one contact method (phone or email), enforced by a Zod refinement in the API route — applies to mobile callers too, not just the copilot. The system prompt also now instructs the copilot to gather all required fields in one message instead of one at a time.

---

### Phase 3b.5 — Duplicate lead fix

The copilot was observed creating duplicate leads (up to 3) when scheduling an appointment for a freshly-created client. Root cause was AI reasoning — it called create_lead to "obtain" client info instead of get_client_by_name. The appointment code itself was clean.

Fixed in three layers: tool description rewrites (create_appointment + create_lead), a hardened system prompt rule with a worked anti-pattern example, and a code-level idempotency guard on the lead creation route (rejects near-identical leads within 2 minutes, HTTP 409).

The idempotency guard is a deliberate safety net — prompt fixes reduce but don't guarantee correct AI behavior, so the route enforces it structurally.

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

---

### Phase 3b.8 — Client + vehicle creation

Two new API routes (client create, vehicle create) wrapping existing server actions (`addCustomer`, `addVehicle`) per the Path 1 pattern established in Phase 3. Two new copilot tools (`create_client`, `create_vehicle_for_client`).

**Fleet is deliberately excluded:** a fleet client needs a companion `Fleet` record created atomically (`fleetName` + `contactName`). The existing `PATCH /api/client/client-details/[id]` can toggle `isFleet` WITHOUT creating that record — a data-integrity trap. `create_client` has no `isFleet` field at all; fleet requests are redirected to the main app's Fleet page with an explanatory message.

**Multi-tenant safety on the vehicle route:** keyed by `clientId` in the URL (not `companyId`). The handler first verifies the client belongs to the JWT's company (`db.client.findFirst({ where: { id, companyId } })`). A client from another company returns 404 — same as if the record didn't exist.

**Idempotency:** `addVehicle` already deduplicates on (clientId + year + make + model + companyId) and returns the existing record rather than an error. This means the copilot can safely retry without creating duplicates.

**Permissions:** `client.create` and `vehicle.create` both gate on `salesPipeline`, the same permission as `lead.create`. All users who can create leads can create clients and vehicles.

No DB migrations. No changes to `addCustomer` or `addVehicle`.

---

### Phase 3b.9 — Client phone country-code normalization

Copilot-created clients were storing bare 10-digit phone numbers while UI-created clients store `+1XXXXXXXXXX`. The `create_client` route now prepends `+1` for US numbers (only when there's no existing `"+"` prefix and the country is US or unspecified), so copilot- and UI-created clients are consistent. The logic lives in `ensureCountryCode.ts` (sibling to the route) to keep the route file within the line-count limit. Historical rows are not backfilled.

---

### Phase 3b.10 — Client disambiguation by phone/vehicle

Previously, `get_client_by_name` returned multiple matches but gave the model no guidance on how to handle ambiguity, and returned the full mobile number for each match. In shops with multiple clients sharing a name, the copilot would silently pick the first result and proceed — risking writes (appointments, tags, tasks) against the wrong client.

**Tool change:** `get_client_by_name` now returns a top-level `matchCount` and, for each match, includes `phoneLast4` (last 4 digits of mobile only — full numbers are never surfaced), `vehicles` (array of readable strings from the client's actual Vehicle records, not just the lead's vehicleInfo), and a composite `name` field. Zero-match now returns `{ matchCount: 0, clients: [] }` (success) rather than `ok: false`, so the model can offer to create a new client rather than treating it as an error.

**Prompt change:** A new "Identifying the right client when names collide" section enforces the disambiguation flow: 1 match → proceed; >1 → list candidates by phone last-4 + vehicle and ask which; 0 → offer to create. The model must never perform write operations until a specific client is confirmed.

No DB migrations. Additive change to tool return shape (no existing callers parse it in TypeScript).
