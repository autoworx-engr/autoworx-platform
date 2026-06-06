# AI Copilot — Reviewer Guide

For the AutoWorx dev team. Read top-to-bottom before reviewing the PR.

---

## TL;DR

The AI Copilot is an in-app chat assistant for AutoWorx auto specialty shops. It handles client intake, estimates, inventory management, work orders, team assignment, and business reporting — all through natural-language conversation, streamed in real time.

**Surface area:**

- **41 tool handlers** (11 read/search, 17 write, 13 analytics/reporting)
- **17 Bearer-safe API routes** (new or modified)
- **System prompt** (~450 lines) — rules, per-tool guidance, write workflow
- **9 UI components** — chat panel, streaming, tool pills, markdown rendering
- **1 DB migration** — additive only, safe to run on live DB

**Gating:** All copilot UI is behind `User.hasCopilot = false` by default. No user sees anything without a manual DB flip.

---

## What was built, by phase

### Phases 0a–2 — Infrastructure and read tools

Chat panel (SSE streaming), session persistence, cross-session memory summarization (Haiku), prompt caching, 8 initial read-only tools, audit logging, rate limiting. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full technical design.

### Phase 3b — Core CRM write tools

Leads, appointments (with confirmation email templates), tasks, clients (with phone-country-code normalization), vehicles, tags. Also includes:

- **Phone disambiguation:** `get_client_by_name` returns `phoneLast4` and vehicle list; the model must confirm before writing when multiple clients match.
- **Idempotency guard:** lead creation route rejects near-duplicate leads within 2 minutes (HTTP 409) as a code-level safety net on top of prompt rules.
- **Client duplicate-phone recovery:** `create_client` handles 409 gracefully by looking up the existing client and returning it as a soft success rather than an error.
- **Appointment confirmation messages:** `get_confirmation_templates` tool added; copilot can send confirmation after scheduling.

### Phase 3c — Estimates and inventory

| Phase | What shipped                                                                                                                   |
| ----- | ------------------------------------------------------------------------------------------------------------------------------ |
| 3c.1  | Estimate read tools: list for client, detail by ID with InvoiceItem IDs, digital/edit links                                    |
| 3c.2  | `create_estimate` — services + labor; all money math server-side                                                               |
| 3c.3  | `add_materials_to_estimate` — attaches to existing service's InvoiceItem (NOT a new line item); totals recomputed from scratch |
| 3c.4  | `applyShopSupplies` + `applyTax` toggles on create_estimate; company rates included in system prompt user context              |
| 3c.5  | Inventory-aware materials: word-by-word fuzzy search, cost vs sell distinction, soft stock warning                             |
| 3c.6  | Inventory create + replenish (weighted average cost); vendor lookup + create                                                   |

**Money math (all server-side, never AI-supplied):**

```
subtotal = Σ(labor.charge × labor.hours) + Σ(material.sell × quantity)
taxAdd = materialSubtotal × (taxRate / 100)
suppliesFeeAdd = subtotal × (serviceFeeRate / 100)
grandTotal = (subtotal − discount) + taxAdd + suppliesFeeAdd
```

`tax` and `serviceFee` stored as **rates (percentages)**, not dollar amounts. The estimate route stores caller-supplied totals; the math is done in `estimateMath.ts` helpers.

**`add_materials_to_estimate` — important behavior change from initial design:**
Previously created a new materials-only `InvoiceItem`. Now requires a `serviceItemId` (InvoiceItem.id from `get_estimate_by_number`) and attaches materials to the existing service's item. Corrected because materials in the existing platform UI always belong to a service line, not standalone items.

### Phase 3d — Work orders and technician assignment

`create_work_order` converts an existing invoice to a work order via PATCH (`isWorkOrder=true`, moves to "In Progress" column resolved at runtime by title — never hardcoded). Estimates cannot become work orders directly.

`assign_technician` does per-service assignment (one Technician record per InvoiceItem). The `Technician.serviceId` field is `NOT NULL` in the schema, but copilot-created `InvoiceItem` rows have `serviceId = null`. The route resolves this in a `$transaction`:

1. Case-insensitive match on `InvoiceItem.serviceDesc` against the `Service` catalog
2. If no match, auto-creates a Service record from the serviceDesc
3. Backfills `InvoiceItem.serviceId`
4. Creates the `Technician` record

**This means copilot usage will auto-populate the Service catalog from free-text service descriptions.** This is intentional — it's how the platform's Technician constraint gets satisfied without requiring a pre-populated catalog. Team should be aware; it may add entries to the Service table.

### Phase 3e–3g — Reporting (13 tools)

Each reporting tool uses the **same date field as the corresponding AutoWorx reporting page** — using `createdAt` instead would return wrong numbers. Critical date field mapping:

| Tool                      | Model                   | Date field                                             |
| ------------------------- | ----------------------- | ------------------------------------------------------ |
| `get_revenue_summary`     | Invoice                 | `deliveredAt`                                          |
| `get_payments_summary`    | Payment                 | `date`                                                 |
| `get_inventory_summary`   | InventoryProductHistory | `date`                                                 |
| `get_team_summary`        | Technician              | `dateClosed`                                           |
| `get_lead_summary`        | Lead                    | `createdAt` (counts) / `columnChangedAt` (conversions) |
| `get_work_order_summary`  | Invoice                 | `workOrderCreatedAt`                                   |
| `get_task_summary`        | Task                    | `date`                                                 |
| `get_appointment_summary` | Appointment             | `date`                                                 |
| `get_client_stats`        | Client                  | `createdAt` (new clients)                              |
| `get_profit_analysis`     | Invoice                 | `deliveredAt`                                          |
| `get_material_usage`      | Material                | `createdAt`                                            |
| `get_service_performance` | Invoice → InvoiceItem   | `deliveredAt`                                          |
| `get_clock_report`        | ClockInOut              | `clockIn`                                              |

**Revenue = delivered invoices only.** `get_revenue_summary` and `get_profit_analysis` filter by `column: { title: "Delivered" }`. An invoice that has not reached "Delivered" is not counted as revenue.

---

## High-risk areas for review

### Modified platform files (not copilot-only)

| File                                                         | Change                                                                                                                                                                                                                                   | Risk                                                                                                                               |
| ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/api/estimate/[companyId]/route.ts`                  | Added `customAlphabet("1234567890", 10)` ID generation before `invoice.create` — mirrors the estimate-create UI which uses numeric IDs. Previously this route fell back to cuid(), producing IDs inconsistent with UI-created estimates. | **LOW** — one-line behavioral change. All existing mobile/UI behavior unchanged; cuid format was already working but inconsistent. |
| `src/components/copilot/CopilotMessageCard.tsx`              | Assistant messages now rendered through `react-markdown` (new dependency).                                                                                                                                                               | **LOW** — purely presentational. No data fetching.                                                                                 |
| `src/actions/lead/createLeadFromForm.ts`                     | Refactored to call `createLead` directly instead of HTTP self-proxy.                                                                                                                                                                     | **LOW** — behavior equivalent; tested via UI.                                                                                      |
| `src/actions/appointment/addAppointment.ts`                  | Inline draft-estimate logic replaced with `createDraftEstimate` call; fixes pre-existing bug where edited appointments created `columnId = null` estimates (invisible in pipeline).                                                      | **MEDIUM** — fixes a pre-existing bug; same behavior preserved.                                                                    |
| `src/app/api/lead-generate/route.ts`                         | Refactored from 283 to 136 lines; behavioral equivalence verified via curl regression test.                                                                                                                                              | **HIGH** — called by every external website contact form webhook. Tested.                                                          |
| `prisma/migrations/20260515000000_add_messenger_columns.sql` | **AUTHORED BY THIS BRANCH** — bridges schema/DB divergence from a prior merged PR. Team should confirm this is the intended migration.                                                                                                   | **MEDIUM** — additive SQL; confirm it matches what PR #830 intended.                                                               |

### New dependencies

| Package             | Version   | Why                                                        |
| ------------------- | --------- | ---------------------------------------------------------- |
| `@anthropic-ai/sdk` | `^0.95.1` | Anthropic API client — all LLM calls                       |
| `react-markdown`    | `^10.1.0` | Renders assistant messages as markdown (bold, code, links) |

`nanoid` (`^5.0.6`) was already in `package.json` before this branch; the estimate route now uses it for numeric IDs.

### New `CopilotAction` enum values

Added to `src/lib/copilot/canUserDo.ts`:

```
estimate.create       gated on estimatesInvoices
estimate.add_materials gated on estimatesInvoices
estimate.read         gated on estimatesInvoices
invoice.read          gated on estimatesInvoices
inventory.create      gated on inventoryAll
inventory.update      gated on inventoryAll
inventory.read        gated on inventoryAll
vendor.create         gated on inventoryAll
team.read             open (all authenticated roles)
workorder.create      gated on estimatesInvoices
workorder.assign      gated on estimatesInvoices
vehicle.create        gated on salesPipeline
client.create         gated on salesPipeline
```

(Plus pre-existing: `lead.*`, `appointment.*`, `task.*`, `estimate.send`, `invoice.send`, `report.revenue.read`, `report.payments.read`, `client.read`, `vehicle.read`)

### New Bearer-safe API routes

Routes added or modified by this branch:

| Route                                             | Method   | Phase    | Calls                                                 |
| ------------------------------------------------- | -------- | -------- | ----------------------------------------------------- |
| `/api/lead/company/[companyId]/`                  | POST     | 3a       | `createLeadRecord`                                    |
| `/api/lead/company/[companyId]/[id]/`             | PATCH    | 3b       | column update                                         |
| `/api/pipeline/sales/leads/`                      | POST     | 3b       | create lead (pipeline path)                           |
| `/api/pipeline/sales/leads/[id]/column/`          | PATCH    | 3b       | move lead column                                      |
| `/api/appointment/company/[companyId]/`           | POST     | 3b       | `addAppointment`                                      |
| `/api/appointment/company/[companyId]/[id]/`      | PATCH    | 3b       | update appointment                                    |
| `/api/task/company/[companyId]/`                  | POST     | 3b       | create task (DB-direct)                               |
| `/api/task/company/[companyId]/[id]/`             | PATCH    | 3b       | update task                                           |
| `/api/client/company/[companyId]/`                | POST     | 3b.8     | `addCustomer` server action                           |
| `/api/vehicle/client/[clientId]/`                 | POST     | 3b.8     | `addVehicle` server action                            |
| `/api/invoice/company/[companyId]/`               | POST     | 3b       | create invoice (mobile)                               |
| `/api/estimate/[companyId]/`                      | POST+GET | 3c.2     | Create/list estimates — **modified existing**         |
| `/api/inventory/[companyId]/products/`            | POST     | 3c.6     | Create `InventoryProduct` + history in `$transaction` |
| `/api/inventory/[companyId]/replenish/`           | POST     | 3c.6     | Add stock + history, weighted average cost            |
| `/api/vendor/[companyId]/`                        | POST     | 3c.6 fix | Create `Vendor`                                       |
| `/api/work-order/[companyId]/[invoiceId]/`        | PATCH    | 3d       | Flip `isWorkOrder = true`                             |
| `/api/work-order/[companyId]/[invoiceId]/assign/` | POST     | 3d       | Create `Technician` record                            |

**Auth pattern on all routes:** `getCompanyIdFromBearer(req)` → 401 if null. URL `companyId` vs JWT `companyId` → 403 if mismatch. JWT value wins; URL is only for routing.

---

## Architecture overview

```
User message
    ↓
POST /api/copilot/chat  ← rate-limited, session-scoped
    ↓
Anthropic SDK (Sonnet 4.x, prompt cache on system prompt block)
    ↓
tool_use block in response?
    ↓
dispatcher.ts: canUserDo → Zod validation → execute() → writeAuditLog
    ↓
  read tools: direct Prisma query (companyId from ctx)
  write tools: callInternalApi → Bearer JWT → API route → DB
    ↓
tool result returned to Anthropic → next streaming chunk
    ↓
SSE stream → client
```

**Why Bearer JWT for write tools instead of direct Prisma?** The copilot is not a special case — it uses the same API surface as the mobile app. This means mobile clients, copilot, and future integrations share one tested, audited write path. The copilot mints a JWT via `generateAccessToken(user)` (short-lived), calls the route, and the route verifies it identically to a mobile call.

**Why direct Prisma for read tools?** Read tools have no side effects, are always scoped by `companyId` from the session (not from AI input), and benefit from being a simple Prisma call rather than an HTTP round-trip.

**Multi-tenant isolation:** Every read tool query includes `where: { companyId: ctx.companyId }`. Every write route cross-checks the URL `companyId` against the JWT claim. AI-supplied IDs for clients/vehicles/estimates are validated against the DB before any write proceeds (e.g., `createEstimateTool` verifies `clientId` belongs to `ctx.companyId` before calling the route).

---

## Known limitations

1. **Confirmation loop:** In long multi-action conversations, the model occasionally re-enters the gather phase instead of calling the tool after a "yes". Fresh sessions are reliable. This is a model reasoning limitation, partially mitigated by the write workflow rules in the system prompt.

2. **Context bleed:** In a single session, a new request may carry stale IDs from a prior completed workflow (e.g., a `clientId` from an earlier estimate flows into an unrelated new request). Mitigated by the "new request = fresh context" rule in the prompt, but not eliminated.

3. **Estimate→invoice conversion:** Not supported via copilot. `convertInvoice` uses `getServerSession` (cookie-based), not Bearer-safe.

4. **Work orders require existing invoices:** The copilot can create work orders only from existing invoices, not from scratch. Estimates must be converted to invoices in the main app first.

5. **`Task.completed` field does not exist:** The schema has no boolean `completed` field on `Task`. `get_tasks_for_user` uses `date < now` as a proxy for overdue, not completion.

6. **Task route auth gap (pre-existing):** `/api/task/route.ts` POST and `/api/task/[id]/route.ts` PATCH accept `companyId` from the request body without JWT verification. Pre-existing issue; copilot always calls these routes from server-side code with a valid JWT. A dedicated security pass should add Bearer verification to these routes.

7. **Service catalog auto-population:** Assigning a technician via the copilot may auto-create `Service` catalog entries from free-text `InvoiceItem.serviceDesc` values. Expected behavior — documented in Phase 3d above.

---

## Pre-existing issues flagged (team decisions needed)

1. **Automation trigger asymmetry** — `createLeadDraftEstimate` (pipeline card) does NOT call `updateInvoiceAutomationTrigger`; `createDraftEstimate` (client panel, appointments) DOES. One path is wrong.

2. **Non-transactional appointment + invoice** — if `createDraftEstimate` fails after the appointment is saved, the appointment row has a `draftEstimate` FK pointing to a non-existent invoice.

3. **`ai_personalities.human_handoff_message` column drift** — exists in `schema.prisma` but was absent from dev DB during testing. Verify it exists in production before merging.

4. **`Priority` enum missing `Urgent`** — Prisma schema has `Low | Medium | High`. The original TOOL_REGISTRY.md spec included `Urgent`. Tasks are being created without it.

---

## How to test locally

### Setup

```bash
git checkout taiseer/ai-copilot
yarn install
cp .env.example .env.local
# Add to .env.local:
# ANTHROPIC_API_KEY=sk-ant-...

yarn prisma migrate deploy
```

Enable copilot for your test user:

```sql
UPDATE "User" SET "hasCopilot" = true WHERE email = 'your-test@email.com';
```

**Full logout → login required** after flipping `hasCopilot` — the JWT refresh path reads the flag.

### Basic smoke test

1. **Bot icon** appears in navbar (between Bug Report and Notifications)
2. **Panel opens** — shows empty state
3. **Streaming** — ask "What can you help me with?" — tokens appear progressively
4. **Read tool** — ask "What's my revenue this month?" — blue pill appears, then revenue answer
5. **Write tool** — ask "Create an appointment for [client] on [date]" — copilot gathers, confirms, creates
6. **Session persistence** — close panel → reopen → History icon → prior session visible
7. **Memory** — new session → send a message → prior session context in system context (check server console for `[copilot] tokens`)

### Tool-specific tests

- **Revenue accuracy:** Compare copilot answer to `/dashboard/reporting/revenue` page for the same period
- **Client disambiguation:** Two clients with the same last name → copilot should ask which one
- **Inventory materials:** Create an estimate → name a material that's in inventory → copilot should search first
- **Work order:** Find an existing invoice → ask copilot to make it a work order → verify column change in pipeline

---

## How to extend the copilot

See [CLAUDE.md](../../CLAUDE.md) — "Copilot Development Conventions" section covers:

- Adding new tools (registerTool pattern)
- Adding new Bearer-safe routes (auth template)
- Adding new CopilotAction enum values
- Key files to read first

For the full tool inventory, see [TOOL_REGISTRY.md](TOOL_REGISTRY.md).
For the full file inventory, see [FILE_MAP.md](FILE_MAP.md).
